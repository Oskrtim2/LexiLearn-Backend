import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Engine, PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import type { VoiceId } from '@aws-sdk/client-polly';
import type { TtsVoicePersona } from '@prisma/client';
import type {
  TtsProvider,
  TtsProviderResult,
  TtsSynthesisInput,
} from './tts-provider.interface.js';

@Injectable()
export class AwsPollyTtsProvider implements TtsProvider {
  readonly name = 'aws-polly';
  private readonly client: PollyClient;
  private readonly engine: Engine;
  private readonly voices: Readonly<Record<string, string>>;

  constructor(configService: ConfigService) {
    const accessKeyId = configService.getOrThrow<string>('tts.awsAccessKeyId');
    const secretAccessKey = configService.getOrThrow<string>('tts.awsSecretAccessKey');

    this.client = new PollyClient({
      region: configService.getOrThrow<string>('tts.region'),
      ...(accessKeyId.length > 0 && secretAccessKey.length > 0
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
    this.engine = this.toEngine(configService.getOrThrow<string>('tts.awsPollyEngine'));
    this.voices = configService.getOrThrow<Readonly<Record<string, string>>>('tts.awsVoices');
  }

  resolveVoiceId(persona: TtsVoicePersona, requestedVoiceId?: string): string {
    const requested = requestedVoiceId?.trim();
    if (requested && requested.length > 0) {
      return requested;
    }

    return this.voices[persona] ?? this.voices['CHILD_FRIENDLY'] ?? 'Joanna';
  }

  async synthesize(input: TtsSynthesisInput): Promise<TtsProviderResult> {
    const ratePercent = Math.round(input.speed * 100);
    const pitchPercent = Math.round((input.pitch - 1) * 100);
    const pitchWithSign = pitchPercent >= 0 ? `+${pitchPercent}%` : `${pitchPercent}%`;
    const ssml = [
      '<speak>',
      `<prosody rate="${ratePercent}%" pitch="${pitchWithSign}">`,
      this.escapeXml(input.text),
      '</prosody>',
      '</speak>',
    ].join('');

    const response = await this.client.send(
      new SynthesizeSpeechCommand({
        Text: ssml,
        TextType: 'ssml',
        OutputFormat: 'mp3',
        VoiceId: input.voiceId as VoiceId,
        Engine: this.engine,
      }),
    );

    if (!response.AudioStream) {
      throw new Error('Amazon Polly returned an empty audio stream');
    }

    const audio = await this.toBuffer(response.AudioStream);

    return {
      audio,
      mimeType: 'audio/mpeg',
      durationMs: null,
    };
  }

  private toEngine(value: string): Engine {
    switch (value) {
      case 'standard':
        return Engine.STANDARD;
      case 'generative':
        return Engine.GENERATIVE;
      case 'long-form':
        return Engine.LONG_FORM;
      case 'neural':
      default:
        return Engine.NEURAL;
    }
  }

  private async toBuffer(stream: unknown): Promise<Buffer> {
    const chunks: Buffer[] = [];

    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
