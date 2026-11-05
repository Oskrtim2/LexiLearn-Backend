import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedStudent, StudentRequest } from '../auth/auth.interfaces.js';

export const CurrentStudent = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedStudent => {
    const request = context.switchToHttp().getRequest<StudentRequest>();

    if (!request.user) {
      throw new UnauthorizedException('A valid student session is required.');
    }

    return request.user;
  },
);
