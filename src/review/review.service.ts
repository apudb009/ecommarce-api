import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma.service';
import { OrderService } from 'src/order/order.service';
import { ProductService } from 'src/product/product.service';
import { FilterReviewDto } from './dto/filter-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private order: OrderService,
    private product: ProductService,
  ) {}

  // ── CREATE ─────────────────────────────────────────
  async create(
    createReviewDto: CreateReviewDto,
    productId: number,
    userId: number,
  ) {
    //1. Check product existance
    await this.product.findOne(productId);

    // 2. check user actually purchased this product
    const isVerified = await this.verifyPurchased(userId, productId);

    if (!isVerified) {
      throw new BadRequestException('User did not purchase this product');
    }

    // 3. check not already reviewed
    const reviewExist = await this.prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
    });

    if (reviewExist) {
      throw new BadRequestException('User already reviewed this product');
    }

    //Now add review
    return await this.prisma.review.create({
      data: {
        ...createReviewDto,
        product: {
          connect: {
            id: productId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  // ── GET ALL REVIEWS FOR A PRODUCT ──────────────────
  async findAll(productId: number, dto: FilterReviewDto) {
    //Check product existance
    await this.product.findOne(productId);

    const { page = 1, limit = 10, rating } = dto;
    const skip = (page - 1) * limit;

    const where = {
      productId,
      ...(rating && { rating }),
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    // calculate rating summary
    const summary = await this.prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
      },
      _count: {
        rating: true,
      },
    });

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    summary.forEach((item) => {
      ratingBreakdown[item.rating] = item._count.rating;
    });

    const avgRating = await this.prisma.review.aggregate({
      where: {
        productId,
      },
      _avg: {
        rating: true,
      },
    });

    return {
      data: reviews,
      summary: {
        totalReviews: total,
        averageRating: avgRating._avg.rating
          ? Number(avgRating._avg.rating.toFixed(1))
          : null,
        ratingBreakdown,
      },
      meta: {
        page,
        limit,
        total,
        lastPage: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  // ── GET MY REVIEW FOR A PRODUCT ────────────────────
  async findOne(userId: number, productId: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, userId: number, updateReviewDto: UpdateReviewDto) {
    const review = await this.getReviewOrThrow(id);

    // Chcek user is owner of this review
    if (review.userId !== userId) {
      throw new ForbiddenException('User is not owner of this review');
    }
    return await this.prisma.review.update({
      where: {
        id,
      },
      data: updateReviewDto,
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number, userId: number, isAdmin = false) {
    const review = await this.getReviewOrThrow(id);

    // Chcek user is owner of this review
    if (review.userId !== userId && !isAdmin) {
      throw new ForbiddenException('User is not owner of this review');
    }
    return await this.prisma.review.delete({
      where: {
        id,
      },
    });
  }

  // ── GET MY REVIEWS (all products I reviewed) ───────
  async getMyReviews(userId: number) {
    return await this.prisma.review.findMany({
      where: {
        userId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    });
  }
  // ── HELPER — verify user purchased product ─────────
  private async verifyPurchased(userId: number, productId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        items: {
          some: {
            productId,
          },
        },
      },
    });

    return !!order;
  }

  private async getReviewOrThrow(id: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        id,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }
}
