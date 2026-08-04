import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { ProductWhereInput } from 'src/generated/prisma/models';
import { PrismaService } from 'src/prisma.service';
import { FilterProductDto } from 'src/product/dto/filter-product.dto';

@Injectable()
export class ProductHelper {
  constructor(private prisma: PrismaService) {}

  async getAllProductsAdminWithMeta(filterDto: FilterProductDto) {
    const {
      page = 1,
      limit = 12,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: ProductWhereInput = {
      ...(status !== undefined && { isActive: status ?? true }), // isActive,
      // ── full text search ──────────────────────────
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          // search in category name
          {
            category: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          // search in variant values
          {
            variants: {
              some: {
                value: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          name: true,
          //slug: true,
          //description: true,
          price: true,
          stock: true,
          isActive: true,
          images: { select: { url: true, isMain: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      data: products,
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
      categorySlug,
      variantName,
      variantValues,
      colors,
      minRating,
      status,
    } = filterDto;

    const skip = (page - 1) * limit;

    // ── resolve category by slug if provided ────────
    let resolvedCategoryId = categoryId;

    if (categorySlug && !categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { slug: categorySlug },
        select: { id: true },
      });
      resolvedCategoryId = category?.id;
    }

    const where: ProductWhereInput = {
      ...(status !== undefined && { isActive: status ?? true }), // isActive,
      // ── full text search ──────────────────────────
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          // search in category name
          {
            category: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          // search in variant values
          {
            variants: {
              some: {
                value: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
      // ── price range ───────────────────────────────
      ...(minPrice !== undefined &&
        maxPrice !== undefined && {
          price: { gte: minPrice, lte: maxPrice },
        }),
      ...(minPrice !== undefined &&
        maxPrice === undefined && {
          price: { gte: minPrice },
        }),
      ...(maxPrice !== undefined &&
        minPrice === undefined && {
          price: { lte: maxPrice },
        }),
      ...(resolvedCategoryId && { categoryId: resolvedCategoryId }),

      // ── in stock ──────────────────────────────────
      ...(inStock && { stock: { gt: 0 } }),

      // ── variant filters ───────────────────────────
      ...((variantValues?.length || colors?.length || variantName) && {
        variants: {
          some: {
            isActive: true,
            ...(variantName && {
              name: { equals: variantName, mode: 'insensitive' },
            }),
            ...(variantValues?.length && {
              value: { in: variantValues, mode: 'insensitive' },
            }),
            ...(colors?.length && {
              color: { in: colors },
            }),
          },
        },
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          stock: true,
          isActive: true,
          images: { select: { url: true, isMain: true, id: true } },
          category: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            orderBy: { id: 'asc' },
            select: {
              id: true,
              name: true,
              value: true,
              color: true,
              isActive: true,
              price: true,
              stock: true,
            },
          },
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
    const productsWithAvgRating = await this.withAvgRating(products, minRating);

    return {
      data: productsWithAvgRating,
      meta: {
        total: minRating ? productsWithAvgRating.length : total,
        page,
        limit,
        lastPage: Math.ceil(
          (minRating ? productsWithAvgRating.length : total) / limit,
        ),
        hasNextPage:
          page <
          Math.ceil((minRating ? productsWithAvgRating.length : total) / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async withAvgRating(
    products: Prisma.ProductGetPayload<{
      select: {
        id: true;
        name: true;
        slug: true;
        description: true;
        price: true;
        stock: true;
        isActive: true;
        images: { select: { url: true; isMain: true; id: true } };
        category: { select: { id: true; name: true; slug: true } };
        _count: { select: { reviews: true } };
      };
    }>[],
    minRating?: number,
  ) {
    const productsWithAvgRating = await Promise.all(
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

    // ── apply rating filter (post-query) ─────────────
    const filtered = minRating
      ? productsWithAvgRating.filter(
          (p) => p.avgRating !== null && p.avgRating >= minRating,
        )
      : productsWithAvgRating;

    return filtered;
  }

  // ── GET AVAILABLE FILTERS FOR CURRENT RESULTS ─────
  async getAvailableFilters(categoryId?: number) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(categoryId && { categoryId }),
    };

    const [priceRange, variantGroups, categories] = await Promise.all([
      // price range
      this.prisma.product.aggregate({
        where,
        _min: { price: true },
        _max: { price: true },
      }),

      // available variant names + values
      this.prisma.productVariant.findMany({
        where: {
          isActive: true,
          product: { isActive: true, ...where },
        },
        select: {
          name: true,
          value: true,
          color: true,
        },
        distinct: ['name', 'value'],
        orderBy: [{ name: 'asc' }, { value: 'asc' }],
      }),

      // all categories with product count
      this.prisma.category.findMany({
        include: {
          _count: {
            select: { products: { where: { isActive: true } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // group variants by name
    const variantMap: Record<string, { values: string[]; colors: string[] }> =
      {};
    variantGroups.forEach((v) => {
      if (!variantMap[v.name]) {
        variantMap[v.name] = { values: [], colors: [] };
      }
      if (!variantMap[v.name].values.includes(v.value)) {
        variantMap[v.name].values.push(v.value);
      }
      if (v.color && !variantMap[v.name].colors.includes(v.color)) {
        variantMap[v.name].colors.push(v.color);
      }
    });

    return {
      priceRange: {
        min: Number(priceRange._min.price || 0),
        max: Number(priceRange._max.price || 1000),
      },
      variants: variantMap,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
      })),
    };
  }
}
