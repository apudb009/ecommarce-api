import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Public, Roles } from 'src/auth/constants';
import { FilterProductDto } from './dto/filter-product.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // POST /api/products (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  // GET /api/products (public + search + filter)
  @Public()
  @Get()
  findAll(@Query() fiterDto: FilterProductDto) {
    return this.productService.findAll(fiterDto);
  }

  // GET /api/products/hot
  @Public()
  @Get('hot')
  getHotProducts() {
    return this.productService.getHotProducts();
  }

  // GET /api/products/best-sellers
  @Public()
  @Get('best-sellers')
  getBestSellers() {
    return this.productService.getBestSellers();
  }

  // GET /api/products/:slug (public) — must be before :id
  @Public()
  @Get(':slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.productService.findOneBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  // GET /api/products/admin/:id (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/:id')
  findOneAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  // PATCH /api/products/:id (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  // DELETE /api/products/:id (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
