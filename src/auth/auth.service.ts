import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { PrismaService } from 'src/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private config: ConfigService,
    private prisma: PrismaService,
    private mail: MailService,
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

  // ── FORGOT PASSWORD ────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.getUserByEmail(dto.email);

    // ← always return same response (security — don't reveal if email exists)
    const genericMessage = {
      message: 'Password reset email sent successfully',
    };

    if (!user) {
      return genericMessage;
    }

    // ── delete any existing unused tokens for this user ─
    await this.prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        used: false,
      },
    });

    // ── generate secure random token ──────────────────
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 min expiry

    // ── save hashed token to DB ───────────────────────
    await this.prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    // ── send reset email ──────────────────────────────
    const frontendUrl = this.config.get('FRONTEND_URL') as string;
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await this.mail.sendPasswordReset({
      to: user.email,
      name: user.name || user.username,
      resetLink,
      expiresIn: '30 minutes',
    });

    return genericMessage;
  }

  // ── VALIDATE RESET TOKEN ───────────────────────────
  async validateResetToken(token: string, email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        passwordResetTokens: {
          where: {
            used: false,
            expiresAt: {
              gte: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user || user.passwordResetTokens.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const dbToken = user.passwordResetTokens[0];
    const tokenMatch = await bcrypt.compare(token, dbToken.token);

    if (!tokenMatch) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    return { valid: true, email: user.email };
  }

  // ── RESET PASSWORD ─────────────────────────────────
  async resetPassword(dto: ResetPasswordDto & { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      include: {
        passwordResetTokens: {
          where: {
            used: false,
            expiresAt: {
              gte: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user || user.passwordResetTokens.length === 0) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const dbToken = user.passwordResetTokens[0];
    const tokenMatch = await bcrypt.compare(dto.token, dbToken.token);

    if (!tokenMatch) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // ── update password ────────────────────────────
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      // mark token as used
      this.prisma.passwordResetToken.update({
        where: {
          id: dbToken.id,
        },
        data: {
          used: true,
        },
      }),
      // delete all other reset tokens for this user
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          NOT: {
            id: dbToken.id,
          },
        },
      }),
      // update user password
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
        },
      }),
    ]);

    // ── send confirmation email ───────────────────
    await this.mail
      .sendPasswordChanged({
        to: user.email,
        name: user.name || user.username,
      })
      .catch(() => {});

    return { message: 'Password reset successfully. You can now login.' };
  }
}
