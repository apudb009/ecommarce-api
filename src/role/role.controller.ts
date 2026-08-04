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
import { Roles } from 'src/auth/constants';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { RoleService } from './role.service';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('api/roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get('permissions')
  getAllPermissions() {
    return this.roleService.getAllPermissions();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Post()
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }

  @Patch(':id/assign/:userId')
  assignToUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.roleService.assignToUser(userId, id);
  }
}
