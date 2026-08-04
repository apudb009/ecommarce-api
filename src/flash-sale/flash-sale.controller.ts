import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { Public, Roles } from 'src/auth/constants';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('access-token')
@Controller('api/flash-sales')
export class FlashSaleController {
  constructor(private readonly flashSaleService: FlashSaleService) {}

  // ── PUBLIC ─────────────────────────────────────────
  // GET /api/flash-sales/active
  @Public()
  @Get('active')
  findActive() {
    return this.flashSaleService.findActive();
  }

  // GET /api/flash-sales/upcoming
  @Public()
  @Get('upcoming')
  findUpcoming() {
    return this.flashSaleService.findUpcoming();
  }

  // ── ADMIN ──────────────────────────────────────────

  // POST /api/flash-sales
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createFlashSaleDto: CreateFlashSaleDto) {
    return this.flashSaleService.create(createFlashSaleDto);
  }

  // GET /api/flash-sales (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.flashSaleService.findAll();
  }

  // GET /api/flash-sales/:id
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flashSaleService.findOne(id);
  }

  // PATCH /api/flash-sales/:id
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFlashSaleDto: UpdateFlashSaleDto,
  ) {
    return this.flashSaleService.update(id, updateFlashSaleDto);
  }

  // DELETE /api/flash-sales/:id
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.flashSaleService.remove(+id);
  }

  // POST /api/flash-sales/:id/products
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post(':id/products')
  addProducts(
    @Param('id', ParseIntPipe) id: number,
    @Body('productIds') productIds: number[],
  ) {
    return this.flashSaleService.addProducts(id, productIds);
  }

  // DELETE /api/flash-sales/:id/products/:productId
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id/products/:productId')
  removeProduct(
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.flashSaleService.removeProduct(id, productId);
  }
}
