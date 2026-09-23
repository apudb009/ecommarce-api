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
    const t0 = Date.now();
    try {
      const [wishlist] = await this.prisma.$transaction([
        this.prisma.wishlist.upsert({
          where: { userId },
          create: { userId },
          update: {},
          select: { id: true },
        }),
      ]);
      console.log('upsert took', Date.now() - t0, 'ms');
      const t1 = Date.now();
      const item = await this.prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, productId },
        select: { id: true },
      });
      console.log('create took', Date.now() - t1, 'ms');
      return { success: true, itemId: item.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Product already in wishlist');
        }
        if (error.code === 'P2003') {
          throw new BadRequestException('Product not found');
        }
      }
      throw error;
    }
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

    const result = await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Product not in wishlist');
    }

    return this.getOrCreate(userId);
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
