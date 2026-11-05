import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { OcrParagraphDto } from './dto/ocr.dto.js';
import type { OcrTextChunkInput } from './services/ocr-text-structuring.service.js';

export interface PersistOcrDocumentInput {
  readonly id: string;
  readonly studentId: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly provider: string;
  readonly confidence: number | null;
  readonly processingMs: number;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly blocks: OcrParagraphDto[];
  readonly chunks: OcrTextChunkInput[];
  readonly wordCount: number;
  readonly sentenceCount: number;
  readonly paragraphCount: number;
}

export interface OwnedTextChunk {
  readonly id: string;
  readonly text: string;
  readonly documentId: string;
  readonly studentId: string;
}

@Injectable()
export class OcrRepository {
  constructor(private readonly prisma: PrismaService) {}

  async persistDocument(input: PersistOcrDocumentInput): Promise<void> {
    await this.prisma.ocrDocument.create({
      data: {
        id: input.id,
        studentId: input.studentId,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        provider: input.provider,
        confidence: input.confidence,
        processingMs: input.processingMs,
        rawText: input.rawText,
        normalizedText: input.normalizedText,
        blocks: input.blocks as unknown as Prisma.InputJsonValue,
        wordCount: input.wordCount,
        sentenceCount: input.sentenceCount,
        paragraphCount: input.paragraphCount,
        chunks: {
          create: input.chunks.map((chunk) => ({
            id: chunk.id,
            order: chunk.order,
            text: chunk.text,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            wordCount: chunk.wordCount,
          })),
        },
      },
    });
  }

  async existsOwnedDocument(documentId: string, studentId: string): Promise<boolean> {
    const document = await this.prisma.ocrDocument.findFirst({
      where: { id: documentId, studentId },
      select: { id: true },
    });

    return document !== null;
  }

  async findOwnedChunk(chunkId: string, studentId: string): Promise<OwnedTextChunk | null> {
    const chunk = await this.prisma.ocrTextChunk.findFirst({
      where: {
        id: chunkId,
        document: { studentId },
      },
      select: {
        id: true,
        text: true,
        documentId: true,
        document: { select: { studentId: true } },
      },
    });

    if (!chunk) {
      return null;
    }

    return {
      id: chunk.id,
      text: chunk.text,
      documentId: chunk.documentId,
      studentId: chunk.document.studentId,
    };
  }
}
