import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock<any>;
    login: jest.Mock<any>;
    refresh: jest.Mock<any>;
    logout: jest.Mock<any>;
  };

  const tokens = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  };

  beforeEach(async () => {
    service = {
      register: jest.fn() as jest.Mock<any>,
      login: jest.fn() as jest.Mock<any>,
      refresh: jest.fn() as jest.Mock<any>,
      logout: jest.fn() as jest.Mock<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: service,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a user', async () => {
      const dto = {
        email: 'test@test.com',
        name: 'Hello test',
        password: '123@Test',
        username: 'test',
      };

      service.register.mockResolvedValue(tokens);

      await expect(controller.register(dto)).resolves.toEqual(tokens);
      expect(service.register).toHaveBeenCalledWith(dto);
      expect(service.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto = {
        username: 'test',
        password: '123@Test',
      };

      service.login.mockResolvedValue(tokens);

      await expect(controller.login(dto)).resolves.toEqual(tokens);
      expect(service.login).toHaveBeenCalledWith(dto);
      expect(service.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens for the authenticated user', async () => {
      const req = {
        user: {
          sub: 1,
          refreshToken: 'refresh-token',
        },
      };

      service.refresh.mockResolvedValue(tokens);

      await expect(controller.refresh(req)).resolves.toEqual(tokens);
      expect(service.refresh).toHaveBeenCalledWith(1, 'refresh-token');
      expect(service.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('should logout the authenticated user', async () => {
      const req = {
        user: {
          sub: 1,
        },
      };
      const expected = { message: 'Logged out successfully' };

      service.logout.mockResolvedValue(expected);

      await expect(controller.logout(req)).resolves.toEqual(expected);
      expect(service.logout).toHaveBeenCalledWith(1);
      expect(service.logout).toHaveBeenCalledTimes(1);
    });
  });
});
