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
import { Role } from 'src/generated/prisma/enums';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';

@ApiBearerAuth('access-token')
@Controller('api/orders')
export class OrderTrackingController {
  constructor(private readonly orderTracking: OrderTrackingService) {}

  // GET /api/orders/:id/tracking
  @Get(':id/tracking')
  getTracking(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() req: { user: { sub: number; role: Role } },
  ) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.orderTracking.getTracking(orderId, req.user.sub, isAdmin);
  }

  // POST /api/orders/:id/tracking (admin — manual event)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
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
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/tracking-number')
  updateTrackingNumber(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('trackingNumber') trackingNumber: string,
  ) {
    return this.orderTracking.updateTrackingNumber(orderId, trackingNumber);
  }
}
