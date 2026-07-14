import { ConflictException, Injectable } from '@nestjs/common';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { PrismaService } from 'src/prisma.service';

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

  async findAll() {
    return await this.prisma.newsletter.findMany();
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
