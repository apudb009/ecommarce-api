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

  // ── ABANDONED CART EMAIL ───────────────────────────
  async sendAbandonedCart(data: {
    to: string;
    name: string;
    items: {
      name: string;
      price: number;
      quantity: number;
      image?: string;
      slug: string;
    }[];
  }) {
    const itemsHtml = data.items
      .map(
        (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
        ${
          item.image
            ? `<img src="${item.image}" alt="${item.name}"
               style="width:50px;height:50px;object-fit:cover;border-radius:6px;" />`
            : ''
        }
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
        ${item.name}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: right;">
        $${item.price.toFixed(2)}
      </td>
    </tr>
  `,
      )
      .join('');

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">You left something behind! 🛒</h1>
      </div>

      <div style="padding: 24px;">
        <p>Hi <strong>${data.name}</strong>,</p>
        <p>You left some items in your cart. Complete your purchase before they sell out!</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px;"></th>
              <th style="padding: 8px; text-align: left;">Product</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          
            href="${this.config.get('FRONTEND_URL')}/cart"
            style="background: #2563eb; color: white; padding: 12px 32px;
                   border-radius: 6px; text-decoration: none; font-weight: bold;"
          >
            Complete My Purchase →
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Don't wait too long — stock is limited!
        </p>
      </div>
    </div>
  `;

    await this.sendMail({
      to: data.to,
      subject: '🛒 You left items in your cart!',
      html,
    });
  }

  // ── WEEKLY REPORT EMAIL ────────────────────────────
  async sendWeeklyReport(data: {
    to: string;
    name: string;
    weekOrders: number;
    weekRevenue: number;
    weekNewUsers: number;
    weekReviews: number;
  }) {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e1b4b; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">📊 Weekly Report</h1>
        <p style="color: #a5b4fc; margin: 4px 0 0;">
          ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div style="padding: 24px;">
        <p>Hi <strong>${data.name}</strong>, here's your store performance this week:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0;">
          ${[
            { label: 'New Orders', value: data.weekOrders, icon: '📦' },
            {
              label: 'Revenue',
              value: `$${data.weekRevenue.toFixed(2)}`,
              icon: '💰',
            },
            { label: 'New Users', value: data.weekNewUsers, icon: '👤' },
            { label: 'New Reviews', value: data.weekReviews, icon: '⭐' },
          ]
            .map(
              (stat) => `
            <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px;">${stat.icon}</div>
              <div style="font-size: 24px; font-weight: bold; color: #111827;">
                ${stat.value}
              </div>
              <div style="font-size: 12px; color: #6b7280;">${stat.label}</div>
            </div>
          `,
            )
            .join('')}
        </div>

        <div style="text-align: center; margin: 24px 0;">
          
            href="${this.config.get('FRONTEND_URL')}/admin/dashboard"
            style="background: #1e1b4b; color: white; padding: 12px 32px;
                   border-radius: 6px; text-decoration: none; font-weight: bold;"
          >
            View Full Dashboard →
          </a>
        </div>
      </div>
    </div>
  `;

    await this.sendMail({
      to: data.to,
      subject: `📊 Weekly Store Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      html,
    });
  }

  // ── FORGOT PASSWORD EMAIL ──────────────────────────
  async sendPasswordReset(data: {
    to: string;
    name: string;
    resetLink: string;
    expiresIn: string;
  }) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: #f9fafb;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 560px;
          margin: 40px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          padding: 32px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }
        .header p {
          color: rgba(255,255,255,0.8);
          margin: 8px 0 0;
          font-size: 14px;
        }
        .body {
          padding: 32px;
        }
        .body p {
          color: #374151;
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .btn {
          display: block;
          width: fit-content;
          margin: 24px auto;
          background: #2563eb;
          color: white !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
        }
        .btn:hover { background: #1d4ed8; }
        .warning {
          background: #fef9c3;
          border: 1px solid #fde047;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #713f12;
          margin: 20px 0;
        }
        .link-box {
          background: #f3f4f6;
          border-radius: 6px;
          padding: 12px;
          font-size: 12px;
          color: #6b7280;
          word-break: break-all;
          margin-top: 16px;
        }
        .footer {
          text-align: center;
          padding: 20px 32px;
          background: #f9fafb;
          color: #9ca3af;
          font-size: 12px;
          border-top: 1px solid #f3f4f6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Reset Your Password</h1>
          <p>ShopApp Account Security</p>
        </div>

        <div class="body">
          <p>Hi <strong>${data.name}</strong>,</p>

          <p>
            We received a request to reset the password for your ShopApp account.
            Click the button below to create a new password.
          </p>

          <a href="${data.resetLink}" class="btn">
            Reset My Password
          </a>

          <div class="warning">
            ⏰ This link will expire in <strong>${data.expiresIn}</strong>.
            If you did not request a password reset, you can safely ignore this email.
          </div>

          <p style="font-size: 13px; color: #6b7280;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <div class="link-box">${data.resetLink}</div>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} ShopApp. All rights reserved.</p>
          <p>This email was sent to ${data.to}</p>
        </div>
      </div>
    </body>
    </html>
  `;

    await this.sendMail({
      to: data.to,
      subject: '🔐 Reset your ShopApp password',
      html,
    });
  }

  // ── PASSWORD CHANGED CONFIRMATION EMAIL ────────────
  async sendPasswordChanged(data: { to: string; name: string }) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: #f9fafb;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 560px;
          margin: 40px auto;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.07);
        }
        .header {
          background: linear-gradient(135deg, #16a34a, #15803d);
          padding: 32px;
          text-align: center;
        }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
        .alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #991b1b;
          margin: 20px 0;
        }
        .btn {
          display: block;
          width: fit-content;
          margin: 24px auto;
          background: #2563eb;
          color: white !important;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background: #f9fafb;
          color: #9ca3af;
          font-size: 12px;
          border-top: 1px solid #f3f4f6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Password Changed</h1>
        </div>
        <div class="body">
          <p>Hi <strong>${data.name}</strong>,</p>
          <p>
            Your ShopApp password has been successfully changed.
          </p>
          <div class="alert">
            🚨 If you did not make this change, please contact us immediately
            at <strong>support@shopapp.com</strong> or reset your password right away.
          </div>
          <a href="${this.config.get('FRONTEND_URL')}/login" class="btn">
            Login to Your Account
          </a>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ShopApp · ${data.to}
        </div>
      </div>
    </body>
    </html>
  `;

    await this.sendMail({
      to: data.to,
      subject: '✅ Your ShopApp password has been changed',
      html,
    });
  }
}
