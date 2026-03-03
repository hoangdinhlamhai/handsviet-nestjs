import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TreatmentCategory } from '@prisma/client';

@Injectable()
export class ServicesService {
    constructor(private readonly prisma: PrismaService) { }

    async findByClinic(clinicId: string, category?: string) {
        const where: any = { clinicId, isActive: true };
        if (category) where.category = category as TreatmentCategory;

        const services = await this.prisma.service.findMany({
            where,
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
        });

        // Add salonId alias for frontend compatibility
        return services.map(s => ({
            ...s,
            salonId: s.clinicId,
            price: Number(s.price), // Convert Decimal to number
        }));
    }
}
