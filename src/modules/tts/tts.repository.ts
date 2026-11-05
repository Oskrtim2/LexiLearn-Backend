import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { TtsProviderResult } from './providers/tts-provider.interface.js';

const ASSET_METADATA_SELECT = {
  id: true,
  contentHash: true,
  provider: true,
  voiceId: true,
  speed: true,
  pitch: true,
  mimeType: true,
  byteSize: true,
  durationMs: true,
  createdAt: true,
  lastAccessedAt: true,
} satisfies Prisma.TtsAssetSelect;

export type TtsAssetMetadata = Prisma.TtsAssetGetPayload<{
  select: typeof ASSET_METADATA_SELECT;
}>;

export interface SynthesizeAndCacheInput {
  readonly contentHash: string;
  readonly provider: string;
  readonly voiceId: string;
  readonly speed: number;
  readonly pitch: number;
  readonly synthesize: () => Promise<TtsProviderResult>;
}

export interface CachedAudio {
  readonly id: string;
  readonly mimeType: string;
  readonly audioData: Buffer;
  readonly byteSize: number;
}

@Injectable()
export class TtsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCachedByHash(contentHash: string): Promise<TtsAssetMetadata | null> {
    return this.prisma.ttsAsset.findUnique({
      where: { contentHash },
      select: ASSET_METADATA_SELECT,
    });
  }

  /**
   * Serializes cache misses for the same content hash with a PostgreSQL
   * transaction-scoped advisory lock, then re-checks the cache. This prevents
   * two API instances from billing the same synthesis request twice.
   */
  async synthesizeAndCache(
    input: SynthesizeAndCacheInput,
  ): Promise<{ readonly asset: TtsAssetMetadata; readonly created: boolean }> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.contentHash}))`;

        const existing = await transaction.ttsAsset.findUnique({
          where: { contentHash: input.contentHash },
          select: ASSET_METADATA_SELECT,
        });

        if (existing) {
          return { asset: existing, created: false };
        }

        const synthesized = await input.synthesize();
        const created = await transaction.ttsAsset.create({
          data: {
            contentHash: input.contentHash,
            provider: input.provider,
            voiceId: input.voiceId,
            speed: input.speed,
            pitch: input.pitch,
            mimeType: synthesized.mimeType,
            audioData: new Uint8Array(synthesized.audio),
            byteSize: synthesized.audio.byteLength,
            durationMs: synthesized.durationMs,
          },
          select: ASSET_METADATA_SELECT,
        });

        return { asset: created, created: true };
      },
      {
        maxWait: 10_000,
        timeout: 60_000,
      },
    );
  }

  async touch(assetId: string): Promise<void> {
    await this.prisma.ttsAsset.update({
      where: { id: assetId },
      data: { lastAccessedAt: new Date() },
    });
  }

  async findAudio(assetId: string): Promise<CachedAudio | null> {
    const asset = await this.prisma.ttsAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        mimeType: true,
        audioData: true,
        byteSize: true,
      },
    });

    if (!asset) {
      return null;
    }

    return {
      ...asset,
      audioData: Buffer.from(asset.audioData),
    };
  }
}
