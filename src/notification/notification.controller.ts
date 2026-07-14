import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Post,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';
import { NotificationType } from 'src/generated/prisma/enums';

@ApiBearerAuth('access-token')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('my')
  getMyNotifications(@Request() req: { user: { sub: number } }) {
    return this.notificationService.getMyNotifications(req.user.sub);
  }

  // GET /api/notifications/admin/all  (notification history)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  getAllNotifications() {
    return this.notificationService.findAll();
  }

  // POST /api/notifications/send  (send to specific user)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('send')
  send(
    @Body()
    body: {
      userId: number;
      title: string;
      message: string;
      type: NotificationType;
      link?: string;
    },
  ) {
    return this.notificationService.create(body, body.userId);
  }

  @Patch('selected-as-read')
  markSelectedAsRead(
    @Body() ids: number[],
    @Request() req: { user: { sub: number } },
  ) {
    return this.notificationService.markSelectedAsRead(ids, req.user.sub);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: { user: { sub: number } }) {
    return this.notificationService.markAllAsRead(req.user.sub);
  }

  @Patch('notify-all')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  notifyAll(@Body() body: { title: string; message: string; link?: string }) {
    return this.notificationService.notifyPromoToAllUsers(
      body.title,
      body.message,
      body.link,
    );
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id') id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.notificationService.markAsRead(+id, req.user.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: number, @Request() req: { user: { sub: number } }) {
    return this.notificationService.delete(+id, req.user.sub);
  }
}
