import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Public()
    @Get('qr/:bookingId')
    @ApiOperation({ summary: 'Get QR payment info for a booking' })
    getQrInfo(@Param('bookingId') bookingId: string) {
        return this.paymentsService.getQrInfo(bookingId);
    }

    @Public()
    @Post('sepay-webhook')
    @ApiOperation({ summary: 'SePay webhook for bank transfer notifications' })
    handleSepayWebhook(@Body() payload: any) {
        return this.paymentsService.handleSepayWebhook(payload);
    }
}
