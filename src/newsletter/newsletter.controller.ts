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
import { NewsletterService } from './newsletter.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { Public, RequirePermission } from 'src/auth/constants';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FilterNewsletterDto } from './dto/filter-newsletter.dto';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/newsletters')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post()
  create(@Body() createNewsletterDto: CreateNewsletterDto) {
    return this.newsletterService.create(createNewsletterDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('newsletters', 'read')
  @Get()
  findAll(@Query() dto: FilterNewsletterDto) {
    return this.newsletterService.findAll(dto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('newsletters', 'read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.newsletterService.findOne(+id);
  }

  @Public()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNewsletterDto: UpdateNewsletterDto,
  ) {
    return this.newsletterService.update(+id, updateNewsletterDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('newsletters', 'delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.newsletterService.remove(+id);
  }
}
