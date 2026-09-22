import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  // ── GET OR CREATE ──────────────────────────────────
  async getOrCreate(userId: number) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      select: this.wishlistSelect(),
    });

    if (!wishlist) {
      return this.prisma.wishlist.create({
        data: { userId },
        select: this.wishlistSelect(),
      });
    }
    return wishlist;
  }

  // ── ADD ITEM ───────────────────────────────────────
  async addItem(userId: number, productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const wishlist = await this.prisma.wishlist.upsert({
      where: {
        userId,
      },
      create: { userId },
      update: {},
      select: { id: true },
    });

    try {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: product.id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Product already in wishlist');
      }
      throw error;
    }

    return this.getOrCreate(userId);
  }

  // ── REMOVE ITEM ────────────────────────────────────
  async removeItem(userId: number, productId: number) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: {
        userId,
      },
      select: { id: true },
    });

    if (!wishlist) {
      throw new BadRequestException('Product not in wishlist');
    }

    const result = await this.prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (!result) {
      throw new BadRequestException('Product not in wishlist');
    }

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
    const productExist = await this.prisma.wishlistItem.findFirst({
      where: {
        productId,
        wishlist: { userId },
      },
      select: { id: true },
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

  private wishlistSelect() {
    return {
      id: true,
      items: {
        select: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              variants: {
                select: {
                  id: true,
                },
              },
              images: {
                select: {
                  url: true,
                  isMain: true,
                },
              },
              isActive: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' as const },
      },
    };
  }
}
