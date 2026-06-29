import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { PrismaService } from 'src/prisma.service';
import { NotFoundException } from '@nestjs/common';

// ── MOCK PRISMA ────────────────────────────────────
const mockPrisma = {
  user: {
    create: jest.fn() as jest.Mock<any>,
    findMany: jest.fn() as jest.Mock<any>,
    findUnique: jest.fn() as jest.Mock<any>,
    findFirst: jest.fn() as jest.Mock<any>,
    update: jest.fn() as jest.Mock<any>,
    delete: jest.fn() as jest.Mock<any>,
    count: jest.fn() as jest.Mock<any>,
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        UserService,
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── CREATE ─────────────────────────────────────────
  describe('create', () => {
    it('should create a user', async () => {
      const dto = {
        email: 'test@test.com',
        name: 'Hello test',
        password: '123@Test',
        username: 'test',
      };
      const expected: any = { id: 1, ...dto };

      mockPrisma.user.create.mockResolvedValue(expected);
      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── FIND ONE ───────────────────────────────────────
  describe('findOne', () => {
    it('should return a user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Hello test',
      });
      const result = await service.findOne(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  // ── UPDATE ─────────────────────────────────────────
  describe('update', () => {
    it('should update a user', async () => {
      const dto = {
        name: 'Hello test1',
        username: 'test111',
      };
      const expected: any = { id: 1, ...dto };

      mockPrisma.user.update.mockResolvedValue(expected);
      const result = await service.update(1, dto);
      expect(result).toEqual(expected);
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    });
  });

  // ── DELETE ─────────────────────────────────────────
  describe('remove', () => {
    it('should throw if user is not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.remove(33)).rejects.toThrow(NotFoundException);
    });

    it('should delete a user', async () => {
      const user = { id: 1, email: 'test@test.com' };
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.delete.mockResolvedValue(user);

      const result = await service.remove(1);
      expect(result).toEqual(user);
      expect(mockPrisma.user.delete).toHaveBeenCalledTimes(1);
    });
  });
});
