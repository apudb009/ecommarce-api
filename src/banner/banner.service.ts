import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Public } from 'src/auth/constants';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class BannerService {
  constructor(private prisma: PrismaService) {}

  // ── CREATE ─────────────────────────────────────────
  async create(dto: CreateBannerDto) {
    return await this.prisma.banner.create({
      data: dto,
    });
  }

  // ── GET ALL ACTIVE (public) ────────────────────────
  @Public()
  async findAllActive() {
    return await this.prisma.banner.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        position: 'asc',
      },
    });
  }

  // ── GET ALL (admin) ────────────────────────────────
  async findAll() {
    return this.prisma.banner.findMany({
      select: {
        id: true,
        title: true,
        position: true,
        subtitle: true,
        image: true,
        isActive: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  // ── GET ONE ───────────────────────────────────────
  async findOne(id: number) {
    const banner = await this.prisma.banner.findUnique({
      where: {
        id,
      },
    });

    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  // ── UPDATE ─────────────────────────────────────────
  async update(id: number, updateBannerDto: UpdateBannerDto) {
    await this.findOne(id); // Check if banner exists
    return await this.prisma.banner.update({
      where: {
        id,
      },
      data: updateBannerDto,
    });
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    return await this.prisma.banner.delete({
      where: {
        id,
      },
    });
  }

  // ── REORDER ────────────────────────────────────────
  async reorder(id: number, position: number) {
    await this.findOne(id);
    return this.prisma.banner.update({
      where: { id },
      data: { position },
    });
  }
}
