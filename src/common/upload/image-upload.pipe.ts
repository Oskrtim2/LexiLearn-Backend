import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { basename } from 'node:path';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type SupportedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface ValidatedImageFile {
  readonly buffer: Buffer;
  readonly originalFilename: string;
  readonly mimeType: SupportedImageMimeType;
  readonly sizeBytes: number;
}

interface DetectedImage {
  readonly mimeType: SupportedImageMimeType;
  readonly extension: string;
}

export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }

  return null;
}

@Injectable()
export class ImageUploadPipe implements PipeTransform<
  Express.Multer.File | undefined,
  ValidatedImageFile
> {
  transform(file: Express.Multer.File | undefined): ValidatedImageFile {
    if (!file || !Buffer.isBuffer(file.buffer) || file.size === 0) {
      throw new BadRequestException('image must be a valid image file buffer');
    }

    if (file.size >= MAX_IMAGE_BYTES) {
      throw new BadRequestException('image must be smaller than 10 MB');
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException('image must be a PNG, JPEG, or WebP file');
    }

    const safeName = this.sanitizeFilename(file.originalname ?? `upload.${detected.extension}`);

    return {
      buffer: file.buffer,
      originalFilename: safeName,
      mimeType: detected.mimeType,
      sizeBytes: file.size,
    };
  }

  private sanitizeFilename(name: string): string {
    const base = basename(name)
      .replace(/[^\w.\- ()]/g, '_')
      .slice(0, 200)
      .trim();
    return base.length > 0 ? base : 'upload';
  }
}
