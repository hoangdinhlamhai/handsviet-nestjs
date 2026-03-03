import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Staff')
@Controller('staff')
export class StaffController {
    constructor(private readonly staffService: StaffService) { }

    @Public()
    @Get('salon/:salonId')
    @ApiOperation({ summary: 'Get staff by clinic' })
    findBySalon(@Param('salonId') clinicId: string) {
        return this.staffService.findByClinic(clinicId);
    }

    @Public()
    @Get('salon/:salonId/available-slots')
    @ApiOperation({ summary: 'Get available time slots' })
    @ApiQuery({ name: 'date', required: true })
    @ApiQuery({ name: 'duration', required: true })
    @ApiQuery({ name: 'staffId', required: false })
    getAvailableSlots(
        @Param('salonId') clinicId: string,
        @Query('date') date: string,
        @Query('duration') duration: string,
        @Query('staffId') staffId?: string,
    ) {
        return this.staffService.getAvailableSlots(clinicId, date, parseInt(duration), staffId);
    }
}
