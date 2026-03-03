import {
    IsString, IsOptional, IsArray, IsDateString, Matches, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
    @ApiProperty({ description: 'Clinic ID' })
    @IsString()
    salonId: string;

    @ApiProperty({ description: 'Customer phone number', example: '0909111111' })
    @IsString()
    @Matches(/^0[0-9]{9,10}$/, { message: 'Số điện thoại không hợp lệ' })
    phone: string;

    @ApiPropertyOptional({ description: 'Customer name' })
    @IsOptional()
    @IsString()
    customerName?: string;

    @ApiProperty({ description: 'Array of service IDs', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    serviceIds: string[];

    @ApiPropertyOptional({ description: 'Staff/Therapist ID' })
    @IsOptional()
    @IsString()
    staffId?: string;

    @ApiProperty({ example: '2026-03-15', description: 'Booking date' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: '09:00', description: 'Start time slot' })
    @IsString()
    @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Time slot must be in HH:mm format',
    })
    timeSlot: string;

    @ApiPropertyOptional({ example: 'Đau lưng do chấn thương thể thao' })
    @IsOptional()
    @IsString()
    note?: string;
}
