import { Injectable } from '@nestjs/common';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { PrismaService } from 'src/prisma.service';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}
  async create(dto: CreateShippingDto) {
    if (dto.isActive) {
      await this.prisma.shipping.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    return await this.prisma.shipping.create({ data: dto });
  }

  async findAll() {
    return await this.prisma.shipping.findMany({
      select: { id: true, name: true, price: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActive() {
    return this.cache.getOrSet(
      'shipping:active',
      () => this.prisma.shipping.findFirst({ where: { isActive: true } }),
      300, // 5 min cache
    );
  }

  async findOne(id: number) {
    return await this.prisma.shipping.findUnique({ where: { id } });
  }

  async update(id: number, dto: UpdateShippingDto) {
    return await this.prisma.shipping.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return await this.prisma.shipping.delete({ where: { id } });
  }
}
