import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { OcrController } from './ocr.controller.js';
import { OcrRepository } from './ocr.repository.js';
import { OcrService } from './ocr.service.js';
import { OcrTextStructuringService } from './services/ocr-text-structuring.service.js';
import { OCR_PROVIDER } from './providers/ocr-provider.interface.js';
import type { OcrProvider } from './providers/ocr-provider.interface.js';
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider.js';
import { TextractOcrProvider } from './providers/textract-ocr.provider.js';

const ocrProvider: Provider = {
  provide: OCR_PROVIDER,
  inject: [ConfigService, TesseractOcrProvider, TextractOcrProvider],
  useFactory: (
    configService: ConfigService,
    tesseract: TesseractOcrProvider,
    textract: TextractOcrProvider,
  ): OcrProvider => {
    return configService.getOrThrow<string>('ocr.provider') === 'textract' ? textract : tesseract;
  },
};

@Module({
  controllers: [OcrController],
  providers: [
    OcrService,
    OcrRepository,
    OcrTextStructuringService,
    TesseractOcrProvider,
    TextractOcrProvider,
    ocrProvider,
  ],
  exports: [OcrRepository],
})
export class OcrModule {}
