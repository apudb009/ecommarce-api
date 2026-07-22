import { Injectable, Logger } from '@nestjs/common';
import { CronExpression, Cron } from '@nestjs/schedule';
import { NotificationType } from 'src/generated/prisma/enums';
import { MailService } from 'src/mail/mail.service';
import { NotificationService } from 'src/notification/notification.service';
import { PrismaService } from 'src/prisma.service';
import { StoreSettingsService } from 'src/store-settings/store-settings.service';

@Injectable()
export class SchedulerService {
  private logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notification: NotificationService,
    private readonly storeSettings: StoreSettingsService,
  ) {}

  // ── 1. CANCEL PENDING ORDERS (every hour) ──────────
  // Orders that are PENDING for more than 24 hours
  // without payment get auto-cancelled
  @Cron(CronExpression.EVERY_HOUR)
  async cancelStaleOrders() {
    this.logger.log('Canceling stale orders...');

    const cancelHour =
      (await this.storeSettings.findOne('order_cancel_hours')) || 24;

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - Number(cancelHour));
    const staleOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: cutoff },
        payment: { is: null },
      },
      include: {
        items: true,
        user: {
          select: {
            email: true,
            name: true,
            username: true,
            id: true,
          },
        },
      },
    });

    if (staleOrders.length === 0) {
      this.logger.log('No stale pending orders found');
      return;
    }

    for (const order of staleOrders) {
      await this.prisma.$transaction(async (tx) => {
        //update product stock
        for (const item of order.items) {
          await tx.product.update({
            where: {
              id: item.productId,
            },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          //Update variant stock
          if (item.variantId) {
            await tx.productVariant.update({
              where: {
                id: item.variantId,
              },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            });
          }
        }

        //update order status
        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: 'CANCELLED',
          },
        });
      });

      // notify user
      this.notification
        .create(
          {
            type: NotificationType.ORDER_CANCELLED,
            title: 'Order Cancelled ❌',
            message: `Order #${order.id} was cancelled due to no payment within 24 hours.`,
            link: `/orders/${order.id}`,
          },
          order.user.id,
        )
        .catch(() => {});

      // send email
      this.mail
        .sendOrderCancelled({
          to: order.user.email,
          name: order.user.name!,
          orderId: order.id,
          totalAmount: Number(order.totalAmount),
        })
        .catch(() => {});
    }

    this.logger.log(`Cancelled ${staleOrders.length} stale pending orders`);
  }

  // ── 2. EXPIRE COUPONS (daily at midnight) ──────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deactivateExpiredCoupons() {
    this.logger.log('Running: Deactivate expired coupons');

    await this.prisma.coupon.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });
  }

  // ── 3. EXPIRE FLASH SALES (every 5 minutes) ──────── TODO

  // ── 4. LOW STOCK ALERT (daily at 9 AM) ─────────────
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendLowStockAlerts() {
    this.logger.log('Running: Send low stock alerts');
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        stock: { lte: 10, gt: 0 },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    const outOfStockProducts = await this.prisma.product.findMany({
      where: {
        stock: { equals: 0 },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    //Products are available
    if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
      this.logger.log('No low stock products found');
      return;
    }

    // notify all admins
    const admins = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
      },
    });

    for (const admin of admins) {
      if (outOfStockProducts.length > 0) {
        await this.notification
          .create(
            {
              type: NotificationType.SYSTEM,
              title: '🔴 Out of Stock Alert',
              message: `${outOfStockProducts.length} product(s) are out of stock: ${outOfStockProducts
                .slice(0, 3)
                .map((p) => p.name)
                .join(
                  ', ',
                )}${outOfStockProducts.length > 3 ? ` +${outOfStockProducts.length - 3} more` : ''}`,
              link: '/admin/products',
            },
            admin.id,
          )
          .catch(() => {});
      }

      if (lowStockProducts.length > 0) {
        await this.notification
          .create(
            {
              type: NotificationType.SYSTEM,
              title: '⚠️ Low Stock Alert',
              message: `${lowStockProducts.length} product(s) are running low on stock.`,
              link: '/admin/products',
            },
            admin.id,
          )
          .catch(() => {});
      }

      this.logger.log(
        `Low stock: ${lowStockProducts.length}, Out of stock: ${outOfStockProducts.length}`,
      );
    }
  }

  // ── 5. ABANDONED CART EMAIL (every 2 hours) ────────
  @Cron(CronExpression.EVERY_2_HOURS)
  async sendAbandonedCartEmails() {
    this.logger.log('Running: Send abandoned cart emails');

    const twoHoursEarlier = new Date();
    twoHoursEarlier.setHours(twoHoursEarlier.getHours() - 2);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const abandonedCarts = await this.prisma.cart.findMany({
      where: {
        createdAt: {
          lte: twoHoursEarlier,
          gte: twentyFourHoursAgo,
        },
        user: {
          orders: {
            none: {
              createdAt: {
                gte: twoHoursEarlier,
              },
            },
          },
        },
      },
      include: {
        user: { select: { email: true, id: true, name: true, username: true } },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
      take: 3,
    });

    this.logger.log(`Found ${abandonedCarts.length} abandoned carts`);

    for (const cart of abandonedCarts) {
      const data = {
        to: cart.user.email,
        name: cart.user.name || cart.user.username,
        items: cart.items.map((i) => ({
          name: i.product.name,
          price: Number(i.product.price),
          quantity: i.quantity,
          slug: i.product.slug,
          image: i.product.images[0]?.url,
        })),
      };

      await this.mail.sendAbandonedCart(data).catch(() => {});
    }
  }

  // ── 7. CLEANUP OLD NOTIFICATIONS (weekly) ──────────
  // every Sunday midnight
  @Cron('0 0 * * 0')
  async cleanupOldNotifications() {
    this.logger.log('Running: Cleanup old notifications');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: {
          lte: thirtyDaysAgo,
        },
      },
    });
  }

  // ── 10. DATABASE HEALTH CHECK (every 30 min) ───────
  @Cron('*/30 * * * *')
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.logger.log('Database health check: OK');
    } catch (error) {
      this.logger.error('Database health check FAILED:', error);
    }
  }
}
