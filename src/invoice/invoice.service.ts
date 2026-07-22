import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import puppeteer from 'puppeteer';
import { InvoiceStatus, TaxType } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { InvoiceType } from './entity/invoice.type';
import { TaxService } from 'src/tax/tax.service';
import { Tax } from 'src/generated/prisma/client';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private tax: TaxService,
  ) {}

  // ── GENERATE INVOICE NUMBER ────────────────────────
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const invoiceCount = await this.prisma.invoice.count();
    const invoiceNumber = `INV-${year}-${(invoiceCount + 1)
      .toString()
      .padStart(5, '0')}`;
    return invoiceNumber;
  }

  // ── CREATE INVOICE FROM ORDER ──────────────────────
  async createFromOrder(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: { AND: [{ id: orderId }, { userId }] },
      include: {
        items: true,
        address: true,
        payment: true,
        invoice: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Order not found or does not belong to the user.',
      );
    }

    if (order.invoice) {
      throw new ConflictException('Invoice already exists for this order.');
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // Set due date to 30 days from now

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNo: invoiceNumber,
        dueDate,
        status: order?.payment?.status === 'SUCCEEDED' ? 'PAID' : 'UNPAID',
        orderId: order.id,
        userId: order.userId,
      },
      include: {
        order: {
          include: {
            items: true,
            address: true,
            payment: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return invoice;
  }

  // ── GET MY INVOICES ────────────────────────────────
  async getMyInvoices(userId: number) {
    return await this.prisma.invoice.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  // ── GET ONE ────────────────────────────────────────
  async getOne(invoiceId: number, userId: number, isAdmin = false) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: true,
            address: true,
            payment: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (!isAdmin && invoice.userId !== userId) {
      throw new NotFoundException(
        'Invoice not found or does not belong to the user.',
      );
    }

    return invoice;
  }

  // ── GET BY INVOICE NUMBER ──────────────────────────
  async getByInvoiceNumber(invoiceNo: string, userId: number, isAdmin = false) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNo },
      include: {
        order: {
          include: {
            items: true,
            address: true,
            payment: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (!isAdmin && invoice.userId !== userId) {
      throw new NotFoundException(
        'Invoice not found or does not belong to the user.',
      );
    }

    return invoice;
  }

  // ── GET ALL (admin) ────────────────────────────────
  async getAll() {
    return this.prisma.invoice.findMany({
      include: {
        order: {
          select: {
            id: true,
            grandTotalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── UPDATE STATUS ──────────────────────────────────
  async updateStatus(invoiceId: number, status: InvoiceStatus) {
    await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    return await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });
  }

  // ── GENERATE PDF ───────────────────────────────────
  async generatePdf(
    id: number,
    userId: number,
    isAdmin = false,
  ): Promise<Buffer> {
    const invoice = await this.getOne(id, userId, isAdmin);
    const taxData = (await this.tax.getActive()) as Tax;

    const html = this.buildInvoiceHtml(invoice, taxData);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // ── BUILD HTML TEMPLATE ────────────────────────────
  private buildInvoiceHtml(invoice: InvoiceType, taxData: Tax) {
    const order = invoice.order;
    const user = invoice.user;
    const address = order.address;

    const taxRate =
      taxData.type === TaxType.PERCENTAGE
        ? `${Number(taxData.rate ?? 0)}%`
        : 'Fixed';

    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f0f0f0;">
          ${item.productName}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: right;">
          $${Number(item.unitPrice).toFixed(2)}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; text-align: right;">
          $${Number(item.total).toFixed(2)}
        </td>
      </tr>
    `,
      )
      .join('');

    const statusColor =
      {
        PAID: '#16a34a',
        UNPAID: '#d97706',
        CANCELLED: '#dc2626',
      }[invoice.status as string] || '#6b7280';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            font-size: 14px;
            line-height: 1.5;
          }
          .container { max-width: 800px; margin: 0 auto; }

          /* header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          .brand { font-size: 28px; font-weight: 800; color: #2563eb; }
          .brand-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }

          .invoice-title { text-align: right; }
          .invoice-title h1 { font-size: 32px; color: #111827; font-weight: 700; }
          .invoice-no { font-size: 16px; color: #6b7280; margin-top: 4px; }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
            background: ${statusColor};
            margin-top: 8px;
          }

          /* info grid */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            margin-bottom: 36px;
          }
          .info-block h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #9ca3af;
            margin-bottom: 8px;
          }
          .info-block p { font-size: 13px; color: #374151; line-height: 1.6; }
          .info-block .name { font-weight: 600; font-size: 14px; color: #111827; }

          /* table */
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          thead tr { background: #f9fafb; }
          thead th {
            padding: 12px 10px;
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
          }
          thead th:not(:first-child) { text-align: center; }
          thead th:last-child { text-align: right; }

          /* totals */
          .totals {
            display: flex;
            justify-content: flex-end;
          }
          .totals-table { width: 280px; }
          .totals-table td {
            padding: 6px 10px;
            font-size: 13px;
            color: #374151;
          }
          .totals-table .total-row td {
            padding-top: 10px;
            font-size: 16px;
            font-weight: 700;
            color: #111827;
            border-top: 2px solid #e5e7eb;
          }
          .totals-table td:last-child { text-align: right; }

          /* footer */
          .footer {
            margin-top: 48px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer p { font-size: 12px; color: #9ca3af; }
          .thank-you {
            font-size: 15px;
            font-weight: 600;
            color: #2563eb;
          }

          /* payment info */
          .payment-info {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #166534;
          }
        </style>
      </head>
      <body>
        <div class="container">

          <!-- HEADER -->
          <div class="header">
            <div>
              <div class="brand">🛒 ShopApp</div>
              <div class="brand-sub">Your trusted online store</div>
            </div>
            <div class="invoice-title">
              <h1>INVOICE</h1>
              <div class="invoice-no">${invoice.invoiceNo}</div>
              <div class="status-badge">${invoice.status}</div>
            </div>
          </div>

          <!-- INFO GRID -->
          <div class="info-grid">
            <div class="info-block">
              <h3>Billed To</h3>
              <p class="name">${user.name || user.username}</p>
              <p>${user.email}</p>
            </div>
            <div class="info-block">
              <h3>Delivery Address</h3>
              <p>${address.street}</p>
              <p>${address.city}, ${address.state} ${address.postalCode}</p>
              <p>${address.country}</p>
            </div>
            <div class="info-block">
              <h3>Invoice Details</h3>
              <p><strong>Issue Date:</strong><br/>
                ${new Date(invoice.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              ${
                invoice.dueDate
                  ? `
              <p style="margin-top:6px;"><strong>Due Date:</strong><br/>
                ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>`
                  : ''
              }
              <p style="margin-top:6px;"><strong>Order #:</strong> ${order.id}</p>
            </div>
          </div>

          <!-- PAYMENT CONFIRMED -->
          ${
            order.payment?.status === 'SUCCEEDED'
              ? `
          <div class="payment-info">
            ✅ Payment confirmed via Stripe · 
            Transaction: ${order.payment.stripePaymentId} · 
            Amount: $${Number(order.payment.amount).toFixed(2)} ${order.payment.currency.toUpperCase()}
          </div>`
              : ''
          }

          <!-- ITEMS TABLE -->
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- TOTALS -->
          <div class="totals">
            <table class="totals-table">
              <tr>
                <td>Subtotal</td>
                <td>$${Number(order.totalAmount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Shipping</td>
                <td>${Number(order.shippingAmount) === 0 ? 'Free' : Number(order.shippingAmount)}</td>
              </tr>
              <tr>
                <td>Tax (${taxRate})</td>
                <td>$${Number(order.taxAmount).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total</td>
                <td>$${Number(order.grandTotalAmount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- NOTES -->
          ${
            invoice.notes
              ? `
          <div style="margin-top:24px; padding:12px 16px; background:#fafafa; border-radius:8px; font-size:13px; color:#374151;">
            <strong>Notes:</strong> ${invoice.notes}
          </div>`
              : ''
          }

          <!-- FOOTER -->
          <div class="footer">
            <p>Thank you for shopping with ShopApp<br/>
            Questions? Contact us at support@shopapp.com</p>
            <p class="thank-you">Thank you! 🙏</p>
          </div>

        </div>
      </body>
      </html>
    `;
  }
}
