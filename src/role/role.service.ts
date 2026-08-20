import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  // ── GET ALL ROLES ──────────────────────────────────
  async findAll() {
    return await this.prisma.role.findMany({
      select: {
        id: true,
        description: true,
        isSystem: true,
        name: true,
        permissions: {
          select: {
            permission: {
              select: {
                module: true,
                action: true,
                id: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // ── GET ONE ROLE ───────────────────────────────────
  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // ── CREATE ROLE ────────────────────────────────────
  async create(dto: {
    name: string;
    permissions: { module: string; action: string }[];
    description?: string;
  }) {
    const exists = await this.prisma.role.findUnique({
      where: { name: dto.name.toUpperCase() },
    });

    if (exists) {
      throw new ConflictException('Role already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.toUpperCase(),
        description: dto.description,
      },
    });

    // assign permissions
    await this.syncPermissions(role.id, dto.permissions);

    return await this.findOne(role.id);
  }

  // ── UPDATE ROLE ────────────────────────────────────
  async update(
    id: number,
    dto: {
      name?: string;
      description?: string;
      permissions?: { module: string; action: string }[];
    },
  ) {
    const role = await this.findOne(id);

    if (role.isSystem && dto.name) {
      throw new BadRequestException('Cannot rename system roles');
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name?.toUpperCase(),
        description: dto.description,
      },
    });

    // sync permissions if provided
    if (dto.permissions) {
      await this.syncPermissions(id, dto.permissions);
    }

    return this.findOne(id);
  }

  // ── DELETE ROLE ────────────────────────────────────
  async remove(id: number) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${role._count.users} users assigned. Reassign them first.`,
      );
    }

    return this.prisma.role.delete({ where: { id } });
  }

  // ── GET ALL PERMISSIONS ────────────────────────────
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  // ── ASSIGN ROLE TO USER ────────────────────────────
  async assignToUser(userId: number, roleId: number) {
    const role = await this.findOne(roleId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roleId,
        role: role.name, // keep string role in sync
      },
      select: {
        id: true,
        email: true,
        role: true,
        roleId: true,
      },
    });
  }

  // ── SYNC PERMISSIONS ───────────────────────────────
  private async syncPermissions(
    roleId: number,
    permissions: { module: string; action: string }[],
  ) {
    // delete existing
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });

    // add new
    for (const { module, action } of permissions) {
      const permission = await this.prisma.permission.findUnique({
        where: { module_action: { module, action } },
      });
      if (!permission) continue;

      await this.prisma.rolePermission.create({
        data: { roleId, permissionId: permission.id },
      });
    }
  }
}
