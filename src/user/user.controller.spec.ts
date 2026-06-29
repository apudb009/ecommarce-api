import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { BadRequestException } from '@nestjs/common';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

describe('UserController', () => {
  let controller: UserController;
  let service: {
    create: jest.Mock<any>;
    findAll: jest.Mock<any>;
    findOne: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
    updateAvatar: jest.Mock<any>;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn() as jest.Mock<any>,
      findAll: jest.fn() as jest.Mock<any>,
      findOne: jest.fn() as jest.Mock<any>,
      update: jest.fn() as jest.Mock<any>,
      remove: jest.fn() as jest.Mock<any>,
      updateAvatar: jest.fn() as jest.Mock<any>,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        email: 'test@test.com',
        name: 'Hello test',
        password: '123@Test',
        username: 'test',
      };
      const expected = { id: 1, ...dto };

      service.create.mockResolvedValue(expected);

      await expect(controller.create(dto)).resolves.toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return users with pagination', async () => {
      const expected = [
        {
          id: 1,
          email: 'test@test.com',
          name: 'Hello test',
          username: 'test',
        },
      ];

      service.findAll.mockResolvedValue(expected);

      await expect(controller.findAll(0, 10)).resolves.toEqual(expected);
      expect(service.findAll).toHaveBeenCalledWith(0, 10);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const expected = {
        id: 1,
        email: 'test@test.com',
        name: 'Hello test',
        username: 'test',
      };

      service.findOne.mockResolvedValue(expected);

      await expect(controller.findOne('1')).resolves.toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should update a user by id', async () => {
      const dto = {
        name: 'Hello test1',
        username: 'test111',
      };
      const expected = { id: 1, ...dto };

      service.update.mockResolvedValue(expected);

      await expect(controller.update('1', dto)).resolves.toEqual(expected);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(service.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should remove a user by id', async () => {
      const expected = {
        id: 1,
        email: 'test@test.com',
        name: 'Hello test',
        username: 'test',
      };

      service.remove.mockResolvedValue(expected);

      await expect(controller.remove('1')).resolves.toEqual(expected);
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload an avatar for the authenticated user', async () => {
      const file = {
        filename: 'avatar-123.png',
      } as Express.Multer.File;
      const req = { user: { sub: 1 } };
      const expected = {
        id: 1,
        avator: '/uploads/avatars/avatar-123.png',
      };

      service.updateAvatar.mockResolvedValue(expected);

      await expect(controller.uploadAvatar(file, req)).resolves.toEqual(
        expected,
      );
      expect(service.updateAvatar).toHaveBeenCalledWith(
        1,
        '/uploads/avatars/avatar-123.png',
      );
      expect(service.updateAvatar).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException when file is missing', () => {
      const req = { user: { sub: 1 } };

      expect(() =>
        controller.uploadAvatar(
          undefined as unknown as Express.Multer.File,
          req,
        ),
      ).toThrow(BadRequestException);
      expect(service.updateAvatar).not.toHaveBeenCalled();
    });
  });
});
