import { BadRequestException } from '@nestjs/common';
import { ImageUploadPipe, detectImageType } from './image-upload.pipe.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const makeFile = (buffer: Buffer, originalname = 'page.png'): Express.Multer.File => ({
  fieldname: 'image',
  originalname,
  encoding: '7bit',
  mimetype: 'image/png',
  size: buffer.length,
  buffer,
  destination: '',
  filename: originalname,
  path: '',
  stream: undefined as never,
});

describe('ImageUploadPipe', () => {
  const pipe = new ImageUploadPipe();

  it('accepts a valid PNG by magic bytes', () => {
    const result = pipe.transform(makeFile(PNG_1X1));

    expect(result.mimeType).toBe('image/png');
    expect(result.sizeBytes).toBe(PNG_1X1.length);
    expect(result.buffer).toEqual(PNG_1X1);
  });

  it('rejects missing, empty, and spoofed images', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
    expect(() => pipe.transform(makeFile(Buffer.alloc(0)))).toThrow(BadRequestException);

    const spoofed = Buffer.from('not really a png');
    expect(() => pipe.transform(makeFile(spoofed))).toThrow(BadRequestException);
  });

  it('detects JPEG and WebP signatures', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.mimeType).toBe('image/jpeg');
    const webp = Buffer.from('RIFF0000WEBP', 'ascii');
    expect(detectImageType(webp)?.mimeType).toBe('image/webp');
  });
});
