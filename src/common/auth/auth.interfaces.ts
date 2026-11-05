import type { Request } from 'express';

export interface JwtAccessPayload {
  readonly sub: string;
  readonly studentCode: string;
  readonly kind: 'access';
  readonly iat?: number;
  readonly exp?: number;
}

export interface JwtQrPayload {
  readonly sub: string;
  readonly kind: 'qr';
  readonly version: number;
  readonly iat?: number;
  readonly exp?: number;
}

export interface TtsUrlPayload {
  readonly sub: string;
  readonly kind: 'tts-audio';
  readonly iat?: number;
  readonly exp?: number;
}

export interface AuthenticatedStudent {
  readonly studentId: string;
  readonly studentCode: string;
}

export interface StudentRequest extends Request {
  user?: AuthenticatedStudent;
}
