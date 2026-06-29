import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private config: ConfigService,
  ) {}
  async register(createUserDto: CreateUserDto) {
    const user = await this.userService.register(createUserDto);

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  // ── GENERATE BOTH TOKENS ───────────────────────────
  async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES'), // 15m
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES'), // 7d
      }),
    ]);

    return { access_token, refresh_token };
  }

  // ── SAVE HASHED REFRESH TOKEN IN DB ───────────────
  async saveRefreshToken(userId: number, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(userId, hashed);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.getUserByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Unauthorised access!');
    }

    //check password
    const passwordMatched = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Unauthorised access!');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  // ── REFRESH ────────────────────────────────────────
  async refresh(userId: number, refreshToken: string) {
    const user = await this.userService.findOne(userId);

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Access denied');
    }

    // compare incoming token with hashed one in DB
    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!tokenMatch) throw new ForbiddenException('Invalid refresh token');

    // generate new tokens (token rotation)
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  // ── LOGOUT ─────────────────────────────────────────
  async logout(userId: number) {
    // remove refresh token from DB → invalidates it
    await this.userService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }
}
