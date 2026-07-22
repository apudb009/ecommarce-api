import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PrismaService } from 'src/prisma.service';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notification/notification.module';
import { StoreSettingsModule } from 'src/store-settings/store-settings.module';

@Module({
  imports: [MailModule, NotificationModule, StoreSettingsModule],
  providers: [SchedulerService, PrismaService],
})
export class SchedulerModule {}
