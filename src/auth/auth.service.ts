import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    // In a real app, you would hash passwords! Here we just do a basic comparison.
    if (!user || user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    };
  }

  async register(registerDto: RegisterDto) {
    // Basic registration
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: registerDto.password, // Remember to hash in prod
        role: registerDto.role,
      },
    });

    if (registerDto.role === 'STUDENT') {
      await this.prisma.student.create({
        data: {
          userId: user.id,
          firstName: registerDto.firstName || 'Student',
          lastName: registerDto.lastName || '',
        }
      });
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    };
  }
}
