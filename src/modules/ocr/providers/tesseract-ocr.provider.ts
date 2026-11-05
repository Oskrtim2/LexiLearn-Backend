import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import Tesseract from 'tesseract.js';
import type { OcrProvider, OcrProviderInput, OcrProviderResult } from './ocr-provider.interface.js';

@Injectable()
export class TesseractOcrProvider implements OcrProvider, OnModuleDestroy {
  readonly name = 'tesseract';
  private readonly logger = new Logger(TesseractOcrProvider.name);
  private readonly languages: string;
  private readonly workerOptions: Partial<Tesseract.WorkerOptions>;
  private workerPromise: Promise<Tesseract.Worker> | null = null;
  private queueTail: Promise<void> = Promise.resolve();

  constructor(configService: ConfigService) {
    this.languages = configService.getOrThrow<string>('ocr.languages');
    this.workerOptions = {};

    const workerPath = configService.getOrThrow<string>('ocr.tesseractWorkerPath');
    const langPath = configService.getOrThrow<string>('ocr.tesseractLangPath');
    const cachePath = configService.getOrThrow<string>('ocr.tesseractCachePath');

    if (workerPath.length > 0) {
      this.workerOptions.workerPath = workerPath;
    }
    if (langPath.length > 0) {
      this.workerOptions.langPath = langPath;
    }
    if (cachePath.length > 0) {
      this.workerOptions.cachePath = cachePath;
      try {
        mkdirSync(cachePath, { recursive: true });
      } catch (error: unknown) {
        this.logger.warn(
          `Could not create Tesseract cache directory "${cachePath}"; language data may be downloaded again. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async extract(input: OcrProviderInput): Promise<OcrProviderResult> {
    // Tesseract workers are stateful and single-threaded. Jobs are serialized
    // per instance; production deployments that need parallel OCR should use
    // the Textract provider or run a dedicated OCR worker service.
    return this.enqueue(async () => {
      const worker = await this.getWorker();
      const result = await worker.recognize(input.buffer);

      return {
        text: result.data.text,
        confidence:
          typeof result.data.confidence === 'number'
            ? Math.max(0, Math.min(100, result.data.confidence))
            : null,
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.resetWorker();
  }

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.queueTail;
    let release = (): void => undefined;
    this.queueTail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await task();
    } finally {
      release();
    }
  }

  private async getWorker(): Promise<Tesseract.Worker> {
    if (!this.workerPromise) {
      this.workerPromise = this.initializeWorker().catch(async (error: unknown) => {
        this.workerPromise = null;
        throw error;
      });
    }

    return this.workerPromise;
  }

  private async initializeWorker(): Promise<Tesseract.Worker> {
    this.logger.log(`Starting local OCR worker (${this.languages})`);
    const worker = await Tesseract.createWorker(
      this.languages,
      Tesseract.OEM.LSTM_ONLY,
      this.workerOptions,
    );

    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });

    return worker;
  }

  private async resetWorker(): Promise<void> {
    const pending = this.workerPromise;
    this.workerPromise = null;

    if (!pending) {
      return;
    }

    try {
      const worker = await pending;
      await worker.terminate();
    } catch {
      // A failed worker is already unusable; there is nothing else to clean up.
    }
  }
}
