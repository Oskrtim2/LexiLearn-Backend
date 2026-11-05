import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract';
import type { Block } from '@aws-sdk/client-textract';
import type { OcrProvider, OcrProviderInput, OcrProviderResult } from './ocr-provider.interface.js';

@Injectable()
export class TextractOcrProvider implements OcrProvider {
  readonly name = 'aws-textract';
  private readonly client: TextractClient;
  private readonly region: string;

  constructor(configService: ConfigService) {
    this.region = configService.getOrThrow<string>('ocr.textractRegion');
    this.client = new TextractClient({ region: this.region });
  }

  async extract(input: OcrProviderInput): Promise<OcrProviderResult> {
    const response = await this.client.send(
      new DetectDocumentTextCommand({
        Document: { Bytes: input.buffer },
      }),
    );

    const lines = (response.Blocks ?? [])
      .filter((block): block is Block & { Text: string } => {
        return block.BlockType === 'LINE' && typeof block.Text === 'string';
      })
      .sort((left, right) => {
        const pageDifference = (left.Page ?? 0) - (right.Page ?? 0);
        if (pageDifference !== 0) {
          return pageDifference;
        }

        const verticalDifference =
          (left.Geometry?.BoundingBox?.Top ?? 0) - (right.Geometry?.BoundingBox?.Top ?? 0);
        if (verticalDifference !== 0) {
          return verticalDifference;
        }

        return (left.Geometry?.BoundingBox?.Left ?? 0) - (right.Geometry?.BoundingBox?.Left ?? 0);
      });

    const text = lines.map((line) => line.Text).join('\n');
    const confidenceValues = lines
      .map((line) => line.Confidence)
      .filter((value): value is number => typeof value === 'number');
    const confidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length
        : null;

    return { text, confidence };
  }
}
