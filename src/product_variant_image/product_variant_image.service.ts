import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AddImageVariantDto } from './dto/add.image.variant.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ProductVariantImageService {
  constructor(private prisma: PrismaService) {}

  async addImages(dto: AddImageVariantDto, tx?: Prisma.TransactionClient) {
    const prisma = tx ?? this.prisma;

    return await prisma.variantImage.createMany({
      data: dto.url.map((url, index) => ({
        url,
        isMain: index === 0,
        order: index,
        variantId: dto.variantId,
      })),
    });
  }

  async getImages(variantId: number) {
    return await this.prisma.variantImage.findMany({
      where: {
        variantId,
      },
    });
  }

  async updateImages(dto: AddImageVariantDto, tx?: Prisma.TransactionClient) {
    const { variantId } = dto;
    await this.deleteImages(variantId);
    return await this.addImages(dto, tx);
  }

  async getMainImage(variantId: number) {
    return await this.prisma.variantImage.findFirst({
      where: {
        variantId,
        isMain: true,
      },
    });
  }

  async setMainImage(variantImageId: number, variantId: number) {
    await this.prisma.variantImage.updateMany({
      where: {
        isMain: true,
        variantId,
      },
      data: {
        isMain: false,
      },
    });
    return await this.prisma.variantImage.update({
      where: {
        id: variantImageId,
      },
      data: {
        isMain: true,
      },
    });
  }

  async deleteImage(variantImageId: number) {
    return await this.prisma.variantImage.delete({
      where: {
        id: variantImageId,
      },
    });
  }

  async deleteImages(variantId: number, tx?: Prisma.TransactionClient) {
    const prisma = tx ?? this.prisma;
    return await prisma.variantImage.deleteMany({
      where: {
        variantId,
      },
    });
  }
}
