import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Protects classroom provisioning routes. This key is held by educators or
 * the school's identity provisioning service, never by students.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly expectedKey: string;

  constructor(configService: ConfigService) {
    this.expectedKey = configService.getOrThrow<string>('auth.adminApiKey');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-admin-api-key');

    if (!provided || !this.matches(provided, this.expectedKey)) {
      throw new UnauthorizedException('A valid educator provisioning key is required.');
    }

    return true;
  }

  private matches(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      // Run a comparison of equal length anyway, and fail regardless.
      timingSafeEqual(providedBuffer, providedBuffer);
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
