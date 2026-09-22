import { Module } from '@nestjs/common';
import { RetrunRequestService } from './retrun_request.service';
import { RetrunRequestController } from './retrun_request.controller';

@Module({
  providers: [RetrunRequestService],
  controllers: [RetrunRequestController],
})
export class RetrunRequestModule {}
