import { Module } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { PrismaService } from 'src/prisma.service';
import { StoreSettingsController } from './store-settings.controller';

@Module({
  providers: [StoreSettingsService, PrismaService],
  controllers: [StoreSettingsController],
  exports: [StoreSettingsService],
})
export class StoreSettingsModule {}
