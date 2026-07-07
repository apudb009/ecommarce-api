import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  // ── GET OR CREATE ──────────────────────────────────
  async getOrCreate(userId: number) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: this.wishlistInclude(),
    });

    if (!wishlist) {
      return this.prisma.wishlist.create({
        data: { userId },
        include: this.wishlistInclude(),
      });
    }
    return wishlist;
  }

  // ── ADD ITEM ───────────────────────────────────────
  async addItem(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const wishlist = await this.getOrCreate(userId);

    const productExist = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (productExist) {
      throw new BadRequestException('Product already in wishlist');
    }

    await this.prisma.wishlistItem.create({
      data: {
        wishlist: { connect: { userId } },
        product: { connect: { id: productId } },
      },
    });

    return await this.getOrCreate(userId);
  }

  // ── REMOVE ITEM ────────────────────────────────────
  async removeItem(userId: number, productId: number) {
    const wishlist = await this.getOrCreate(userId);

    const productExist = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!productExist) {
      throw new BadRequestException('Product not in wishlist');
    }

    await this.prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return await this.getOrCreate(userId);
  }

  // ── CLEAR ──────────────────────────────────────────
  async clear(userId: number) {
    await this.prisma.wishlistItem.deleteMany({
      where: { wishlist: { userId } },
    });
    return { message: 'Wishlist cleared' };
  }

  // ── CHECK IF PRODUCT IN WISHLIST ───────────────────
  async isInWishlist(userId: number, productId: number) {
    const wishlist = await this.getOrCreate(userId);
    const productExist = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });
    return !!productExist;
  }

  // ── HELPER ─────────────────────────────────────────
  private wishlistInclude() {
    return {
      items: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
              _count: { select: { reviews: true } },
            },
          },
        },
        orderBy: { addedAt: 'desc' as const },
      },
    };
  }
}
