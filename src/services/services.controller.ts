import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
    constructor(private readonly servicesService: ServicesService) { }

    @Public()
    @Get('salon/:salonId')
    @ApiOperation({ summary: 'Get services by clinic (uses /salon/:id for frontend compat)' })
    @ApiQuery({ name: 'category', required: false })
    findBySalon(
        @Param('salonId') clinicId: string,
        @Query('category') category?: string,
    ) {
        return this.servicesService.findByClinic(clinicId, category);
    }
}
