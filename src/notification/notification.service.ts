import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PrismaService } from 'src/prisma.service';
import { NotificationType } from 'src/generated/prisma/enums';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // ── CREATE ─────────────────────────────────────────
  async create(dto: CreateNotificationDto, userId: number) {
    return await this.prisma.notification.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  // ── GET MY NOTIFICATIONS ───────────────────────────
  async getMyNotifications(userId: number) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }

  // ── MARK AS READ ───────────────────────────────────
  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  // ── MARK SELECTED AS READ ───────────────────────────────────
  async markSelectedAsRead(ids: number[], userId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { id: { in: ids }, userId },
    });

    if (notifications.length !== ids.length) {
      throw new NotFoundException('Notification not found');
    }

    return await this.prisma.notification.updateMany({
      where: { id: { in: ids }, userId },
      data: { isRead: true },
    });
  }

  // ── MARK ALL AS READ ─────────────────────────────────────────
  async markAllAsRead(userId: number) {
    return await this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async delete(id: number, userId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return await this.prisma.notification.delete({
      where: { id, userId },
    });
  }

  // ── NOTIFY ORDER UPDATE (called from order service) ─
  async notifyOrderUpdate(userId: number, orderId: number, status: string) {
    const messages: Record<string, { title: string; message: string }> = {
      PAID: {
        title: 'Payment Confirmed ✅',
        message: `Order #${orderId} payment confirmed.`,
      },
      PROCESSING: {
        title: 'Order Processing 📦',
        message: `Order #${orderId} is being prepared.`,
      },
      SHIPPED: {
        title: 'Order Shipped 🚚',
        message: `Order #${orderId} is on its way!`,
      },
      DELIVERED: {
        title: 'Order Delivered 🎉',
        message: `Order #${orderId} has been delivered.`,
      },
      CANCELLED: {
        title: 'Order Cancelled ❌',
        message: `Order #${orderId} has been cancelled.`,
      },
    };

    const info = messages[status];
    if (!info) return;

    const createDTO: CreateNotificationDto = {
      type: NotificationType.ORDER_PLACED,
      title: info.title,
      message: info.message,
      link: `/orders/${orderId}`,
    };

    return await this.create(createDTO, userId);
  }

  // ── NOTIFY PROMO (admin sends to all users) ─────────
  async notifyPromoToAllUsers(title: string, message: string, link?: string) {
    const users = await this.prisma.user.findMany({ select: { id: true } });

    const createDTO: CreateNotificationDto = {
      type: NotificationType.PROMO,
      title,
      message,
      link,
    };

    return await this.prisma.notification.createMany({
      data: users.map((user) => ({ ...createDTO, userId: user.id })),
    });
  }

  // ── FIND ALL ─
  async findAll(filter: FilterNotificationDto) {
    const {
      page = 1,
      limit = 10,
      type,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      ...(search && {
        OR: [
          { id: isNaN(Number(search)) ? undefined : Number(search) },
          { title: { contains: search, mode: QueryMode.insensitive } },
          { message: { contains: search, mode: QueryMode.insensitive } },
        ].filter(Boolean),
      }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          //link: true,
          createdAt: true,
          isRead: true,
          user: {
            select: { name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        hasNextPage: total > page * limit,
        hasPrevPage: page > 1,
      },
    };
  }
}
