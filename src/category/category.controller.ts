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
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public, Roles } from 'src/auth/constants';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FilterProductDto } from 'src/product/dto/filter-product.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // POST /api/categories (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  // GET /api/categories (public)
  @Public()
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  // GET /api/categories/:slug (public)
  @Public()
  @Get(':slug')
  findOneBySlug(
    @Param('slug') slug: string,
    @Query() filterDto: FilterProductDto,
  ) {
    return this.categoryService.findOneBySlug(slug, filterDto);
  }

  // PATCH /api/categories/:id (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(+id, updateCategoryDto);
  }

  // DELETE /api/categories/:id (admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
