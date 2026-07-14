import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { ProductWhereInput } from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma.service';
import { FilterProductDto } from 'src/product/dto/filter-product.dto';

@Injectable()
export class ProductHelper {
  constructor(private prisma: PrismaService) {}
  async getAllProductsWithMeta(filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 12,
      search,
      minPrice,
      maxPrice,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      categoryId,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: ProductWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(minPrice && { price: { gte: minPrice } }),
      ...(maxPrice && { price: { lte: maxPrice } }),
      ...(inStock && { stock: { gt: 0 } }),
      ...(categoryId && { categoryId }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { select: { url: true, id: true, isMain: true } },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
      }),
      this.prisma.product.count({
        where,
      }),
    ]);

    // calculate average rating for each product
    const productsWithAvgRating = await this.withAvgRating(products);

    /*await Promise.all(
      products.map(async (product) => {
        const avgRating = await this.prisma.review.aggregate({
          _avg: { rating: true },
          where: { productId: product.id },
        });
        return {
          ...product,
          avgRating: avgRating._avg.rating,
        };
      }),
    );*/

    return {
      data: productsWithAvgRating,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async withAvgRating(
    products: Prisma.ProductGetPayload<{
      include: {
        category: { select: { id: true; name: true; slug: true } };
        _count: { select: { reviews: true } };
      };
    }>[],
  ) {
    return Promise.all(
      products.map(async (product) => {
        const avg = await this.prisma.review.aggregate({
          _avg: { rating: true },
          where: { productId: product.id },
        });
        return {
          ...product,
          avgRating: avg._avg.rating
            ? Number(avg._avg.rating.toFixed(1))
            : null,
        };
      }),
    );
  }
}
