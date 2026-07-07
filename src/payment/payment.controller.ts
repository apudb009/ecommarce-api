import {
  Controller,
  Headers,
  Post,
  Body,
  Request,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Public } from 'src/auth/constants';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // POST /api/payment/create-intent
  @Post('/create-intent')
  async createPaymentIntent(
    @Body() createPaymentDto: CreatePaymentIntentDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.paymentService.createPaymentIntent(
      createPaymentDto,
      req.user.sub,
    );
  }

  // POST /api/payment/webhook
  // ⚠️ Must be Public — Stripe doesn't send auth headers
  // ⚠️ Must use raw body — Stripe signature needs raw bytes
  @Public()
  @Post('/webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody!, signature);
  }
}
