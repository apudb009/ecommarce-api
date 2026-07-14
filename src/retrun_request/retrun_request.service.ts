import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateReturnRequestDto } from './dto/create.return.request.dto';
import { OrderStatus, ReturnStatus } from 'src/generated/prisma/enums';
import { UpdateReturnRequestDto } from './dto/update.return.request.dto';

@Injectable()
export class RetrunRequestService {
  constructor(private prisma: PrismaService) {}

  // ── CREATE RETURN REQUEST ──────────────────────────
  async create(orderId: number, userId: number, dto: CreateReturnRequestDto) {
    //check for order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { returnRequest: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    if (order.returnRequest) {
      throw new ConflictException('Return request already exists');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order is not delivered');
    }

    return await this.prisma.returnRequest.create({
      data: {
        orderId,
        userId,
        ...dto,
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
    });
  }

  // ── GET MY RETURN REQUESTS ─────────────────────────
  async findMyRetrunRequests(userId: number) {
    return await this.prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            items: {
              select: {
                productName: true,
              },
              take: 1,
            },
          },
        },
      },
    });
  }

  // ── GET ONE ────────────────────────────────────────
  async findOne(id: number, userId: number, isAdmin = false) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            address: true,
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

    if (!returnRequest) {
      throw new NotFoundException('Return request not found.');
    }

    if (!isAdmin && returnRequest.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return returnRequest;
  }

  // ── GET ALL (admin) ────────────────────────────────
  async findAll(status?: ReturnStatus) {
    return this.prisma.returnRequest.findMany({
      where: { status: status || undefined },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  // ── UPDATE STATUS (admin) ──────────────────────────
  async updateStatus(id: number, dto: UpdateReturnRequestDto) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!request) {
      throw new NotFoundException('Return request not found');
    }

    if (dto.status === OrderStatus.REFUNDED) {
      await this.prisma.order.update({
        where: { id: request.orderId },
        data: { status: OrderStatus.REFUNDED },
      });
    }

    return await this.prisma.returnRequest.update({
      where: { id },
      data: { ...dto },
    });
  }
}
