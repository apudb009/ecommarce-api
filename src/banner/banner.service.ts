import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Public } from 'src/auth/constants';
import { PrismaService } from 'src/prisma.service';
import { CacheKeys, CacheTags, CacheTTL } from 'src/common/cache/cache-keys';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class BannerService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  // ── CREATE ─────────────────────────────────────────
  async create(dto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({
      data: dto,
    });
    this.cache.deleteByTag(CacheTags.BANNERS);
    return banner;
  }

  // ── GET ALL ACTIVE (public) ────────────────────────
  @Public()
  async findAllActive() {
    const key = CacheKeys.BANNERS_ACTIVE;
    return this.cache.getOrSet(
      key,
      async () =>
        await this.prisma.banner.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            position: 'asc',
          },
        }),
      CacheTTL.LONG,
      [CacheTags.BANNERS],
    );
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
    const banner = await this.prisma.banner.update({
      where: {
        id,
      },
      data: updateBannerDto,
    });
    this.cache.deleteByTag(CacheTags.BANNERS);
    return banner;
  }

  // ── DELETE ─────────────────────────────────────────
  async remove(id: number) {
    const banner = await this.prisma.banner.delete({
      where: {
        id,
      },
    });

    this.cache.deleteByTag(CacheTags.BANNERS);
    return banner;
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
