import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [
    UsersModule,
    StudentsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'lexilearn_jwt_secret_key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
