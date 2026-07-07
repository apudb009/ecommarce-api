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
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // POST /api/coupons (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.create(createCouponDto);
  }

  // GET /api/coupons (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.couponService.findAll();
  }

  // GET /api/coupons/:id (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(+id);
  }

  // PATCH /api/coupons/:id (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponService.update(+id, updateCouponDto);
  }

  // DELETE /api/coupons/:id (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
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
