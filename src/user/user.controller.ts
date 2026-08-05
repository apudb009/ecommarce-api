import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from 'src/address/dto/create-address.dto';
import { AddressService } from 'src/address/address.service';
import { UpdateAddressDto } from 'src/address/dto/update-address.dto';
import { Public, RequirePermission } from 'src/auth/constants';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { FilterUserDto } from './dto/filter-user.dto';
import { PermissionGuard } from 'src/auth/guards/permission.guard';

@ApiBearerAuth('access-token')
@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly address: AddressService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('admin')
  @UseGuards(PermissionGuard)
  @RequirePermission('users', 'create')
  createFromAdmin(@Body() createUserDto: CreateUserDto) {
    return this.userService.createFromAdmin(createUserDto);
  }

  @Get('admin/all')
  @UseGuards(PermissionGuard)
  @RequirePermission('users', 'read')
  findAll(@Query() dto: FilterUserDto) {
    return this.userService.findAll(dto);
  }

  @Get('me')
  me(@Request() req: { user: { sub: number } }) {
    return this.userService.findOne(req.user.sub);
  }

  @Patch('me')
  updateProfile(
    @Body() dto: UpdateUserDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.userService.update(req.user.sub, dto);
  }

  @Patch('me/password')
  updatePassword(
    @Request() req: { user: { sub: number } },
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.userService.updatePassword(req.user.sub, dto);
  }

  @Get('addresses')
  findAllAddress(@Request() req: { user: { sub: number } }) {
    return this.address.findAll(req.user.sub);
  }

  @Public()
  @Get('search')
  search(@Query('email') email: string) {
    return this.userService.getUserByEmail(email);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @UseGuards(PermissionGuard)
  @RequirePermission('users', 'update')
  @Patch('admin/:id')
  updateAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.userService.remove(id, req.user.sub);
  }

  // ── ADDRESSES ──────────────────────────────────────
  @Post('addresses')
  createAddress(
    @Body() createAddressDto: CreateAddressDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.address.create(createAddressDto, req.user.sub);
  }

  @Get('addresses/:id')
  findOneAddress(
    @Param('id') id: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.address.findOne(+id, req.user.sub);
  }

  @Patch('addresses/:id')
  updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.address.update(id, updateAddressDto, req.user.sub);
  }

  @Patch('addresses/:id/default')
  setDefaultAddress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.address.setDefault(id, req.user.sub);
  }

  @Delete('addresses/:id')
  removeAddress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.address.remove(id, req.user.sub);
  }
}
