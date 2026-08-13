import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Query,
  Get,
} from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Public } from './constants';
import { LoginDto } from './dto/login.dto';
import { RefreshGuard } from './refresh.guard';
import { Throttle } from '@nestjs/throttler';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Throttle({ short: { ttl: 60000, limit: 10 } }) // 10 attempts per minute
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Public()
  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @UseGuards(RefreshGuard)
  @Post('refresh')
  refresh(
    @Request()
    req: {
      user: {
        sub: number;
        refreshToken: string;
      };
    },
  ) {
    return this.authService.refresh(req.user.sub, req.user.refreshToken);
  }

  @Post('logout')
  logout(@Request() req: { user: { sub: number } }) {
    return this.authService.logout(req.user.sub);
  }

  // POST /api/auth/forgot-password
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // GET /api/auth/validate-reset-token
  @Public()
  @Get('validate-reset-token')
  validateResetToken(
    @Query('token') token: string,
    @Query('email') email: string,
  ) {
    return this.authService.validateResetToken(token, email);
  }

  // POST /api/auth/reset-password
  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Query('email') email: string) {
    return this.authService.resetPassword({ ...dto, email });
  }
}
