import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Provider } from '@nestjs/common';
import { OcrModule } from '../ocr/ocr.module.js';
import { StudentsModule } from '../students/students.module.js';
import { TtsController } from './tts.controller.js';
import { TtsRepository } from './tts.repository.js';
import { TtsService } from './tts.service.js';
import { TTS_PROVIDER } from './providers/tts-provider.interface.js';
import type { TtsProvider } from './providers/tts-provider.interface.js';
import { AwsPollyTtsProvider } from './providers/aws-polly-tts.provider.js';
import { GoogleTtsProvider } from './providers/google-tts.provider.js';

const ttsProvider: Provider = {
  provide: TTS_PROVIDER,
  inject: [ConfigService, AwsPollyTtsProvider, GoogleTtsProvider],
  useFactory: (
    configService: ConfigService,
    aws: AwsPollyTtsProvider,
    google: GoogleTtsProvider,
  ): TtsProvider => {
    return configService.getOrThrow<string>('tts.provider') === 'google' ? google : aws;
  },
};

@Module({
  imports: [StudentsModule, OcrModule],
  controllers: [TtsController],
  providers: [TtsService, TtsRepository, AwsPollyTtsProvider, GoogleTtsProvider, ttsProvider],
})
export class TtsModule {}
