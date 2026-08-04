import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { Public, Roles } from 'src/auth/constants';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('api/settings')
export class StoreSettingsController {
  constructor(private storeSetting: StoreSettingsService) {}

  // GET /api/settings (public — frontend needs store name, logo etc.)
  @Public()
  @Get()
  findAll() {
    return this.storeSetting.findAll();
  }

  // PATCH /api/settings (admin — update multiple at once)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch()
  updateMany(@Body() settings: Record<string, string>) {
    return this.storeSetting.updateMany(settings);
  }
}
