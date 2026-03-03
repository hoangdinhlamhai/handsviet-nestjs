import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class StaffService {
    constructor(private readonly prisma: PrismaService) { }

    async findByClinic(clinicId: string) {
        return this.prisma.staff.findMany({
            where: { clinicId, isActive: true },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { rating: 'desc' },
        });
    }

    async getAvailableSlots(
        clinicId: string,
        date: string,
        duration: number,
        staffId?: string,
    ) {
        const clinic = await this.prisma.clinics.findUnique({ where: { id: clinicId } });
        if (!clinic) return [];

        const bookingDate = new Date(date);

        // Generate all possible slots
        const slots = this.generateTimeSlots(clinic.openTime, clinic.closeTime, 30);

        // Get existing bookings for this date
        const where: any = {
            clinicId,
            date: bookingDate,
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
        };
        if (staffId) where.staffId = staffId;

        const existingBookings = await this.prisma.booking.findMany({ where });

        return slots.map((slot) => {
            const slotEnd = this.addMinutes(slot, duration);
            const isConflicting = existingBookings.some((booking) => {
                return (
                    (slot >= booking.timeSlot && slot < booking.endTime) ||
                    (slotEnd > booking.timeSlot && slotEnd <= booking.endTime) ||
                    (slot <= booking.timeSlot && slotEnd >= booking.endTime)
                );
            });

            const exceedsClose = slotEnd > clinic.closeTime;

            return { time: slot, available: !isConflicting && !exceedsClose };
        });
    }

    private generateTimeSlots(openTime: string, closeTime: string, intervalMinutes: number): string[] {
        const slots: string[] = [];
        let [h, m] = openTime.split(':').map(Number);
        const [ch, cm] = closeTime.split(':').map(Number);
        const closeMinutes = ch * 60 + cm;

        while (h * 60 + m < closeMinutes) {
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
            m += intervalMinutes;
            if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
        }
        return slots;
    }

    private addMinutes(time: string, minutes: number): string {
        const [h, m] = time.split(':').map(Number);
        const total = h * 60 + m + minutes;
        return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
    }
}
