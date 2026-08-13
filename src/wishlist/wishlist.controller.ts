import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle({ short: true, long: true })
@ApiBearerAuth('access-token')
@Controller('api/wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  // GET /api/wishlist
  @Get()
  getWishlist(@Request() req: { user: { sub: number } }) {
    return this.wishlist.getOrCreate(req.user.sub);
  }

  // POST /api/wishlist/:productId
  @Post(':productId')
  addItem(
    @Request() req: { user: { sub: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlist.addItem(req.user.sub, productId);
  }

  // DELETE /api/wishlist/:productId
  @Delete(':productId')
  removeItem(
    @Request() req: { user: { sub: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlist.removeItem(req.user.sub, productId);
  }

  // DELETE /api/wishlist
  @Delete()
  clear(@Request() req: { user: { sub: number } }) {
    return this.wishlist.clear(req.user.sub);
  }

  // GET /api/wishlist/check/:productId
  @Get('check/:productId')
  isInWishlist(
    @Request() req: { user: { sub: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.wishlist.isInWishlist(req.user.sub, productId);
  }
}
