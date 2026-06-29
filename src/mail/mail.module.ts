import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';

@Global() // ← available everywhere without importing
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
