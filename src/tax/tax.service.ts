import { ConflictException, Injectable } from '@nestjs/common';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class TaxService {
  constructor(private prisma: PrismaService) {}
  async create(createTaxDto: CreateTaxDto) {
    //Check same rate is exist or not
    const tax = await this.prisma.tax.findFirst({
      where: {
        AND: [{ type: createTaxDto.type }, { rate: createTaxDto.rate }],
      },
    });

    if (tax) {
      return new ConflictException('Tax already exist');
    }

    // check for active tax
    if (createTaxDto.isActive) {
      await this.prisma.tax.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return await this.prisma.tax.create({ data: createTaxDto });
  }

  async findAll() {
    return await this.prisma.tax.findMany();
  }

  async findOne(id: number) {
    return await this.prisma.tax.findUnique({ where: { id } });
  }

  async getActive() {
    return await this.prisma.tax.findFirst({ where: { isActive: true } });
  }

  async update(id: number, dto: UpdateTaxDto) {
    if (dto.isActive) {
      await this.prisma.tax.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    return await this.prisma.tax.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return await this.prisma.tax.delete({ where: { id } });
  }
}
