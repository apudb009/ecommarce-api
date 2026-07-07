import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AddCouponToCartDto } from './dto/add-coupon-to-cart.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /api/cart
  @Get()
  getCart(@Request() req: { user: { sub: number } }) {
    return this.cartService.getOrCreate(req.user.sub);
  }

  // POST /api/cart/items
  @Post('items')
  addItem(
    @Request() req: { user: { sub: number } },
    @Body() dto: CreateCartDto,
  ) {
    return this.cartService.addItem(req.user.sub, dto);
  }

  // PATCH /api/cart/apply-coupon
  @Patch('apply-coupon')
  applyCoupon(
    @Body() dto: AddCouponToCartDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.cartService.applyCoupon(dto, req.user.sub);
  }

  // PATCH /api/cart/remove-coupon
  @Patch('remove-coupon')
  removeCoupon(@Request() req: { user: { sub: number } }) {
    return this.cartService.removeCoupon(req.user.sub);
  }

  // PATCH /api/cart/items/:productId
  @Patch('items/:productId')
  updateItemQuantity(
    @Request() req: { user: { sub: number } },
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.sub, dto, productId);
  }

  // DELETE /api/cart/items/:productId
  @Delete('items/:productId')
  removeItem(
    @Request() req: { user: { sub: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(req.user.sub, productId);
  }

  // DELETE /api/cart
  @Delete()
  clearCart(@Request() req: { user: { sub: number } }) {
    return this.cartService.clearCart(req.user.sub);
  }
}
