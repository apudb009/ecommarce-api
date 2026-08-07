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
import { User } from 'src/common/decorators/user.decorator';

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
  me(@User('sub') sub: number) {
    return this.userService.findOne(sub);
  }

  @Patch('me')
  updateProfile(@Body() dto: UpdateUserDto, @User('sub') sub: number) {
    return this.userService.update(sub, dto);
  }

  @Patch('me/password')
  updatePassword(@User('sub') sub: number, @Body() dto: UpdateUserPasswordDto) {
    return this.userService.updatePassword(sub, dto);
  }

  @Get('addresses')
  findAllAddress(@User('sub') sub: number) {
    return this.address.findAll(sub);
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

  @UseGuards(PermissionGuard)
  @RequirePermission('users', 'delete')
  @Delete('admin/:id')
  removeAdmin(@Param('id', ParseIntPipe) id: number, @User('sub') sub: number) {
    return this.userService.remove(id, sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @User('sub') sub: number) {
    return this.userService.remove(id, sub);
  }

  // ── ADDRESSES ──────────────────────────────────────
  @Post('addresses')
  createAddress(
    @Body() createAddressDto: CreateAddressDto,
    @User('sub') sub: number,
  ) {
    return this.address.create(createAddressDto, sub);
  }

  @Get('addresses/:id')
  findOneAddress(@Param('id') id: string, @User('sub') sub: number) {
    return this.address.findOne(+id, sub);
  }

  @Patch('addresses/:id')
  updateAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @User('sub') sub: number,
  ) {
    return this.address.update(id, updateAddressDto, sub);
  }

  @Patch('addresses/:id/default')
  setDefaultAddress(
    @Param('id', ParseIntPipe) id: number,
    @User('sub') sub: number,
  ) {
    return this.address.setDefault(id, sub);
  }

  @Delete('addresses/:id')
  removeAddress(
    @Param('id', ParseIntPipe) id: number,
    @User('sub') sub: number,
  ) {
    return this.address.remove(id, sub);
  }
}
