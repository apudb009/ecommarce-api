import { ConflictException, Injectable } from '@nestjs/common';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { PrismaService } from 'src/prisma.service';
import { FilterNewsletterDto } from './dto/filter-newsletter.dto';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNewsletterDto) {
    //check for email exists
    const emailExists = await this.prisma.newsletter.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    return await this.prisma.newsletter.create({
      data: dto,
    });
  }

  async findAll(dto: FilterNewsletterDto) {
    const {
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = dto;

    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        email: { contains: search, mode: QueryMode.insensitive },
      }),
      ...(isActive !== undefined && { isActive }),
    };

    const [newsletters, total] = await Promise.all([
      this.prisma.newsletter.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.newsletter.count({ where }),
    ]);
    return {
      data: newsletters,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        hasNextPage: total > page * limit,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: number) {
    return await this.prisma.newsletter.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: number, dto: UpdateNewsletterDto) {
    return await this.prisma.newsletter.update({
      where: {
        id,
      },
      data: {
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: number) {
    return await this.prisma.newsletter.delete({
      where: {
        id,
      },
    });
  }
}
