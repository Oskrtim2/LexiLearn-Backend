import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { ValidatedImageFile } from '../../common/upload/image-upload.pipe.js';
import type { OcrExtractResponseDto } from './dto/ocr.dto.js';
import { OcrRepository } from './ocr.repository.js';
import { OcrTextStructuringService } from './services/ocr-text-structuring.service.js';
import { OCR_PROVIDER } from './providers/ocr-provider.interface.js';
import type { OcrProvider } from './providers/ocr-provider.interface.js';
import { ReadingLanguage } from '../reading-assistant/reading-assistant.types.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly textLanguage: ReadingLanguage;
  private readonly textLocale: string;

  constructor(
    @Inject(OCR_PROVIDER) private readonly provider: OcrProvider,
    private readonly structuringService: OcrTextStructuringService,
    private readonly ocrRepository: OcrRepository,
    configService: ConfigService,
  ) {
    this.textLocale = configService.getOrThrow<string>('ocr.textLocale');
    this.textLanguage = this.textLocale.toLowerCase().startsWith('es')
      ? ReadingLanguage.Spanish
      : ReadingLanguage.English;
  }

  async extract(studentId: string, file: ValidatedImageFile): Promise<OcrExtractResponseDto> {
    const startedAt = Date.now();
    let result: { text: string; confidence: number | null };

    try {
      result = await this.provider.extract({
        buffer: file.buffer,
        mimeType: file.mimeType,
        filename: file.originalFilename,
      });
    } catch (error: unknown) {
      this.logger.error(
        `OCR provider ${this.provider.name} failed for ${studentId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'The image could not be read right now. Please try again in a moment.',
      );
    }

    if (result.text.trim().length === 0) {
      throw new UnprocessableEntityException(
        'No readable text was found. Try a clearer, well-lit image.',
      );
    }

    const structured = this.structuringService.structure(
      result.text,
      this.textLanguage,
      this.textLocale,
    );

    if (structured.chunks.length === 0) {
      throw new UnprocessableEntityException(
        'No readable sentences were found. Try a clearer image.',
      );
    }

    const documentId = randomUUID();
    const processingMs = Date.now() - startedAt;
    const confidence = result.confidence === null ? null : Math.round(result.confidence * 10) / 10;

    await this.ocrRepository.persistDocument({
      id: documentId,
      studentId,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      provider: this.provider.name,
      confidence,
      processingMs,
      rawText: result.text,
      normalizedText: structured.text,
      blocks: structured.blocks,
      chunks: structured.chunks,
      wordCount: structured.statistics.words,
      sentenceCount: structured.statistics.sentences,
      paragraphCount: structured.statistics.paragraphs,
    });

    return {
      documentId,
      provider: this.provider.name,
      confidence,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      text: structured.text,
      statistics: {
        paragraphs: structured.statistics.paragraphs,
        sentences: structured.statistics.sentences,
        words: structured.statistics.words,
        characters: structured.statistics.characters,
        processingMs,
      },
      blocks: structured.blocks,
    };
  }
}
