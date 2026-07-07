import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Public } from './constants';
import { LoginDto } from './dto/login.dto';
import { RefreshGuard } from './refresh.guard';
import { Throttle } from '@nestjs/throttler';

@Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 attempts per minute
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
}
