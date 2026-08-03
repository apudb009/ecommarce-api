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
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';
import { InvoiceStatus } from 'src/generated/prisma/enums';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';

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
  async getMyInvoices(@Request() req: { user: { sub: number } }) {
    return await this.invoice.getMyInvoices(req.user.sub);
  }

  // GET /api/invoices/admin/all
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
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
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: InvoiceStatus,
  ) {
    return this.invoice.updateStatus(id, status);
  }
}
