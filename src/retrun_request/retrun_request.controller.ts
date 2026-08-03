import {
  Controller,
  Post,
  Request,
  Body,
  Param,
  ParseIntPipe,
  Get,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { RetrunRequestService } from './retrun_request.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateReturnRequestDto } from './dto/create.return.request.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/constants';
import { Role } from 'src/generated/prisma/enums';
import { UpdateReturnRequestDto } from './dto/update.return.request.dto';
import { FilterReturnRequestDto } from './dto/filter-return-request.dto';

@ApiBearerAuth('access-token')
@Controller('api/returns')
export class RetrunRequestController {
  constructor(private readonly retrunRequest: RetrunRequestService) {}

  // POST /api/returns/order/:orderId
  @Post('order/:orderId')
  create(
    @Request() req: { user: { sub: number } },
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.retrunRequest.create(orderId, req.user.sub, dto);
  }

  // GET /api/returns
  @Get()
  findMyRetrunRequests(@Request() req: { user: { sub: number } }) {
    return this.retrunRequest.findMyRetrunRequests(req.user.sub);
  }

  // GET /api/returns/admin/all
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  findAll(@Query() dto: FilterReturnRequestDto) {
    return this.retrunRequest.findAll(dto);
  }

  // GET /api/returns/:id
  @Get(':id')
  findOne(
    @Request() req: { user: { sub: number; role: Role } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.retrunRequest.findOne(id, req.user.sub, isAdmin);
  }

  // PATCH /api/returns/:id/status (admin)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReturnRequestDto,
  ) {
    return this.retrunRequest.updateStatus(id, dto);
  }
}
