import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequirePermission } from 'src/auth/constants';
import { RoleService } from './role.service';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@UseGuards(PermissionGuard)
@Controller('api/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('roles', 'read')
  findAll() {
    return this.roleService.findAll();
  }

  @Get('permissions')
  @RequirePermission('roles', 'read')
  getAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  @Get(':id')
  @RequirePermission('roles', 'read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Post()
  @RequirePermission('roles', 'create')
  create(
    @Body()
    dto: {
      name: string;
      description?: string;
      permissions: { module: string; action: string }[];
    },
  ) {
    return this.roleService.create(dto);
  }

  @Patch(':id')
  @RequirePermission('roles', 'update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      name?: string;
      description?: string;
      permissions?: { module: string; action: string }[];
    },
  ) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('roles', 'delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }

  @Patch(':id/assign/:userId')
  @RequirePermission('roles', 'update')
  assignToUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.roleService.assignToUser(userId, id);
  }
}
