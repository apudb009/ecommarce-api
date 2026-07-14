import { Injectable } from '@nestjs/common';
import { OrderStatus } from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ── OVERVIEW STATS ─────────────────────────────────
  async getOverview() {
    const [
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      totalReviews,
      pendingOrders,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          status: OrderStatus.DELIVERED,
        },
        _sum: {
          totalAmount: true,
        },
      }),
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.user.count(),
      this.prisma.review.count(),
      this.prisma.order.count({
        where: {
          status: OrderStatus.PENDING,
        },
      }),
      this.prisma.product.count({
        where: {
          stock: {
            lte: 5,
          },
          isActive: true,
        },
      }),
    ]);

    return {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders,
      totalProducts,
      totalUsers,
      totalReviews,
      pendingOrders,
      lowStockProducts,
    };
  }

  // ── REVENUE BY DAY (last 30 days) ──────────────────
  async getRevenueByDay() {
    const orders = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        status: {
          in: [
            OrderStatus.DELIVERED,
            OrderStatus.PAID,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
          ],
        },
      },
      _sum: {
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });

    return orders.map((order) => ({
      date: order.createdAt.toISOString().split('T')[0],
      revenue: Number(order._sum.totalAmount || 0),
    }));
  }

  // ── ORDERS BY STATUS ───────────────────────────────
  async getOrdersByStatus() {
    const orderStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    return orderStatus.map((order) => ({
      status: order.status,
      count: order._count.status,
    }));
  }

  // ── ORDERS BY DAY (last 30 days) ───────────────────
  async getOrdersByDay() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const orderMap: Record<string, number> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      orderMap[date] = (orderMap[date] || 0) + 1;
    });

    const result: { date: string; orders: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        orders: orderMap[dateStr] || 0,
      });
    }

    return result;
  }

  // ── TOP SELLING PRODUCTS ───────────────────────────
  async getTopProducts(limit = 5) {
    const topItems = await this.prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    return topItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      totalSold: item._sum.quantity || 0,
      revenue: Number(item._sum.total || 0),
    }));
  }

  // ── REVENUE BY CATEGORY ────────────────────────────
  async getRevenueByCategory() {
    const items = await this.prisma.orderItem.findMany({
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    const categoryMap: Record<
      string,
      { name: string; revenue: number; orders: number }
    > = {};

    items.forEach((item) => {
      const catName = item.product.category.name;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { name: catName, revenue: 0, orders: 0 };
      }
      categoryMap[catName].revenue += Number(item.total);
      categoryMap[catName].orders += item.quantity;
    });

    return Object.values(categoryMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({ ...c, revenue: Number(c.revenue.toFixed(2)) }));
  }

  // ── NEW USERS BY WEEK (last 8 weeks) ──────────────
  async getNewUsersByWeek() {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true },
    });

    const weekMap: Record<string, number> = {};
    users.forEach((user) => {
      const date = new Date(user.createdAt);
      const weekNum = Math.floor(
        (Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      const label = `Week -${weekNum}`;
      weekMap[label] = (weekMap[label] || 0) + 1;
    });

    const result: { week: string; users: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const label = i === 0 ? 'This Week' : `${i}w ago`;
      result.push({
        week: label,
        users: weekMap[`Week -${i}`] || 0,
      });
    }

    return result;
  }

  // ── LOW STOCK PRODUCTS ─────────────────────────────
  async getLowStockProducts(threshold = 10) {
    return this.prisma.product.findMany({
      where: {
        stock: { lte: threshold },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        stock: true,
        images: true,
        category: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
      take: 10,
    });
  }

  // ── RECENT ORDERS ──────────────────────────────────
  async getRecentOrders(limit = 5) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, username: true, email: true } },
        items: {
          select: { productName: true, quantity: true },
          take: 1,
        },
      },
    });
  }

  // ── Most rated products ─────────────────────────────────
  async getMostRatedProducts(limit = 5) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      take: limit,
      select: {
        name: true,
        _count: { select: { reviews: true } },
      },
      // Order by relation count using relation name
      orderBy: { reviews: { _count: 'desc' } },
    });
    return products.map((p) => ({ ...p, count: p._count.reviews }));
  }
}
