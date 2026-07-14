import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ProductImageService {
  constructor(private prisma: PrismaService) {}

  async addImages(dto: CreateProductImageDto, tx?: Prisma.TransactionClient) {
    const prisma = tx ?? this.prisma;
    return await prisma.productImage.createMany({
      data: dto.url.map((url, index) => ({
        url,
        isMain: index === 0,
        productId: dto.productId,
      })),
    });
  }

  async getImages(productId: number) {
    return await this.prisma.productImage.findMany({
      where: {
        productId,
      },
    });
  }

  async getMainImage(productId: number) {
    return await this.prisma.productImage.findFirst({
      where: {
        productId,
        isMain: true,
      },
    });
  }

  async setMainImage(id: number, productId: number) {
    await this.prisma.productImage.findUniqueOrThrow({
      where: {
        id,
        productId,
      },
    });

    await this.prisma.productImage.updateMany({
      where: {
        isMain: true,
        productId,
      },
      data: {
        isMain: false,
      },
    });

    return await this.prisma.productImage.update({
      where: {
        id,
      },
      data: {
        isMain: true,
      },
    });
  }

  async updateImages(
    dto: CreateProductImageDto,
    tx?: Prisma.TransactionClient,
  ) {
    const { productId } = dto;
    await this.deleteImages(productId);
    return await this.addImages(dto, tx);
  }

  async deleteImages(productId: number, tx?: Prisma.TransactionClient) {
    const prisma = tx ?? this.prisma;
    return await prisma.productImage.deleteMany({
      where: {
        productId,
      },
    });
  }
}
