import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtQrPayload, TtsUrlPayload } from '../auth/auth.interfaces.js';

export const JWT_ISSUER = 'lexi-learn-api';
export const ACCESS_AUDIENCE = 'lexi-learn:access';
export const QR_AUDIENCE = 'lexi-learn:qr';
export const TTS_AUDIENCE = 'lexi-learn:tts-audio';

interface IssuedToken {
  readonly token: string;
  readonly expiresAt: string;
  readonly expiresInSeconds: number;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly accessTokenTtlSeconds: number;
  private readonly qrSecret: string;
  private readonly qrTokenTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret = this.configService.getOrThrow<string>('auth.accessSecret');
    this.accessTokenTtlSeconds = this.configService.getOrThrow<number>(
      'auth.accessTokenTtlSeconds',
    );
    this.qrSecret = this.configService.getOrThrow<string>('auth.qrSecret');
    this.qrTokenTtlSeconds = this.configService.getOrThrow<number>('auth.qrTokenTtlSeconds');
  }

  async issueAccessToken(studentId: string, studentCode: string): Promise<IssuedToken> {
    return this.issueToken(
      { sub: studentId, studentCode, kind: 'access' },
      this.accessSecret,
      ACCESS_AUDIENCE,
      this.accessTokenTtlSeconds,
    );
  }

  async issueQrToken(studentId: string, version: number): Promise<IssuedToken> {
    return this.issueToken(
      { sub: studentId, kind: 'qr', version },
      this.qrSecret,
      QR_AUDIENCE,
      this.qrTokenTtlSeconds,
    );
  }

  async verifyQrToken(token: string): Promise<JwtQrPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtQrPayload>(token, {
        secret: this.qrSecret,
        issuer: JWT_ISSUER,
        audience: QR_AUDIENCE,
        algorithms: ['HS256'],
      });

      if (payload.kind !== 'qr' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('This reader code is not valid.');
      }

      return payload;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('This reader code is not valid or has expired.');
    }
  }

  async signAudioUrl(assetId: string): Promise<{ urlToken: string; expiresAt: string }> {
    const ttsConfig = this.configService;
    const ttlSeconds = ttsConfig.getOrThrow<number>('tts.urlTtlSeconds');
    const token = await this.jwtService.signAsync(
      { sub: assetId, kind: 'tts-audio' },
      {
        secret: ttsConfig.getOrThrow<string>('tts.urlSigningSecret'),
        issuer: JWT_ISSUER,
        audience: TTS_AUDIENCE,
        expiresIn: ttlSeconds,
        algorithm: 'HS256',
      },
    );

    return {
      urlToken: token,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }

  async verifyAudioUrl(token: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<TtsUrlPayload>(token, {
        secret: this.configService.getOrThrow<string>('tts.urlSigningSecret'),
        issuer: JWT_ISSUER,
        audience: TTS_AUDIENCE,
        algorithms: ['HS256'],
      });

      if (payload.kind !== 'tts-audio' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('This audio link is not valid.');
      }

      return payload.sub;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('This audio link is not valid or has expired.');
    }
  }

  private async issueToken(
    payload: {
      readonly sub: string;
      readonly kind: 'access' | 'qr';
      readonly studentCode?: string;
      readonly version?: number;
    },
    secret: string,
    audience: string,
    ttlSeconds: number,
  ): Promise<IssuedToken> {
    const token = await this.jwtService.signAsync(payload, {
      secret,
      issuer: JWT_ISSUER,
      audience,
      expiresIn: ttlSeconds,
      algorithm: 'HS256',
    });

    return {
      token,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      expiresInSeconds: ttlSeconds,
    };
  }
}
