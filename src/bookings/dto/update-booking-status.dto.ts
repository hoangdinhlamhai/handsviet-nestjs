import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class UpdateBookingStatusDto {
    @ApiProperty({ enum: BookingStatus })
    @IsEnum(BookingStatus)
    status: BookingStatus;

    @ApiPropertyOptional({ description: 'Reason for cancellation' })
    @IsOptional()
    @IsString()
    cancelReason?: string;
}
