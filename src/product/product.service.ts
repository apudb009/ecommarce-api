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
import { ProductHelper } from 'src/common/helpers/product.helper';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private category: CategoryService,
    private helper: ProductHelper,
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
    const productsWithMeta = await this.helper.getAllProductsWithMeta(fiterDto);

    return productsWithMeta;
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

    console.log(dto);
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

  // ── HOT PRODUCTS (newest + high rated) ────────────
  async getHotProducts(limit = 10) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' }, // newest first
    });

    return await this.helper.withAvgRating(products);
  }

  // ── BEST SELLERS (most ordered) ────────────────────
  async getBestSellers(limit = 10) {
    // get product ids ordered by how many times they appear in orders
    const bestSellers = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    if (bestSellers.length === 0) {
      return await this.getHotProducts(limit);
    }

    const productIds = bestSellers.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        stock: { gt: 0 },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
    });

    const sorted = productIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    return await this.helper.withAvgRating(sorted as typeof products);
  }
}
