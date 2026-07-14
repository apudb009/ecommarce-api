import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [TaxController],
  providers: [TaxService, PrismaService],
  exports: [TaxService],
})
export class TaxModule {}
