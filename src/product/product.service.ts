import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { ProductWhereInput } from 'src/generated/prisma/models/Product';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private category: CategoryService,
  ) {}

  // ── CREATE ─────────────────────────────────────────
  async create(dto: CreateProductDto) {
    //check category existance
    await this.category.findOne(dto.categoryId);

    //check product slug existance
    const productSlugExist = await this.prisma.product.findFirst({
      where: {
        slug: dto.slug,
      },
    });

    if (productSlugExist) {
      throw new ConflictException('Product already exist');
    }
    return await this.prisma.product.create({
      data: {
        ...dto,
        images: dto.images ?? [],
        isActive: dto.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ── GET ALL (with search, filter, pagination) ──────
  async findAll(fiterDto: FilterProductDto) {
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
    } = fiterDto;

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
    const productsWithAvgRating = await Promise.all(
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
    );

    return {
      products: productsWithAvgRating,
      total,
      page,
      limit,
      lastPage: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }

  // ── GET ONE BY SLUG ────────────────────────────────
  async findOneBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    //For inactive product
    if (!product.isActive) {
      throw new NotFoundException('Product not found');
    }

    // calculate average rating
    const avgRating = await this.prisma.review.aggregate({
      _avg: { rating: true },
      where: { productId: product.id },
    });

    return {
      ...product,
      avgRating: avgRating._avg.rating
        ? Number(avgRating._avg.rating.toFixed(1))
        : null,
    };
  }

  // ── GET ONE BY ID (internal use) ───────────────────
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, dto: UpdateProductDto) {
    //Check product existance
    await this.findOne(id);
    //check category existance
    if (dto.categoryId) {
      await this.category.findOne(dto.categoryId);
    }
    return await this.prisma.product.update({
      where: {
        id,
      },
      data: dto,
      include: {
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    //Check product existance
    await this.findOne(id);

    return await this.prisma.product.delete({
      where: {
        id,
      },
    });
  }

  // ── ADJUST STOCK ───────────────────────────────────
  // called internally by order service
  async adjustStock(productId: number, quantity: number) {
    const product = await this.findOne(productId);

    if (product.stock + quantity < 0) {
      throw new ConflictException(
        `Insufficient stock for product "${product.name}". Available: ${product.stock}`,
      );
    }

    return await this.prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: {
          increment: quantity, // If quantity is negative, stock will be decremented
        },
      },
    });
  }
}
