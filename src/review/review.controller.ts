import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  Request,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Public } from 'src/auth/constants';
import { FilterReviewDto } from './dto/filter-review.dto';
import { Role } from 'src/generated/prisma/enums';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ── PRODUCT REVIEWS ────────────────────────────────
  // POST /api/products/:id/reviews
  @Post('products/:id/reviews')
  create(
    @Body() createReviewDto: CreateReviewDto,
    @Param('id', ParseIntPipe) productId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.reviewService.create(createReviewDto, productId, req.user.sub);
  }

  // GET /api/products/:id/reviews (public)
  @Public()
  @Get('products/:id/reviews')
  findAll(
    @Param('id', ParseIntPipe) productId: number,
    @Query() dto: FilterReviewDto,
  ) {
    return this.reviewService.findAll(productId, dto);
  }

  @Get('products/:id/reviews/mine')
  findMyAllReviewForProduct(
    @Param('id', ParseIntPipe) productId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.reviewService.findOne(productId, req.user.sub);
  }

  // GET /api/reviews/me
  @Get('reviews/me')
  getMyReviews(@Request() userId: number) {
    return this.reviewService.getMyReviews(userId);
  }

  // ── SINGLE REVIEW ACTIONS (UPdate, Delete) ──────────────────────────
  //-- Update
  // PATCH /api/reviews/:id
  @Patch('reviews/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, req.user.sub, updateReviewDto);
  }

  // DELETE /api/reviews/:id
  @Delete('reviews/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number; role: Role } },
  ) {
    const isAdmin = req.user.role === Role.ADMIN;
    return this.reviewService.remove(id, req.user.sub, isAdmin);
  }
}
