import { Module } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { StoreSettingsController } from './store-settings.controller';

@Module({
  providers: [StoreSettingsService],
  controllers: [StoreSettingsController],
  exports: [StoreSettingsService],
})
export class StoreSettingsModule {}
