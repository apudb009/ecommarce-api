import { Module } from '@nestjs/common';
import { RetrunRequestService } from './retrun_request.service';
import { RetrunRequestController } from './retrun_request.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [RetrunRequestService, PrismaService],
  controllers: [RetrunRequestController],
})
export class RetrunRequestModule {}
