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

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private mail: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
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
    this.mail
      .sendWelcome({
        to: newUser.email,
        name: newUser.name || newUser.username,
      })
      .catch(() => {});

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

  async create(createUserDto: CreateUserDto) {
    const user = await this.prismaService.user.create({
      data: createUserDto,
    });
    return user;
  }

  async findAll(skip: number, take: number) {
    return await this.prismaService.user.findMany({
      skip,
      take,
    });
  }

  async findOne(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
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

  async remove(id: number) {
    const user = await this.prismaService.user.findFirst({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }
}
