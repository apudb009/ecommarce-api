import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/add-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AddCouponToCartDto } from './dto/add-coupon-to-cart.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';

@ApiBearerAuth('access-token')
@Controller('api/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // GET /api/cart
  @Get()
  getCart(@User('sub') sub: number) {
    return this.cartService.getOrCreate(sub);
  }

  // POST /api/cart/items
  @Post('items')
  addItem(@User('sub') sub: number, @Body() dto: CreateCartDto) {
    return this.cartService.addItem(sub, dto);
  }

  // PATCH /api/cart/apply-coupon
  @Patch('apply-coupon')
  applyCoupon(@Body() dto: AddCouponToCartDto, @User('sub') sub: number) {
    return this.cartService.applyCoupon(dto, sub);
  }

  // PATCH /api/cart/remove-coupon
  @Patch('remove-coupon')
  removeCoupon(@User('sub') sub: number) {
    return this.cartService.removeCoupon(sub);
  }

  // PATCH /api/cart/items/:productId
  @Patch('items/:productId')
  updateItemQuantity(
    @User('sub') sub: number,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateItemQuantity(sub, dto, productId);
  }

  // DELETE /api/cart/items/:productId
  @Delete('items/:productId')
  removeItem(
    @User('sub') sub: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(sub, productId);
  }

  // DELETE /api/cart
  @Delete()
  clearCart(@User('sub') sub: number) {
    return this.cartService.clearCart(sub);
  }
}
