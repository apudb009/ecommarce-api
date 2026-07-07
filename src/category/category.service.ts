import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { FilterProductDto } from 'src/product/dto/filter-product.dto';
import { ProductHelper } from 'src/common/helpers/product.helper';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private helper: ProductHelper,
  ) {}

  // ── CREATE ─────────────────────────────────────────
  async create(createCategoryDto: CreateCategoryDto) {
    //Check for existance
    const categoryExist = await this.prisma.category.findFirst({
      where: {
        OR: [{ name: createCategoryDto.name, slug: createCategoryDto.slug }],
      },
    });

    if (categoryExist) {
      throw new ConflictException('Category already exist');
    }
    return await this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  // ── GET ALL ────────────────────────────────────────
  async findAll() {
    return await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // ── GET ONE BY SLUG ────────────────────────────────
  async findOneBySlug(slug: string, filterDto: FilterProductDto) {
    const category = await this.prisma.category.findFirst({
      where: {
        slug,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    filterDto.categoryId = category.id;

    const products = await this.helper.getAllProductsWithMeta(filterDto);
    return {
      data: category,
      products,
    };
  }

  // ── GET ONE BY ID ──────────────────────────────────
  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return await this.prisma.category.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    await this.findOne(id);

    //Check category has products
    const categoryProductCount = await this.prisma.product.count({
      where: {
        categoryId: id,
      },
    });

    if (categoryProductCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${categoryProductCount} products. Move or delete products first.`,
      );
    }

    return await this.prisma.category.delete({
      where: {
        id,
      },
    });
  }
}
