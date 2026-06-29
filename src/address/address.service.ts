import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  // ── CREATE ─────────────────────────────────────────
  async create(createAddressDto: CreateAddressDto, userId: number) {
    const { isDefault } = createAddressDto;
    //If it is default, set all others to false
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: {
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }
    return await this.prisma.address.create({
      data: { userId, ...createAddressDto },
    });
  }

  // ── GET ALL ────────────────────────────────────────
  async findAll(userId: number) {
    return await this.prisma.address.findMany({
      where: { userId },
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: [
        {
          isDefault: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  // ── GET ONE ────────────────────────────────────────
  async findOne(id: number, userId: number) {
    const address = await this.prisma.address.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return address;
  }

  // ── UPDATE ────────────────────────────────────────
  async update(id: number, updateAddressDto: UpdateAddressDto, userId: number) {
    await this.getAddressOrThrow(id);

    //if set as default, set all others to false
    if (updateAddressDto.isDefault) {
      await this.prisma.address.updateMany({
        where: {
          isDefault: true,
          userId,
          NOT: { id },
        },
        data: {
          isDefault: false,
        },
      });
    }
    return await this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  // ── DELETE ────────────────────────────────────────
  async remove(id: number, userId: number) {
    await this.getAddressOrThrow(id, userId);
    return await this.prisma.address.delete({ where: { id } });
  }

  // ── SET DEFAULT ────────────────────────────────────────
  async setDefault(id: number, userId: number) {
    await this.getAddressOrThrow(id, userId);
    await this.prisma.address.updateMany({
      where: {
        isDefault: true,
        userId,
        NOT: { id },
      },
      data: {
        isDefault: false,
      },
    });
    return await this.prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  }
  // ── Helpers ────────────────────────────────────────
  async getAddressOrThrow(id: number, userId?: number) {
    const address = await this.prisma.address.findUnique({
      where: { id, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}
