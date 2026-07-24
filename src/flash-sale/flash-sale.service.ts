import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { PrismaService } from 'src/prisma.service';
import { DiscountType } from 'src/generated/prisma/enums';

@Injectable()
export class FlashSaleService {
  constructor(private prisma: PrismaService) {}

  // ── CREATE ─────────────────────────────────────────
  async create(dto: CreateFlashSaleDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime > endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    return await this.prisma.flashSale.create({
      data: {
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startTime: startTime,
        endTime: endTime,
        isActive: dto.isActive,
        bannerColor: dto.bannerColor,
        products: {
          create: dto?.productIds?.map((id) => ({ productId: id })),
        },
      },
      include: this.flashSaleInclude(),
    });
  }

  // ── GET ALL (admin) ────────────────────────────────
  async findAll() {
    return await this.prisma.flashSale.findMany({
      include: this.flashSaleInclude(),
      orderBy: { startTime: 'desc' },
    });
  }

  // ── GET ACTIVE (public) ────────────────────────────
  async findActive() {
    const now = new Date();
    return await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        endTime: { gte: now },
        startTime: { lte: now },
      },
      include: this.flashSaleInclude(),
      orderBy: { endTime: 'asc' },
    });
  }

  // ── GET UPCOMING (public) ──────────────────────────
  async findUpcoming() {
    const now = new Date();
    return await this.prisma.flashSale.findMany({
      where: {
        isActive: true,
        startTime: { gt: now },
      },
      include: this.flashSaleInclude(),
      orderBy: { startTime: 'asc' },
      take: 5,
    });
  }

  // ── GET ONE ────────────────────────────────────────
  async findOne(id: number) {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: this.flashSaleInclude(),
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }
    return flashSale;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, dto: UpdateFlashSaleDto) {
    if (dto.startTime && dto.endTime) {
      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);

      if (startTime >= endTime) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    return await this.prisma.flashSale.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
        isActive: dto.isActive,
        bannerColor: dto.bannerColor,
        products: {
          deleteMany: {},
          create: dto?.productIds?.map((id) => ({ productId: id })),
        },
      },
      include: this.flashSaleInclude(),
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    return await this.prisma.flashSale.delete({
      where: { id },
    });
  }

  // ── ADD PRODUCTS ───────────────────────────────────
  async addProducts(id: number, productIds: number[]) {
    await this.findOne(id);
    await this.prisma.flashSaleProduct.createMany({
      data: productIds.map((productId) => ({ flashSaleId: id, productId })),
      skipDuplicates: true,
    });

    return await this.findOne(id);
  }

  // ── REMOVE PRODUCT ─────────────────────────────────
  async removeProduct(id: number, productId: number) {
    await this.findOne(id);
    await this.prisma.flashSaleProduct.delete({
      where: {
        flashSaleId_productId: {
          flashSaleId: id,
          productId,
        },
      },
    });

    return await this.findOne(id);
  }

  // ── GET FLASH PRICE + SALE INFO ────────────────────
  async getFlashPriceInfo(productId: number): Promise<{
    price: number;
    saleId: number;
    saleName: string;
    discountType: string;
    discountValue: number;
    endTime: Date;
  } | null> {
    const now = new Date();

    const sale = await this.prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
        products: { some: { productId } },
      },
    });

    if (!sale) return null;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { price: true },
    });

    if (!product) return null;

    const original = Number(product.price);
    const value = Number(sale.discountValue);

    const price =
      sale.discountType === 'PERCENTAGE'
        ? Number((original - (original * value) / 100).toFixed(2))
        : Math.max(0, original - value);

    return {
      price,
      saleId: sale.id,
      saleName: sale.name,
      discountType: sale.discountType,
      discountValue: value,
      endTime: sale.endTime,
    };
  }

  // ── GET FLASH PRICE (used in cart/order) ───────────
  async getFlashPrice(productId: number): Promise<number | null> {
    const now = new Date();

    const sale = await this.prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
        products: { some: { productId } },
      },
    });

    if (!sale) return null;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { price: true },
    });

    if (!product) return null;

    const original = Number(product.price);

    if (sale.discountType === DiscountType.PERCENTAGE) {
      return Number(
        (original - (original * Number(sale.discountValue)) / 100).toFixed(2),
      );
    }

    return Math.max(0, original - Number(sale.discountValue));
  }

  // ── HELPER ─────────────────────────────────────────
  private flashSaleInclude() {
    return {
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
              isActive: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    };
  }
}
