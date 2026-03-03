import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getQrInfo(bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                clinics: { select: { bankCode: true, bankAccount: true, bankName: true, name: true } },
            },
        });

        if (!booking) throw new NotFoundException('Không tìm thấy lịch hẹn');

        const depositAmount = Math.round(Number(booking.totalAmount) * 0.5);
        const content = `HV ${booking.bookingCode}`;

        const bankId = booking.clinics.bankCode || '970423';
        const accountNo = booking.clinics.bankAccount || '';
        const qrUrl = `https://qr.sepay.vn/img?acc=${accountNo}&bank=${bankId}&amount=${depositAmount}&des=${encodeURIComponent(content)}`;

        return {
            bookingId: booking.id,
            bookingCode: booking.bookingCode,
            totalAmount: Number(booking.totalAmount),
            depositAmount,
            depositPercent: 50,
            paymentStatus: booking.paymentStatus,
            bankInfo: {
                bankName: booking.clinics.bankName || 'TPBank',
                bankCode: bankId,
                accountNo,
                accountName: booking.clinics.name,
            },
            transferContent: content,
            qrUrl,
        };
    }

    async handleSepayWebhook(payload: any) {
        this.logger.log(`SePay webhook received: ${JSON.stringify(payload)}`);

        const { content, transferAmount, transferType } = payload;

        if (transferType !== 'in') {
            this.logger.log('Ignoring outgoing transfer');
            return { success: true, message: 'Ignored (outgoing)' };
        }

        // Match full booking code (starts with HV, e.g. HVMMALLUVMED)
        const match = content?.match(/(HV[A-Z0-9]{6,})/i);
        if (!match) {
            this.logger.warn(`No booking code found in content: ${content}`);
            return { success: true, message: 'No booking code found' };
        }

        const bookingCode = match[1].toUpperCase();
        this.logger.log(`Looking for booking code: ${bookingCode}, amount: ${transferAmount}`);

        const booking = await this.prisma.booking.findUnique({
            where: { bookingCode },
        });

        if (!booking) {
            this.logger.warn(`Booking not found for code: ${bookingCode}`);
            return { success: true, message: 'Booking not found' };
        }

        if (booking.paymentStatus === PaymentStatus.PAID) {
            this.logger.log(`Booking ${bookingCode} already paid`);
            return { success: true, message: 'Already paid' };
        }

        const depositAmount = Math.round(Number(booking.totalAmount) * 0.5);
        const received = Number(transferAmount);

        if (received < depositAmount * 0.95) {
            this.logger.warn(`Insufficient amount: received ${received}, expected ${depositAmount}`);
            await this.createPaymentRecord(booking.id, received, 'BANK_TRANSFER', payload);
            return { success: true, message: 'Insufficient amount, recorded as partial' };
        }

        await this.prisma.booking.update({
            where: { id: booking.id },
            data: {
                paymentStatus: PaymentStatus.PAID,
                paymentMethod: 'BANK_TRANSFER',
                status: booking.status === 'PENDING' ? 'CONFIRMED' : booking.status,
            },
        });

        await this.createPaymentRecord(booking.id, received, 'BANK_TRANSFER', payload);

        this.logger.log(`Booking ${bookingCode} marked as PAID (received: ${received})`);
        return { success: true, message: 'Deposit confirmed', bookingCode };
    }

    private async createPaymentRecord(bookingId: string, amount: number, method: string, rawData: any) {
        return this.prisma.payment.create({
            data: {
                bookingId,
                amount,
                method: method as any,
                status: PaymentStatus.PAID,
                type: 'DEPOSIT',
                paidAt: new Date(),
                sepayTransId: rawData?.id?.toString() || null,
                sepayRef: rawData?.referenceCode || null,
            },
        });
    }
}
