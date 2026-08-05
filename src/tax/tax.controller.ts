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
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public, RequirePermission } from 'src/auth/constants';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @UseGuards(PermissionGuard)
  @RequirePermission('taxes', 'create')
  @Post()
  create(@Body() createTaxDto: CreateTaxDto) {
    return this.taxService.create(createTaxDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('taxes', 'read')
  @Get()
  findAll() {
    return this.taxService.findAll();
  }

  @Public()
  @Get('active')
  getActive() {
    return this.taxService.getActive();
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('taxes', 'read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxService.findOne(+id);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('taxes', 'update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxService.update(+id, updateTaxDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('taxes', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxService.remove(+id);
  }
}
