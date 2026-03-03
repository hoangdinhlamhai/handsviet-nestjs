import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClinicsService } from './clinics.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Clinics')
@Controller('salons')  // Keep /salons path for frontend compatibility
export class ClinicsController {
    constructor(private readonly clinicsService: ClinicsService) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Get all clinics' })
    @ApiQuery({ name: 'skip', required: false })
    @ApiQuery({ name: 'take', required: false })
    @ApiQuery({ name: 'city', required: false })
    @ApiQuery({ name: 'district', required: false })
    @ApiQuery({ name: 'search', required: false })
    findAll(
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('city') city?: string,
        @Query('district') district?: string,
        @Query('search') search?: string,
    ) {
        return this.clinicsService.findAll({
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
            city, district, search,
        });
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get clinic by ID' })
    findOne(@Param('id') id: string) {
        return this.clinicsService.findOne(id);
    }
}
