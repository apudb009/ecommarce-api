import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddressService } from 'src/address/address.service';
import { CartService } from 'src/cart/cart.service';
import { PrismaService } from 'src/prisma.service';
import { ProductService } from 'src/product/product.service';
import {
  FormattedCart,
  FormattedCartItem,
} from 'src/cart/entities/cart.entity';
import { OrderStatus } from 'src/generated/prisma/enums';
import { FilterOrderDto } from './dto/filter-order.dto';
import { MailService } from 'src/mail/mail.service';
import { InvoiceService } from 'src/invoice/invoice.service';
import { CouponService } from 'src/coupon/coupon.service';
import { NotificationService } from 'src/notification/notification.service';
import { OrderTrackingService } from 'src/order-tracking/order-tracking.service';
import { FlashSaleService } from 'src/flash-sale/flash-sale.service';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cart: CartService,
    private product: ProductService,
    private address: AddressService,
    private mail: MailService,
    private invoice: InvoiceService,
    private coupon: CouponService,
    private notification: NotificationService,
    private orderTracking: OrderTrackingService,
    private flashSale: FlashSaleService,
  ) {}

  // ── PLACE ORDER FROM CART ──────────────────────────
  async create(userId: number, createOrderDto: CreateOrderDto) {
    //Get cart
    const cart = (await this.cart.getOrCreate(userId)) as FormattedCart;

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty!');
    }
    //Check address
    await this.address.findOne(createOrderDto.addressId, userId);

    // ── validate coupon if provided ──────────────────
    let discountAmount = 0;
    const finalAmount = cart.grandTotal;

    if (createOrderDto.couponCode) {
      const couponResult = await this.coupon.validate(
        createOrderDto.couponCode,
        userId,
        cart.totalAmount,
      );
      discountAmount = couponResult.discount;
    }

    //Check each product for stock and active
    for (const item of cart.items) {
      const product = await this.product.findOne(item.productId);
      if (!product.isActive) {
        throw new BadRequestException('Product is inactive');
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Only ${product.stock} items available in stock`,
        );
      }
    }

    const order = await this.prisma.$transaction(async (tx) => {
      //Create order
      const newOrder = await tx.order.create({
        data: {
          userId,
          addressId: createOrderDto.addressId,
          totalAmount: cart.totalAmount,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          grandTotalAmount: finalAmount,
          couponCode: createOrderDto.couponCode,
          notes: createOrderDto.notes,
          status: OrderStatus.PENDING,
          taxAmount: cart.taxAmount,
          shippingAmount: cart.shippingAmount,
          items: {
            create: cart.items.map((item: FormattedCartItem) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.product.price,
              total: item.subtotal,
              productName: item.product.name,
              variantId: item.variantId,
              salePrice: item.flashPrice ?? 0,
              flashSaleId: item.flashSaleId,
            })),
          },
        },
        include: this.getIncludes(),
      });
      //Update product stock + variant stock
      for (const item of cart.items) {
        await tx.product.update({
          where: {
            id: item.product.id,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (item.variantId) {
          await tx.productVariant.update({
            where: {
              id: item.variantId,
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return newOrder;
    });

    // ── mark coupon as used ───────────────────────────
    if (createOrderDto.couponCode) {
      await this.coupon.markAsUsed(createOrderDto.couponCode, userId, order.id);
    }

    //Clear cart
    await this.cart.clearCart(userId);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        name: true,
        username: true,
      },
    });

    // send confirmation email (fire and forget)
    this.mail
      .sendOrderConfirmation({
        to: user!.email,
        name: user!.name || user!.username,
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        address: {
          street: order.address.street,
          city: order.address.city,
          country: order.address.country,
          postalCode: order.address.postalCode,
        },
      })
      .catch(() => {});

    this.orderTracking
      .addTrackingEvent(order.id, OrderStatus.PENDING)
      .catch(() => {});

    // auto-create invoice after order
    await this.invoice.createFromOrder(order.id, userId);

    return order;
  }

  // ── GET MY ORDERS ──────────────────────────────────
  async getMyOrders(userId: number, filterDto: FilterOrderDto) {
    const { status, page = 1, limit = 10 } = filterDto;
    const skip = (page - 1) * limit;
    const where = {
      userId,
      ...(status && { status }),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: this.getIncludes(),
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
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

  // ── GET ONE ORDER ──────────────────────────────────
  async findOne(id: number, userId: number, isAdmin = false) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        userId: isAdmin ? undefined : userId,
      },
      include: this.getIncludes(),
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new BadRequestException('Access denied');
    }

    return order;
  }

  // ── CANCEL ORDER ───────────────────────────────────
  async cancel(id: number, userId: number) {
    const order = await this.findOne(id, userId);

    //Now only pending orders can be cancelled
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Cannot cancel delivered order');
    }

    this.validateStatusTransition(order.status, OrderStatus.CANCELLED);

    //Cancel order and update items stock
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
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

        //update variant stock
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
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    // fetch user for email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, username: true },
    });

    // send cancellation email
    this.mail
      .sendOrderCancelled({
        to: user!.email,
        name: user!.name || user!.username,
        orderId: id,
        totalAmount: Number(cancelledOrder.totalAmount),
      })
      .catch(() => {});

    return cancelledOrder;
  }

  // ── ADMIN — GET ALL ORDERS ─────────────────────────
  async findAll(filterDto: FilterOrderDto) {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;
    const skip = (page - 1) * limit;
    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { id: isNaN(Number(search)) ? undefined : Number(search) },
          {
            user: { email: { contains: search, mode: QueryMode.insensitive } },
          },
          { user: { name: { contains: search, mode: QueryMode.insensitive } } },
          {
            user: {
              username: { contains: search, mode: QueryMode.insensitive },
            },
          },
        ].filter(Boolean),
      }),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: this.getIncludes(),
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
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

  // ── ADMIN — UPDATE ORDER STATUS ────────────────────
  async updateStatus(id: number, updateOrderDto: UpdateOrderStatusDto) {
    const { status } = updateOrderDto;
    const order = await this.prisma.order.findUnique({
      where: {
        id,
      },
      include: this.getIncludes(),
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.validateStatusTransition(order.status, status);

    let updatedOrder: Awaited<ReturnType<typeof this.prisma.order.update>>;

    //Cancel order and update items stock
    if (status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED) {
      updatedOrder = await this.prisma.$transaction(async (tx) => {
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

          //update variant stock
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
        return tx.order.update({
          where: { id },
          data: { status },
          include: this.getIncludes(),
        });
      });
    } else {
      updatedOrder = await this.prisma.order.update({
        where: { id },
        data: { status },
        include: this.getIncludes(),
      });
    }

    // fetch user for email
    const user = await this.prisma.user.findUnique({
      where: { id: updatedOrder.userId },
      select: { email: true, name: true, username: true },
    });

    // send notification
    this.notification
      .notifyOrderUpdate(
        updatedOrder.userId,
        updatedOrder.id,
        updatedOrder.status,
      )
      .catch(() => {});

    // send status update email
    this.mail
      .sendOrderStatusUpdate({
        to: user!.email,
        name: user!.name || user!.username,
        orderId: id,
        status: status,
      })
      .catch(() => {});

    this.orderTracking
      .addTrackingEvent(
        id,
        status,
        updateOrderDto?.location,
        updateOrderDto?.trackingMessage,
      )
      .catch(() => {});

    return updatedOrder;
  }

  async getOrderCountByUserAddress(addressId: number) {
    const count = await this.prisma.order.count({
      where: {
        addressId,
      },
    });
    return count;
  }

  // ── Helper methods ─────────────────────────────
  private getIncludes() {
    return {
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          salePrice: true,
          unitPrice: true,
          total: true,
          productName: true,
          variantId: true,
          variant: {
            select: {
              id: true,
              name: true,
              value: true,
            },
          },
        },
      },
      address: true,
      payment: true,
      user: {
        select: {
          email: true,
          name: true,
          username: true,
        },
      },
    };
  }

  // ── HELPER — validate status flow ─────────────────
  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
      PAID: [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
      PROCESSING: [OrderStatus.SHIPPED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [], // final state
      CANCELLED: [], // final state
      REFUNDED: [], // final state
    };

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition order from "${current}" to "${next}". Allowed: ${allowed[current].join(', ') || 'none'}`,
      );
    }
  }
}
