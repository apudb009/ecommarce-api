import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrderTrackingService } from './order-tracking.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from 'src/auth/constants';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/orders')
export class OrderTrackingController {
  constructor(private readonly orderTracking: OrderTrackingService) {}

  // GET /api/orders/:id/tracking
  @Get(':id/tracking')
  getTracking(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() req: { user: { sub: number; role: string } },
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.orderTracking.getTracking(orderId, req.user.sub, isAdmin);
  }

  // GET /api/orders/admin/:id/tracking
  @Get('admin/:id/tracking')
  getTrackingAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() req: { user: { sub: number; role: string } },
  ) {
    return this.orderTracking.getTracking(orderId, req.user.sub, true);
  }

  // POST /api/orders/:id/tracking (admin — manual event)
  @UseGuards(PermissionGuard)
  @RequirePermission('orders', 'update')
  @Post(':id/tracking')
  addTrackingEvent(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('body') body: { status: string; message?: string; location?: string },
  ) {
    return this.orderTracking.addTrackingEvent(
      orderId,
      body.status,
      body.location,
      body.message,
    );
  }

  // PATCH /api/orders/:id/tracking-number (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('orders', 'update')
  @Patch(':id/tracking-number')
  updateTrackingNumber(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    return this.orderTracking.updateTrackingNumber(orderId, trackingNumber);
  }
}
