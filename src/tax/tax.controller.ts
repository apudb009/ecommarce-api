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
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public, Roles } from 'src/auth/constants';

@ApiBearerAuth('access-token')
@Controller('api/taxes')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() createTaxDto: CreateTaxDto) {
    return this.taxService.create(createTaxDto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.taxService.findAll();
  }

  @Public()
  @Get('active')
  getActive() {
    return this.taxService.getActive();
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxService.findOne(+id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxService.update(+id, updateTaxDto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxService.remove(+id);
  }
}
