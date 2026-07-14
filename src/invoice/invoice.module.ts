import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { PrismaService } from 'src/prisma.service';
import { TaxModule } from 'src/tax/tax.module';

@Module({
  imports: [TaxModule],
  providers: [InvoiceService, PrismaService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
