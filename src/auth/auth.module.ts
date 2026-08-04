import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { UserModule } from 'src/user/user.module';
import { RefreshGuard } from './refresh.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment
          expiresIn: config.get('JWT_ACCESS_EXPIRES', '15m') as any,
        },
      }),
    }),
    MailModule,
  ],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    RefreshGuard,
    ConfigService,
    PrismaService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
