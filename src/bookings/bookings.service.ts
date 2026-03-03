import {
    Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateBookingDto) {
        const clinicId = dto.salonId;

        // 1. Validate clinic
        const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
        if (!clinic || !clinic.isActive) throw new NotFoundException('Không tìm thấy cơ sở');

        // 2. Find or create customer by phone
        let customer = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
        if (!customer) {
            customer = await this.prisma.user.create({
                data: {
                    phone: dto.phone,
                    name: dto.customerName || `KH ${dto.phone}`,
                    role: 'CUSTOMER',
                    isVerified: true,
                },
            });
        }

        // 3. Validate services
        const services = await this.prisma.service.findMany({
            where: { id: { in: dto.serviceIds }, clinicId, isActive: true },
        });
        if (services.length !== dto.serviceIds.length) {
            throw new BadRequestException('Một số dịch vụ không hợp lệ');
        }

        // 4. Validate staff if provided
        if (dto.staffId) {
            const staff = await this.prisma.staff.findFirst({
                where: { id: dto.staffId, clinicId, isActive: true },
            });
            if (!staff) throw new BadRequestException('Không tìm thấy chuyên gia');

            const isAvailable = await this.checkStaffAvailability(
                dto.staffId, dto.date, dto.timeSlot, this.calcDuration(services),
            );
            if (!isAvailable) throw new BadRequestException('Chuyên gia không trống lịch vào thời gian này');
        }

        // 5. Create booking
        const totalDuration = this.calcDuration(services);
        const totalAmount = this.calcAmount(services);
        const endTime = this.calcEndTime(dto.timeSlot, totalDuration);
        const bookingCode = this.generateCode();

        const booking = await this.prisma.booking.create({
            data: {
                bookingCode,
                customerId: customer.id,
                clinicId,
                staffId: dto.staffId,
                date: new Date(dto.date),
                timeSlot: dto.timeSlot,
                endTime,
                totalDuration,
                totalAmount,
                note: dto.note,
                services: {
                    create: services.map((s) => ({
                        serviceId: s.id,
                        price: s.price,
                        duration: s.duration,
                    })),
                },
            },
            include: {
                services: { include: { service: true } },
                clinics: true,
                customer: { select: { id: true, name: true, phone: true } },
                staff: { include: { user: { select: { name: true, avatar: true } } } },
            },
        });

        return {
            ...booking,
            totalAmount: Number(booking.totalAmount),
            services: booking.services.map(bs => ({
                ...bs,
                price: Number(bs.price),
                service: { ...bs.service, price: Number(bs.service.price) },
            })),
        };
    }

    async findByPhone(phone: string) {
        const customer = await this.prisma.user.findUnique({ where: { phone } });
        if (!customer) return { data: [], meta: { total: 0 } };

        const bookings = await this.prisma.booking.findMany({
            where: { customerId: customer.id },
            orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
            include: {
                clinics: { select: { id: true, name: true, slug: true, address: true, phone: true } },
                staff: { include: { user: { select: { name: true, avatar: true } } } },
                services: { include: { service: true } },
            },
        });

        return {
            data: bookings.map(b => ({
                ...b,
                totalAmount: Number(b.totalAmount),
                services: b.services.map(bs => ({
                    ...bs,
                    price: Number(bs.price),
                    service: { ...bs.service, price: Number(bs.service.price) },
                })),
            })),
            meta: { total: bookings.length },
        };
    }

    async findOne(id: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, name: true, phone: true, avatar: true } },
                clinics: true,
                staff: { include: { user: { select: { name: true, avatar: true } } } },
                services: { include: { service: true } },
                payments: true,
                review: true,
            },
        });
        if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn');

        return {
            ...booking,
            totalAmount: Number(booking.totalAmount),
            services: booking.services.map(bs => ({
                ...bs,
                price: Number(bs.price),
                service: { ...bs.service, price: Number(bs.service.price) },
            })),
        };
    }

    async findByCode(code: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { bookingCode: code },
            include: {
                clinics: true,
                services: { include: { service: true } },
                staff: { include: { user: { select: { name: true, avatar: true } } } },
                customer: { select: { id: true, name: true, phone: true } },
            },
        });
        if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn');

        return {
            ...booking,
            totalAmount: Number(booking.totalAmount),
            services: booking.services.map(bs => ({
                ...bs,
                price: Number(bs.price),
                service: { ...bs.service, price: Number(bs.service.price) },
            })),
        };
    }

    async updateStatus(id: string, dto: UpdateBookingStatusDto) {
        const booking = await this.findOne(id);
        this.validateTransition(booking.status, dto.status);

        const updateData: any = { status: dto.status };
        if (dto.status === BookingStatus.CANCELLED) {
            updateData.cancelReason = dto.cancelReason;
            updateData.cancelledAt = new Date();
        }
        if (dto.status === BookingStatus.COMPLETED) {
            updateData.paymentStatus = PaymentStatus.PAID;
        }

        return this.prisma.booking.update({
            where: { id },
            data: updateData,
            include: {
                services: { include: { service: true } },
                clinics: true,
            },
        });
    }

    async cancel(id: string, reason?: string) {
        return this.updateStatus(id, {
            status: BookingStatus.CANCELLED,
            cancelReason: reason || 'Khách hàng hủy',
        });
    }

    // ---- Private helpers ----
    private async checkStaffAvailability(staffId: string, date: string | Date, timeSlot: string, duration: number): Promise<boolean> {
        const bookingDate = new Date(date);
        const endTime = this.calcEndTime(timeSlot, duration);

        const conflict = await this.prisma.booking.findFirst({
            where: {
                staffId,
                date: bookingDate,
                status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
                OR: [
                    { AND: [{ timeSlot: { lte: timeSlot } }, { endTime: { gt: timeSlot } }] },
                    { AND: [{ timeSlot: { lt: endTime } }, { endTime: { gte: endTime } }] },
                    { AND: [{ timeSlot: { gte: timeSlot } }, { endTime: { lte: endTime } }] },
                ],
            },
        });
        return !conflict;
    }

    private calcDuration(services: { duration: number }[]): number {
        return services.reduce((sum, s) => sum + s.duration, 0);
    }

    private calcAmount(services: { price: any }[]): number {
        return services.reduce((sum, s) => sum + Number(s.price), 0);
    }

    private calcEndTime(start: string, minutes: number): string {
        const [h, m] = start.split(':').map(Number);
        const t = h * 60 + m + minutes;
        return `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
    }

    private generateCode(): string {
        const ts = Date.now().toString(36).toUpperCase();
        const rnd = uuidv4().split('-')[0].toUpperCase();
        return `HV${ts}${rnd}`.substring(0, 12);
    }

    private validateTransition(current: BookingStatus, next: BookingStatus): void {
        const valid: Record<BookingStatus, BookingStatus[]> = {
            [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
            [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
            [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
            [BookingStatus.COMPLETED]: [],
            [BookingStatus.CANCELLED]: [],
            [BookingStatus.NO_SHOW]: [],
        };
        if (!valid[current].includes(next)) {
            throw new BadRequestException(`Không thể chuyển trạng thái từ ${current} sang ${next}`);
        }
    }
}
