import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { Public, RequirePermission } from 'src/auth/constants';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

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
  @UseGuards(PermissionGuard)
  @RequirePermission('settings', 'update')
  @Patch()
  updateMany(@Body() settings: Record<string, string>) {
    return this.storeSetting.updateMany(settings);
  }
}
