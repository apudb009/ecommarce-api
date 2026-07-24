import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { OrderService } from 'src/order/order.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import {
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
} from 'src/generated/prisma/enums';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  constructor(
    private prisma: PrismaService,
    private order: OrderService,
    private config: ConfigService,
  ) {
    // ── initialize Stripe ──────────────────────────
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2026-06-24.dahlia',
      },
    );
  }

  // ── CREATE PAYMENT INTENT ──────────────────────────
  async createPaymentIntent(
    createPaymentDto: CreatePaymentIntentDto,
    userId: number,
  ) {
    // 1. fetch order
    const order = await this.order.findOne(createPaymentDto.orderId, userId);

    //2. Only pending orders can be paid
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order is already ${order.status}. Only PENDING orders can be paid.`,
      );
    }

    // 3. check if payment intent already exists
    if (order.payment) {
      // return existing intent if still pending
      if (order.payment.status === PaymentStatus.PENDING) {
        const existingPaymentIntent = await this.stripe.paymentIntents.retrieve(
          order.payment.stripePaymentId,
        );

        return {
          clientSecret: existingPaymentIntent.client_secret,
          paymentId: order.payment.id,
          amount: order.payment.amount,
        };
      }

      throw new BadRequestException('Payment already processed for this order');
    }

    // 4. convert to cents (Stripe uses smallest currency unit)
    const amount = Math.round(Number(order.grandTotalAmount));

    // 5. create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order.id.toString(),
        userId: userId.toString(),
      },
    });

    // 6. save payment record in DB
    const payment = await this.prisma.payment.create({
      data: {
        amount,
        currency: 'usd',
        stripePaymentId: paymentIntent.id,
        status: PaymentStatus.PENDING,
        orderId: order.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount,
    };
  }

  // ── STRIPE WEBHOOK HANDLER ─────────────────────────
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    let event: Stripe.Event;

    // 1. verify webhook signature (security!)
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    // 2. handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;

      default:
        // ignore other events
        break;
    }

    return { received: true };
  }

  // ── HANDLE PAYMENT SUCCESS ─────────────────────────
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) return; // not our payment

    // update payment status
    await this.prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: { status: PaymentStatus.SUCCEEDED },
    });

    // update order status to PAID
    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
        stripePaymentId: paymentIntent.id,
      },
    });

    //update invoice to PAID
    await this.prisma.invoice.update({
      where: { orderId: payment.orderId },
      data: { status: InvoiceStatus.PAID },
    });
  }

  // ── HANDLE PAYMENT FAILURE ─────────────────────────
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
    });

    if (!payment) return;

    // update payment status
    await this.prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: { status: PaymentStatus.FAILED },
    });

    // restore stock when payment fails
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { items: true },
    });

    if (order) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
      });
    }
  }

  // ── GET PAYMENT BY ORDER ───────────────────────────
  async getPaymentByOrder(orderId: number, userId: number) {
    // verify order belongs to user
    const order = await this.order.findOne(orderId, userId);

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
      include: { order: true },
    });

    if (!payment)
      throw new NotFoundException('No payment found for this order');
    return payment;
  }
}
