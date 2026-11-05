import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OcrWordDto {
  @ApiProperty({ example: 0, description: 'Zero-based word index inside the sentence.' })
  index!: number;

  @ApiProperty({ example: 'tranquilo' })
  text!: string;

  @ApiProperty({ example: 42, description: 'Global character offset in normalized text.' })
  startOffset!: number;

  @ApiProperty({ example: 51 })
  endOffset!: number;
}

export class OcrSentenceDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Stable sentence chunk ID accepted by POST /tts/synthesize.',
  })
  chunkId!: string;

  @ApiProperty({ example: 0 })
  index!: number;

  @ApiProperty({ example: 'Lee con calma.' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 13 })
  endOffset!: number;

  @ApiProperty({ example: 3 })
  wordCount!: number;

  @ApiProperty({ type: [OcrWordDto] })
  words!: OcrWordDto[];
}

export class OcrParagraphDto {
  @ApiProperty({ example: 0 })
  index!: number;

  @ApiProperty({ example: 'Lee con calma. Cada palabra cuenta.' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 31 })
  endOffset!: number;

  @ApiProperty({ example: 2 })
  sentenceCount!: number;

  @ApiProperty({ type: [OcrSentenceDto] })
  sentences!: OcrSentenceDto[];
}

export class OcrContentStatisticsDto {
  @ApiProperty({ example: 3 })
  paragraphs!: number;

  @ApiProperty({ example: 12 })
  sentences!: number;

  @ApiProperty({ example: 180 })
  words!: number;

  @ApiProperty({ example: 1050 })
  characters!: number;
}

export class OcrStatisticsDto extends OcrContentStatisticsDto {
  @ApiProperty({ example: 842, description: 'Image-to-text processing time.' })
  processingMs!: number;
}

export class OcrExtractResponseDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty({ example: 'tesseract' })
  provider!: string;

  @ApiPropertyOptional({ example: 94.2, nullable: true, description: 'Mean OCR confidence.' })
  confidence!: number | null;

  @ApiProperty({ example: 'worksheet.png' })
  originalFilename!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: 245_760 })
  sizeBytes!: number;

  @ApiProperty({
    description: 'Normalized text; all block, sentence and word offsets refer to it.',
  })
  text!: string;

  @ApiProperty({ type: OcrStatisticsDto })
  statistics!: OcrStatisticsDto;

  @ApiProperty({ type: [OcrParagraphDto] })
  blocks!: OcrParagraphDto[];
}

export class ExtractTextRequestDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PNG, JPEG, or WebP image under 10 MB. Magic bytes are verified server-side.',
  })
  image!: unknown;
}
