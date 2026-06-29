import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Request,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FilterOrderDto } from './dto/filter-order.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';
import { Role } from 'src/generated/prisma/enums';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ── CUSTOMER ROUTES ────────────────────────────────
  // POST /api/orders — place order from cart
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.orderService.create(req.user.sub, createOrderDto);
  }

  // GET /api/orders — my orders
  @Get()
  myOrders(
    @Query() filterDto: FilterOrderDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.orderService.getMyOrders(req.user.sub, filterDto);
  }

  // GET /api/orders/admin/all — must be before :id
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('/admin/all')
  findAll(@Query() filterDto: FilterOrderDto) {
    return this.orderService.findAll(filterDto);
  }

  // GET /api/orders/:id
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number; role: Role } },
  ) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.orderService.findOne(+id, req.user.sub, isAdmin);
  }

  // PATCH /api/orders/:id/cancel
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.orderService.cancel(id, req.user.sub);
  }

  // PATCH /api/orders/:id/status (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, updateOrderDto);
  }
}
