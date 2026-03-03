import {
    Controller, Get, Post, Body, Patch, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    @Public()
    @Post()
    @ApiOperation({ summary: 'Create a new booking (by phone)' })
    create(@Body() dto: CreateBookingDto) {
        return this.bookingsService.create(dto);
    }

    @Public()
    @Get('phone/:phone')
    @ApiOperation({ summary: 'Get bookings by phone number' })
    findByPhone(@Param('phone') phone: string) {
        return this.bookingsService.findByPhone(phone);
    }

    @Public()
    @Get('code/:code')
    @ApiOperation({ summary: 'Get booking by code' })
    findByCode(@Param('code') code: string) {
        return this.bookingsService.findByCode(code);
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get booking by ID' })
    findOne(@Param('id') id: string) {
        return this.bookingsService.findOne(id);
    }

    @Public()
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update booking status' })
    updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateBookingStatusDto,
    ) {
        return this.bookingsService.updateStatus(id, dto);
    }

    @Public()
    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel booking' })
    cancel(
        @Param('id') id: string,
        @Body('reason') reason?: string,
    ) {
        return this.bookingsService.cancel(id, reason);
    }
}
