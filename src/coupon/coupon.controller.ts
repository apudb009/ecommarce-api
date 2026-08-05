import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RequirePermission } from 'src/auth/constants';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FilterCouponDto } from './dto/filter-coupon.dto';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // POST /api/coupons (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('coupons', 'create')
  @Post()
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.create(createCouponDto);
  }

  // GET /api/coupons (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('coupons', 'read')
  @Get()
  findAll(@Query() filterDto: FilterCouponDto) {
    return this.couponService.findAll(filterDto);
  }

  // GET /api/coupons/:id (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('coupons', 'read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(+id);
  }

  // PATCH /api/coupons/:id (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('coupons', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.update(+id, updateCouponDto);
  }

  // DELETE /api/coupons/:id (admin)
  @UseGuards(PermissionGuard)
  @RequirePermission('coupons', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponService.remove(+id);
  }

  // POST /api/coupons/validate (customer)
  @Post('validate')
  validate(
    @Body() dto: ApplyCouponDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.couponService.validate(dto.code, req.user.sub, dto.orderAmount);
  }
}
