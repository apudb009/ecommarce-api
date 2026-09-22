import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notification/notification.module';
import { StoreSettingsModule } from 'src/store-settings/store-settings.module';

@Module({
  imports: [MailModule, NotificationModule, StoreSettingsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
