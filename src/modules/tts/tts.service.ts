import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import type { TtsVoicePersona } from '@prisma/client';
import { TokenService } from '../../common/security/token.service.js';
import { OcrRepository } from '../ocr/ocr.repository.js';
import { StudentsRepository } from '../students/students.repository.js';
import type { SynthesizeSpeechDto, SynthesizeSpeechResponseDto } from './dto/tts.dto.js';
import { TTS_PROVIDER } from './providers/tts-provider.interface.js';
import type { TtsProvider } from './providers/tts-provider.interface.js';
import { TtsRepository } from './tts.repository.js';
import type { CachedAudio } from './tts.repository.js';

const MAX_TTS_CHARACTERS = 5000;

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly publicBaseUrl: string;
  private readonly apiPrefix: string;

  constructor(
    @Inject(TTS_PROVIDER) private readonly provider: TtsProvider,
    private readonly ttsRepository: TtsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly ocrRepository: OcrRepository,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.publicBaseUrl = configService.getOrThrow<string>('app.publicBaseUrl');
    const prefix = configService.getOrThrow<string>('app.apiPrefix').replace(/^\/+|\/+$/g, '');
    this.apiPrefix = prefix.length > 0 ? `/${prefix}` : '';
  }

  async synthesize(
    studentId: string,
    dto: SynthesizeSpeechDto,
  ): Promise<SynthesizeSpeechResponseDto> {
    const hasText = dto.text !== undefined;
    const hasChunk = dto.textChunkId !== undefined;

    if (hasText === hasChunk) {
      throw new BadRequestException('Provide exactly one of text or textChunkId');
    }

    const student = await this.studentsRepository.findById(studentId);
    if (!student) {
      throw new UnauthorizedException('Student session is no longer valid.');
    }

    let text: string;
    let textChunkId: string | null = null;

    if (dto.textChunkId) {
      const chunk = await this.ocrRepository.findOwnedChunk(dto.textChunkId, studentId);
      if (!chunk) {
        throw new NotFoundException('Text chunk not found');
      }
      text = this.normalizeText(chunk.text);
      textChunkId = chunk.id;
    } else {
      text = this.normalizeText(dto.text ?? '');
    }

    if (text.length === 0) {
      throw new BadRequestException('text must contain readable content');
    }

    if (text.length > MAX_TTS_CHARACTERS) {
      throw new BadRequestException(
        `text must be ${MAX_TTS_CHARACTERS} characters or fewer for a single audio segment`,
      );
    }

    const persona: TtsVoicePersona = dto.voice?.persona ?? student.ttsVoicePersona;
    const voiceId = this.provider.resolveVoiceId(persona, dto.voice?.voiceId);
    const speed = this.round(this.clamp(dto.voice?.speed ?? student.speechRate, 0.75, 1.25), 2);
    const pitch = this.round(this.clamp(dto.voice?.pitch ?? student.speechPitch, 0.75, 1.5), 2);
    const contentHash = this.contentHash(text, voiceId, speed, pitch);
    const cached = await this.ttsRepository.findCachedByHash(contentHash);

    if (cached) {
      await this.ttsRepository.touch(cached.id);
      return this.toResponse(cached, text, textChunkId, true);
    }

    const synthesized = await this.ttsRepository.synthesizeAndCache({
      contentHash,
      provider: this.provider.name,
      voiceId,
      speed,
      pitch,
      synthesize: async () => {
        try {
          return await this.provider.synthesize({ text, voiceId, speed, pitch });
        } catch (error: unknown) {
          this.logger.error(
            `TTS provider ${this.provider.name} failed (${contentHash.slice(0, 12)})`,
            error instanceof Error ? error.stack : String(error),
          );
          throw new BadGatewayException(
            'The audio could not be prepared right now. Please try again in a moment.',
          );
        }
      },
    });

    return this.toResponse(synthesized.asset, text, textChunkId, !synthesized.created);
  }

  async getAudio(assetId: string, token: string): Promise<CachedAudio> {
    const tokenAssetId = await this.tokenService.verifyAudioUrl(token);

    if (tokenAssetId !== assetId) {
      throw new UnauthorizedException('This audio link is not valid.');
    }

    const asset = await this.ttsRepository.findAudio(assetId);
    if (!asset) {
      throw new NotFoundException('Audio not found');
    }

    return asset;
  }

  private contentHash(text: string, voiceId: string, speed: number, pitch: number): string {
    const canonical = JSON.stringify({
      version: 1,
      text,
      provider: this.provider.name,
      voiceId,
      speed: speed.toFixed(2),
      pitch: pitch.toFixed(2),
    });

    return createHash('sha256').update(canonical).digest('hex');
  }

  private normalizeText(text: string): string {
    return text.normalize('NFC').replace(/\s+/g, ' ').trim();
  }

  private async toResponse(
    asset: {
      readonly id: string;
      readonly provider: string;
      readonly voiceId: string;
      readonly speed: number;
      readonly pitch: number;
      readonly mimeType: string;
      readonly durationMs: number | null;
    },
    text: string,
    textChunkId: string | null,
    cached: boolean,
  ): Promise<SynthesizeSpeechResponseDto> {
    const signed = await this.tokenService.signAudioUrl(asset.id);
    const signedUrl = `${this.publicBaseUrl}${this.apiPrefix}/tts/audio/${asset.id}?token=${encodeURIComponent(signed.urlToken)}`;

    return {
      assetId: asset.id,
      textChunkId,
      text,
      provider: asset.provider,
      voiceId: asset.voiceId,
      speed: asset.speed,
      pitch: asset.pitch,
      mimeType: asset.mimeType,
      signedUrl,
      expiresAt: signed.expiresAt,
      cached,
      characterCount: text.length,
      durationMs: asset.durationMs,
    };
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    if (!Number.isFinite(value)) {
      return minimum;
    }
    return Math.min(maximum, Math.max(minimum, value));
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
