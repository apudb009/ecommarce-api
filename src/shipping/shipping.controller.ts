import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public, RequirePermission } from 'src/auth/constants';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @UseGuards(PermissionGuard)
  @RequirePermission('shipping', 'create')
  @Post()
  create(@Body() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('shipping', 'read')
  @Get()
  findAll() {
    return this.shippingService.findAll();
  }

  @Public()
  @Get('active')
  getActive() {
    return this.shippingService.getActive();
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('shipping', 'read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shippingService.findOne(+id);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('shipping', 'update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateShippingDto: UpdateShippingDto,
  ) {
    return this.shippingService.update(+id, updateShippingDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('shipping', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shippingService.remove(+id);
  }
}
