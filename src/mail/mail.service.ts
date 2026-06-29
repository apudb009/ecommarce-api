import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow('MAIL_HOST'),
      port: Number(this.config.getOrThrow('MAIL_PORT')),
      secure: false, // true for 465, false for 587
      auth: {
        user: this.config.getOrThrow('MAIL_USER'),
        pass: this.config.getOrThrow('MAIL_PASS'),
      },
    });
  }

  // ── SEND GENERIC EMAIL ─────────────────────────────
  private async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      // log error but don't throw — email failure shouldn't break the app
      this.logger.error(`Failed to send email to ${options.to}`, error);
    }
  }

  // ── ORDER CONFIRMATION ─────────────────────────────
  async sendOrderConfirmation(data: {
    to: string;
    name: string;
    orderId: number;
    totalAmount: number;
    items: {
      productName: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
    address: {
      street: string;
      city: string;
      country: string;
      postalCode: string;
    };
  }) {
    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.total}</td>
        </tr>`,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Confirmed! 🎉</h1>
        </div>

        <div style="padding: 24px;">
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>Thank you for your order! We've received it and will start processing soon.</p>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Order ID</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold;">#${data.orderId}</p>
          </div>

          <!-- Order Items -->
          <h3>Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px; text-align: left;">Product</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">
                  Total Amount:
                </td>
                <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #2563eb;">
                  $${data.totalAmount}
                </td>
              </tr>
            </tfoot>
          </table>

          <!-- Delivery Address -->
          <h3>Delivery Address</h3>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
            <p style="margin: 0;">${data.address.street}</p>
            <p style="margin: 4px 0 0;">${data.address.city}, ${data.address.postalCode}</p>
            <p style="margin: 4px 0 0;">${data.address.country}</p>
          </div>

          <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
            We'll send you another email when your order ships.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    `;

    await this.sendMail({
      to: data.to,
      subject: `Order Confirmed #${data.orderId} - $${data.totalAmount}`,
      html,
    });
  }

  // ── ORDER STATUS UPDATE ────────────────────────────
  async sendOrderStatusUpdate(data: {
    to: string;
    name: string;
    orderId: number;
    status: string;
  }) {
    const statusMessages: Record<string, { emoji: string; message: string }> = {
      PAID: { emoji: '✅', message: 'Your payment has been confirmed.' },
      PROCESSING: { emoji: '📦', message: 'We are preparing your order.' },
      SHIPPED: { emoji: '🚚', message: 'Your order is on its way!' },
      DELIVERED: { emoji: '🎉', message: 'Your order has been delivered!' },
      CANCELLED: { emoji: '❌', message: 'Your order has been cancelled.' },
      REFUNDED: { emoji: '💰', message: 'Your refund has been processed.' },
    };

    const info = statusMessages[data.status] || {
      emoji: '📋',
      message: `Your order status has been updated to ${data.status}.`,
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Update ${info.emoji}</h1>
        </div>

        <div style="padding: 24px;">
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>${info.message}</p>

          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Order ID</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold;">#${data.orderId}</p>
            <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Status</p>
            <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: #2563eb;">${data.status}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions, reply to this email.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    `;

    await this.sendMail({
      to: data.to,
      subject: `Order #${data.orderId} — ${data.status} ${info.emoji}`,
      html,
    });
  }

  // ── ORDER CANCELLED ────────────────────────────────
  async sendOrderCancelled(data: {
    to: string;
    name: string;
    orderId: number;
    totalAmount: number;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Order Cancelled ❌</h1>
        </div>

        <div style="padding: 24px;">
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>Your order <strong>#${data.orderId}</strong> has been cancelled.</p>

          <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #dc2626;">
              Amount of <strong>$${data.totalAmount}</strong> will be refunded
              within 5-7 business days if payment was made.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            If you did not cancel this order, please contact us immediately.
          </p>
        </div>

        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p>We hope to serve you again soon.</p>
        </div>
      </div>
    `;

    await this.sendMail({
      to: data.to,
      subject: `Order #${data.orderId} Cancelled`,
      html,
    });
  }

  // ── WELCOME EMAIL ──────────────────────────────────
  async sendWelcome(data: { to: string; name: string }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome! 👋</h1>
        </div>

        <div style="padding: 24px;">
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>Thank you for creating an account. You can now:</p>

          <ul style="color: #374151; line-height: 2;">
            <li>Browse our product catalog</li>
            <li>Add items to your cart</li>
            <li>Place and track orders</li>
            <li>Leave reviews on purchased products</li>
          </ul>

          <div style="text-align: center; margin: 24px 0;">
            <a
              href="${this.config.get('FRONTEND_URL')}"
              style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"
            >
              Start Shopping
            </a>
          </div>
        </div>

        <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p>Happy shopping!</p>
        </div>
      </div>
    `;

    await this.sendMail({
      to: data.to,
      subject: 'Welcome to our store! 🎉',
      html,
    });
  }
}
