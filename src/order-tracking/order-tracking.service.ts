import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma.service';

// default messages for each status transition
const STATUS_MESSAGES: Record<string, { message: string; location?: string }> =
  {
    PENDING: {
      message: 'Order placed successfully. Awaiting payment.',
    },
    PAID: {
      message: 'Payment confirmed. Your order is being reviewed.',
    },
    PROCESSING: {
      message: 'Order is being prepared and packed at our warehouse.',
      location: 'Warehouse',
    },
    SHIPPED: {
      message: 'Order has been handed to the courier and is on its way.',
      location: 'In Transit',
    },
    DELIVERED: {
      message: 'Order delivered successfully. Enjoy your purchase!',
    },
    CANCELLED: {
      message: 'Order has been cancelled. Stock has been restored.',
    },
    REFUNDED: {
      message:
        'Refund has been processed. Amount will reflect in 5-7 business days.',
    },
  };

@Injectable()
export class OrderTrackingService {
  constructor(private prisma: PrismaService) {}

  // ── ADD TRACKING EVENT ─────────────────────────────
  async addTrackingEvent(
    orderId: number,
    status: string,
    location?: string,
    message?: string,
  ) {
    const defaultInfo = STATUS_MESSAGES[status] ?? {
      message: `Status updated to ${status}`,
    };

    return await this.prisma.orderTracking.create({
      data: {
        status,
        message: message || defaultInfo.message,
        location: location || defaultInfo.location,
        orderId,
      },
    });
  }

  // ── GET TRACKING FOR ORDER ─────────────────────────
  async getTracking(orderId: number, userId: number, isAdmin = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tracking: {
          orderBy: { createdAt: 'asc' },
        },
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    // build full timeline including future steps
    const timeline = this.buildTimeline(order);

    return {
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      timeline,
      address: order.address,
    };
  }

  // ── UPDATE TRACKING NUMBER (admin) ─────────────────
  async updateTrackingNumber(orderId: number, trackingNumber: string) {
    return await this.prisma.order.update({
      where: { id: orderId },
      data: { trackingNumber },
    });
  }

  // ── BUILD TIMELINE ─────────────────────────────────
  private buildTimeline(
    order: Prisma.OrderGetPayload<{ include: { tracking: true } }>,
  ) {
    const STEPS = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    const isCancelled = order.status === 'CANCELLED';
    const isRefunded = order.status === 'REFUNDED';

    // for cancelled/refunded — show completed steps + terminal step
    if (isCancelled || isRefunded) {
      const events = order.tracking;

      // add terminal event if not already there
      const terminalStatus = isCancelled ? 'CANCELLED' : 'REFUNDED';
      const hasTerminal = events.some((e) => e.status === terminalStatus);

      return [
        ...events,
        ...(!hasTerminal
          ? [
              {
                id: -1,
                status: terminalStatus,
                message: STATUS_MESSAGES[terminalStatus].message,
                location: null,
                createdAt: new Date().toISOString(),
                isCurrent: true,
                isTerminal: true,
              },
            ]
          : []),
      ].map((e) => ({
        ...e,
        isCompleted: true,
        isCurrent: e.status === terminalStatus,
      }));
    }

    // normal flow — show all steps with completion status
    const currentIndex = STEPS.indexOf(order.status);
    const trackingMap = new Map(order.tracking.map((t) => [t.status, t]));

    return STEPS.map((step, index) => {
      const event = trackingMap.get(step);
      const isCompleted = index <= currentIndex;
      const isCurrent = step === order.status;

      return {
        id: event?.id || null,
        status: step,
        message: event?.message || STATUS_MESSAGES[step]?.message || '',
        location: event?.location || STATUS_MESSAGES[step]?.location || null,
        createdAt: event?.createdAt || null,
        isCompleted,
        isCurrent,
        isPending: !isCompleted,
      };
    });
  }
}
