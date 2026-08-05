import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { QueryMode } from 'src/generated/prisma/internal/prismaNamespace';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private mail: MailService,
  ) {}

  async register(createUserDto: CreateUserDto, sendWelcomeEmail = true) {
    //check for existance of user with email
    const user = await this.getUserByEmail(createUserDto.email);

    if (user) {
      throw new ConflictException('User with this email already exists');
    }

    //check for username existance
    const userNameExist = await this.getUserByUserName(createUserDto.username);

    if (userNameExist) {
      throw new ConflictException('User with this username already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    createUserDto.password = hashedPassword;

    const newUser = await this.create(createUserDto);
    if (sendWelcomeEmail) {
      this.mail
        .sendWelcome({
          to: newUser.email,
          name: newUser.name || newUser.username,
        })
        .catch(() => {});
    }

    return newUser;
  }

  async getUserByEmail(email: string) {
    return await this.prismaService.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        password: true,
        role: true,
      },
    });
  }

  async getUserByUserName(username: string) {
    return await this.prismaService.user.findUnique({
      where: {
        username,
      },
    });
  }

  async createFromAdmin(createUserDto: CreateUserDto) {
    await this.register(createUserDto, false);
  }

  async create(createUserDto: CreateUserDto) {
    const user = await this.prismaService.user.create({
      data: createUserDto,
    });
    return user;
  }

  async findAll(dto: FilterUserDto) {
    const {
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
    } = dto;
    const skip = (page - 1) * limit;
    const whereClause: Prisma.UserWhereInput[] = [];

    if (search) {
      whereClause.push(
        ...[
          {
            email: { contains: search, mode: QueryMode.insensitive },
          },
          { name: { contains: search, mode: QueryMode.insensitive } },
        ],
      );
    }

    const where = {
      ...(search && {
        OR: [...whereClause].filter(Boolean),
      }),
      ...(role && {
        role: { equals: role },
      }),
    };
    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          userRole: {
            select: {
              id: true,
              name: true,
              isSystem: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      module: true,
                      action: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
        hasNextPage: total > page * limit,
        hasPrevPage: page > 1,
      },
    };
  }

  // ── GET ONE USER (admin) ───────────────────────────
  async findOneAdmin(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      omit: {
        password: true,
      },
      include: {
        userRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        refreshToken: true,
        userRole: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    module: true,
                    action: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateRefreshToken(id: number, refreshToken: string | null) {
    return await this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        refreshToken,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return await this.prismaService.user.update({
      where: {
        id,
      },
      data: updateUserDto,
    });
  }

  async updatePassword(userId: number, dto: UpdateUserPasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }

  async remove(id: number, userId: number) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === userId && user.role === 'ADMIN') {
      throw new ConflictException('You cannot delete your own account');
    }

    return await this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }
}
