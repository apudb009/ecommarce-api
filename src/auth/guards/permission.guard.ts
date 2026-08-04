import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma.service';

export const PERMISSION_KEY = 'permission';

export const RequirePermission = (module: string, action: string) =>
  Reflect.metadata(PERMISSION_KEY, `${module}:${action}`);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(
      PERMISSION_KEY,
      context.getHandler(),
    );

    // no permission required → allow
    if (!required) return true;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = request.user?.sub;

    if (!userId) throw new ForbiddenException('Not authenticated');

    // ── check old role system first (backward compat) ─
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userRole = request.user?.role;
    if (userRole === 'ADMIN') return true; // admins always pass

    // ── check permission table ─────────────────────
    const [module, action] = required.split(':');

    const user = await this.prisma.user.findUnique({
      where: { id: userId as number },
      include: {
        userRole: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) throw new ForbiddenException('User not found');

    const hasPermission = user.userRole?.permissions.some(
      (rp) =>
        rp.permission.module === module && rp.permission.action === action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have permission to ${action} ${module}`,
      );
    }

    return true;
  }
}
