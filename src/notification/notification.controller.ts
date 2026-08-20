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
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from 'src/auth/constants';
import { NotificationType } from 'src/generated/prisma/enums';
import { PermissionGuard } from 'src/auth/guards/permission.guard';
import { FilterNotificationDto } from './dto/filter-notification.dto';

@ApiBearerAuth('access-token')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('my')
  getMyNotifications(@Request() req: { user: { sub: number } }) {
    return this.notificationService.getMyNotifications(req.user.sub);
  }

  // GET /api/notifications/admin/all  (notification history)
  @UseGuards(PermissionGuard)
  @RequirePermission('notifications', 'read')
  @Get('admin/all')
  getAllNotifications(@Query() filter: FilterNotificationDto) {
    console.log(filter);
    return this.notificationService.findAll(filter);
  }

  // POST /api/notifications/send  (send to specific user)
  @UseGuards(PermissionGuard)
  @RequirePermission('notifications', 'create')
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

  // POST /api/notifications/broadcast
  @UseGuards(PermissionGuard)
  @RequirePermission('notifications', 'create')
  @Patch('broadcast')
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
