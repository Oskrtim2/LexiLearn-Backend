import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STATUS_CODES } from 'node:http';
import type { Request, Response } from 'express';
import { ApiErrorResponseDto } from '../dto/api-error-response.dto.js';

interface ExceptionPayload {
  readonly message?: unknown;
  readonly error?: unknown;
}

interface ResolvedError {
  readonly statusCode: number;
  readonly messages: string[];
  readonly errorLabel?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const resolved = this.resolve(exception);
    const reason = STATUS_CODES[resolved.statusCode] ?? 'Error';
    const body: ApiErrorResponseDto = {
      statusCode: resolved.statusCode,
      timestamp: new Date().toISOString(),
      path: request.path,
      error: resolved.errorLabel ?? reason,
      message: resolved.messages,
    };

    if (resolved.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.path} -> ${resolved.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      messages: ['An unexpected error occurred. Please try again later.'],
    };
  }

  private fromHttpException(exception: HttpException): ResolvedError {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();
    const payload: ExceptionPayload = typeof raw === 'string' ? { message: raw } : raw;
    const messages = this.normalizeMessages(payload.message);
    const errorLabel =
      typeof payload.error === 'string' && payload.error.length > 0 ? payload.error : undefined;

    return { statusCode, messages, errorLabel };
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): ResolvedError {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          messages: ['A record with these values already exists.'],
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          messages: ['This operation conflicts with related data.'],
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          messages: ['The requested record was not found.'],
        };
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}`, exception.stack);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          messages: ['An unexpected database error occurred.'],
        };
    }
  }

  private normalizeMessages(message: unknown): string[] {
    if (Array.isArray(message)) {
      const messages = message.filter((item): item is string => typeof item === 'string');
      return messages.length > 0 ? messages : ['The request could not be processed.'];
    }

    if (typeof message === 'string' && message.trim().length > 0) {
      return [message];
    }

    return ['The request could not be processed.'];
  }
}
