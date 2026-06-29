import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: {
    signAsync: jest.Mock<any>;
  };
  let userService: {
    register: jest.Mock<any>;
    getUserByUserName: jest.Mock<any>;
    findOne: jest.Mock<any>;
    updateAccessToken: jest.Mock<any>;
  };
  let configService: {
    get: jest.Mock<any>;
  };

  const tokens = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  };

  beforeEach(async () => {
    jwtService = {
      signAsync: jest.fn((payload, options) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        options.secret === 'access-secret'
          ? Promise.resolve(tokens.access_token)
          : Promise.resolve(tokens.refresh_token),
      ) as jest.Mock<any>,
    };

    userService = {
      register: jest.fn() as jest.Mock<any>,
      getUserByUserName: jest.fn() as jest.Mock<any>,
      findOne: jest.fn() as jest.Mock<any>,
      updateAccessToken: jest.fn() as jest.Mock<any>,
    };

    configService = {
      get: jest.fn((key: string) => {
        const values = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_ACCESS_EXPIRES: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES: '7d',
        } as const;

        return values[key as keyof typeof values];
      }) as jest.Mock<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const result = await service.generateTokens(1, 'test@test.com', 'USER');

      expect(result).toEqual(tokens);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, email: 'test@test.com', role: 'USER' },
        {
          secret: 'access-secret',
          expiresIn: '15m',
        },
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, email: 'test@test.com', role: 'USER' },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
    });
  });

  describe('saveRefreshToken', () => {
    it('should hash and save the refresh token', async () => {
      await service.saveRefreshToken(1, tokens.refresh_token);

      expect(userService.updateAccessToken).toHaveBeenCalledTimes(1);
      expect(userService.updateAccessToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
      );

      const hashedToken = userService.updateAccessToken.mock
        .calls[0][1] as string;
      await expect(
        bcrypt.compare(tokens.refresh_token, hashedToken),
      ).resolves.toBe(true);
      expect(hashedToken).not.toBe(tokens.refresh_token);
    });
  });

  describe('register', () => {
    it('should register a user and return tokens', async () => {
      const dto = {
        email: 'test@test.com',
        name: 'Hello test',
        password: '123@Test',
        username: 'test',
      };
      const user = {
        id: 1,
        email: dto.email,
        role: 'USER',
      };

      userService.register.mockResolvedValue(user);

      const result = await service.register(dto);

      expect(result).toEqual(tokens);
      expect(userService.register).toHaveBeenCalledWith(dto);
      expect(userService.updateAccessToken).toHaveBeenCalledTimes(1);
      expect(userService.updateAccessToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
      );
    });
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      const password = '123@Test';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: 1,
        email: 'test@test.com',
        username: 'test',
        password: hashedPassword,
        role: 'USER',
      };

      userService.getUserByUserName.mockResolvedValue(user);

      const result = await service.login({
        username: 'test',
        password,
      });

      expect(result).toEqual(tokens);
      expect(userService.getUserByUserName).toHaveBeenCalledWith('test');
      expect(userService.updateAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userService.getUserByUserName.mockResolvedValue(null);

      await expect(
        service.login({
          username: 'missing-user',
          password: '123@Test',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userService.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('123@Test', 10);

      userService.getUserByUserName.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        username: 'test',
        password: hashedPassword,
        role: 'USER',
      });

      await expect(
        service.login({
          username: 'test',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userService.updateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      userService.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        role: 'USER',
        refreshToken: hashedRefreshToken,
      });

      const result = await service.refresh(1, refreshToken);

      expect(result).toEqual(tokens);
      expect(userService.findOne).toHaveBeenCalledWith(1);
      expect(userService.updateAccessToken).toHaveBeenCalledTimes(1);
      expect(userService.updateAccessToken).toHaveBeenCalledWith(
        1,
        expect.any(String),
      );
    });

    it('should throw ForbiddenException when user has no refresh token', async () => {
      userService.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        role: 'USER',
        refreshToken: null,
      });

      await expect(service.refresh(1, 'refresh-token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.updateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when refresh token is invalid', async () => {
      const hashedRefreshToken = await bcrypt.hash('valid-refresh-token', 10);

      userService.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        role: 'USER',
        refreshToken: hashedRefreshToken,
      });

      await expect(service.refresh(1, 'invalid-refresh-token')).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.updateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear token and return a success message', async () => {
      const result = await service.logout(1);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(userService.updateAccessToken).toHaveBeenCalledWith(1, null);
      expect(userService.updateAccessToken).toHaveBeenCalledTimes(1);
    });
  });
});
