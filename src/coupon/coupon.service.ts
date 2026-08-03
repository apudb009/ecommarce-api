import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaService } from 'src/prisma.service';
import { CouponType, Prisma } from 'src/generated/prisma/client';
import { FilterCouponDto } from './dto/filter-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  // ── CREATE ─────────────────────────────────────────
  async create(createCouponDto: CreateCouponDto) {
    const existingCoupon = await this.prisma.coupon.findUnique({
      where: { code: createCouponDto.code.toUpperCase() },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists');
    }

    return await this.prisma.coupon.create({
      data: {
        ...createCouponDto,
        code: createCouponDto.code.toUpperCase(),
        expiresAt: createCouponDto.expiresAt
          ? new Date(createCouponDto.expiresAt)
          : undefined,
      },
    });
  }

  // ── GET ALL (admin) ────────────────────────────────
  async findAll(dto: FilterCouponDto) {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;

    const skip = (page - 1) * limit;

    const where = {
      ...(status !== undefined && { isActive: status }),
      ...(search && {
        code: { contains: search, mode: Prisma.QueryMode.insensitive },
      }),
    };

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
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

  // ── GET ONE ────────────────────────────────────────
  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { uses: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, updateCouponDto: UpdateCouponDto) {
    await this.findOne(id); // Check if coupon exists
    return await this.prisma.coupon.update({
      where: { id },
      data: {
        ...updateCouponDto,
        expiresAt: updateCouponDto.expiresAt
          ? new Date(updateCouponDto.expiresAt)
          : undefined,
        code: updateCouponDto.code?.toUpperCase(),
      },
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    return await this.prisma.coupon.delete({
      where: { id },
    });
  }

  // ── VALIDATE COUPON (used by cart/checkout) ────────
  async validate(code: string, userId: number, orderAmount: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        uses: {
          where: { userId },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon has reached its maximum uses');
    }

    if (coupon.perUserLimit && coupon.uses.length >= coupon.perUserLimit) {
      throw new BadRequestException(
        'You have reached the maximum uses for this coupon',
      );
    }

    // check min order amount
    if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Minimum order amount of $${Number(coupon.minOrderAmount).toFixed(2)} required`,
      );
    }

    const discount = this.calculateDiscount(coupon, orderAmount);

    return {
      coupon,
      discount,
      finalAmount: Number((orderAmount - discount).toFixed(2)),
    };
  }

  // ── CALCULATE DISCOUNT ─────────────────────────────
  calculateDiscount(
    coupon: Prisma.CouponGetPayload<{ include: { uses: true } }>,
    orderAmount: number,
  ): number {
    if (coupon.type === CouponType.PERCENTAGE) {
      return Number(((orderAmount * Number(coupon.value)) / 100).toFixed(2));
    }
    // FIXED — can't discount more than order amount
    return Math.min(Number(coupon.value), orderAmount);
  }

  // ── MARK AS USED (called after order placed) ───────
  async markAsUsed(code: string, userId: number, orderId: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) return;

    await Promise.all([
      // create use record
      this.prisma.couponUse.create({
        data: { couponId: coupon.id, userId, orderId },
      }),
      // increment used count
      this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }
}
