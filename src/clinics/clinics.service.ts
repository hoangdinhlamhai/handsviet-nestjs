import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ClinicsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(params: {
        skip?: number; take?: number; city?: string; district?: string; search?: string;
    }) {
        const { skip = 0, take = 20, city, district, search } = params;
        const where: any = { isActive: true };

        if (city) where.city = city;
        if (district) where.district = district;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [clinics, total] = await Promise.all([
            this.prisma.clinics.findMany({
                where, skip, take,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { staff: true, services: true, reviews: true } },
                },
            }),
            this.prisma.clinics.count({ where }),
        ]);

        // Calculate avg rating
        const clinicsWithRating = await Promise.all(
            clinics.map(async (clinic) => {
                const avgRating = await this.prisma.review.aggregate({
                    where: { clinicId: clinic.id, isVisible: true },
                    _avg: { rating: true },
                });
                return {
                    ...clinic,
                    // Map fields to match frontend expectations (salon shape)
                    id: clinic.id,
                    rating: avgRating._avg.rating || 5.0,
                    totalReviews: clinic._count.reviews,
                };
            }),
        );

        return {
            data: clinicsWithRating,
            meta: { total, skip, take, hasMore: skip + take < total },
        };
    }

    async findOne(id: string) {
        const clinic = await this.prisma.clinics.findUnique({
            where: { id },
            include: {
                staff: {
                    where: { isActive: true },
                    include: {
                        user: { select: { id: true, name: true, avatar: true } },
                        schedules: true,
                    },
                },
                services: { where: { isActive: true }, orderBy: { order: 'asc' } },
                _count: { select: { reviews: true, bookings: true } },
            },
        });

        if (!clinic) throw new NotFoundException(`Clinic with ID ${id} not found`);

        const avgRating = await this.prisma.review.aggregate({
            where: { clinicId: id, isVisible: true },
            _avg: { rating: true },
        });

        return {
            ...clinic,
            rating: avgRating._avg.rating || 5.0,
            totalReviews: clinic._count.reviews,
        };
    }
}
