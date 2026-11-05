import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech';
import type { TtsVoicePersona } from '@prisma/client';
import type {
  TtsProvider,
  TtsProviderResult,
  TtsSynthesisInput,
} from './tts-provider.interface.js';

@Injectable()
export class GoogleTtsProvider implements TtsProvider {
  readonly name = 'google-cloud-tts';
  private readonly client: TextToSpeechClient;
  private readonly languageCode: string;
  private readonly voices: Readonly<Record<string, string>>;

  constructor(configService: ConfigService) {
    const keyFilename = configService.getOrThrow<string>('tts.googleApplicationCredentials');
    this.client =
      keyFilename.length > 0 ? new TextToSpeechClient({ keyFilename }) : new TextToSpeechClient();
    this.languageCode = configService.getOrThrow<string>('tts.googleLanguageCode');
    this.voices = configService.getOrThrow<Readonly<Record<string, string>>>('tts.googleVoices');
  }

  resolveVoiceId(persona: TtsVoicePersona, requestedVoiceId?: string): string {
    const requested = requestedVoiceId?.trim();
    if (requested && requested.length > 0) {
      return requested;
    }

    return this.voices[persona] ?? this.voices['CHILD_FRIENDLY'] ?? 'en-US-Neural2-A';
  }

  async synthesize(input: TtsSynthesisInput): Promise<TtsProviderResult> {
    const pitchSemitones = Math.max(-20, Math.min(20, (input.pitch - 1) * 12));

    const [response] = await this.client.synthesizeSpeech({
      input: { text: input.text },
      voice: {
        languageCode: this.languageCode,
        name: input.voiceId,
      },
      audioConfig: {
        audioEncoding: protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: input.speed,
        pitch: pitchSemitones,
      },
    });

    if (!response.audioContent || response.audioContent.length === 0) {
      throw new Error('Google Cloud Text-to-Speech returned empty audio');
    }

    const audio = Buffer.isBuffer(response.audioContent)
      ? response.audioContent
      : Buffer.from(response.audioContent);

    return {
      audio,
      mimeType: 'audio/mpeg',
      durationMs: null,
    };
  }
}
