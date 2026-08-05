import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { Public, RequirePermission } from 'src/auth/constants';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@SkipThrottle()
@ApiBearerAuth('access-token')
@Controller('api/banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'create')
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannerService.create(createBannerDto);
  }

  @Get('admin/all')
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'read')
  findAll() {
    return this.bannerService.findAll();
  }

  @Public()
  @Get()
  findAllActive() {
    return this.bannerService.findAllActive();
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannerService.update(id, updateBannerDto);
  }

  @Patch('reorder/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'update')
  reorder(@Param('id', ParseIntPipe) id: number, @Body() position: number) {
    return this.bannerService.reorder(id, position);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('banners', 'delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.remove(id);
  }
}
