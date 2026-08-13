import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { InvoiceService } from './invoice.service';
import { RequirePermission } from 'src/auth/constants';
import { InvoiceStatus } from 'src/generated/prisma/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { User } from 'src/common/decorators/user.decorator';

@ApiBearerAuth('access-token')
@Controller('api/invoices')
export class InvoiceController {
  constructor(private invoice: InvoiceService) {}

  // POST /api/invoices/order/:orderId
  @Post('order/:orderId')
  async createFromOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return await this.invoice.createFromOrder(orderId, req.user.sub);
  }

  // GET /api/invoices
  @Get()
  async getMyInvoices(
    @Query() filter: FilterInvoiceDto,
    @User('sub') sub: number,
  ) {
    return await this.invoice.getMyInvoices(filter, sub);
  }

  // GET /api/invoices/admin/all
  @UseGuards(PermissionGuard)
  @RequirePermission('invoices', 'read')
  @Get('admin/all')
  async getAll(@Query() dto: FilterInvoiceDto) {
    return await this.invoice.getAll(dto);
  }

  // GET /api/invoices/:id
  @Get(':id')
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return await this.invoice.getOne(id, req.user.sub);
  }

  // GET /api/invoices/:id/pdf  ← download PDF
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number; role: string } },
    @Res() res: express.Response,
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    const pdf = await this.invoice.generatePdf(id, req.user.sub, isAdmin);
    const invoice = await this.invoice.getOne(id, req.user.sub, isAdmin);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoiceNo}.pdf"`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }

  // PATCH /api/invoices/:id/status
  @UseGuards(PermissionGuard)
  @RequirePermission('invoices', 'update')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: InvoiceStatus,
  ) {
    return this.invoice.updateStatus(id, status);
  }
}
