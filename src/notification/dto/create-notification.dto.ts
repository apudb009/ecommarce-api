import { NotificationType } from 'src/generated/prisma/enums';

export class CreateNotificationDto {
  title!: string;
  message!: string;
  type!: NotificationType;
  link?: string;
}
