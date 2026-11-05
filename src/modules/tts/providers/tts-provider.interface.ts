import type { TtsVoicePersona } from '@prisma/client';

export const TTS_PROVIDER = Symbol('TTS_PROVIDER');

export interface TtsSynthesisInput {
  readonly text: string;
  readonly voiceId: string;
  readonly speed: number;
  readonly pitch: number;
}

export interface TtsProviderResult {
  readonly audio: Buffer;
  readonly mimeType: 'audio/mpeg';
  readonly durationMs: number | null;
}

export interface TtsProvider {
  readonly name: string;
  resolveVoiceId(persona: TtsVoicePersona, requestedVoiceId?: string): string;
  synthesize(input: TtsSynthesisInput): Promise<TtsProviderResult>;
}
