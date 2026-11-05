import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  AuthenticatedStudent,
  JwtAccessPayload,
} from '../../../common/auth/auth.interfaces.js';
import { ACCESS_AUDIENCE, JWT_ISSUER } from '../../../common/security/token.service.js';
import { StudentsRepository } from '../../students/students.repository.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly studentsRepository: StudentsRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
      issuer: JWT_ISSUER,
      audience: ACCESS_AUDIENCE,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedStudent> {
    if (payload.kind !== 'access' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('A valid student session is required.');
    }

    const identity = await this.studentsRepository.findAccessIdentity(payload.sub);

    if (!identity) {
      throw new UnauthorizedException('Student session is no longer valid.');
    }

    return {
      studentId: identity.id,
      studentCode: identity.studentCode,
    };
  }
}
