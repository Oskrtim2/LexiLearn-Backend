import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel, ReadingLanguage } from '../reading-assistant.types.js';

export class SyllableDto {
  @ApiProperty({ example: 'ma' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 2 })
  endOffset!: number;
}

export class WordSyllablesDto {
  @ApiProperty({ example: 0, description: 'Global zero-based word index.' })
  index!: number;

  @ApiProperty({ example: 'mamá' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 4 })
  endOffset!: number;

  @ApiProperty({ example: 2 })
  syllableCount!: number;

  @ApiProperty({ type: [SyllableDto] })
  syllables!: SyllableDto[];
}

export class MicroChunkResponseDto {
  @ApiProperty({ example: 'Cuando la lectura se siente grande,' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 33 })
  endOffset!: number;

  @ApiProperty({ example: 0, description: 'Global first word index.' })
  startWordIndex!: number;

  @ApiProperty({ example: 5, description: 'Global last word index.' })
  endWordIndex!: number;

  @ApiProperty({ example: 6 })
  wordCount!: number;

  @ApiProperty({ example: 3 })
  estimatedSeconds!: number;
}

export class SentenceAnalysisDto {
  @ApiProperty({ example: 0 })
  index!: number;

  @ApiProperty({ example: 'Cuando la lectura se siente grande, podemos dividirla.' })
  text!: string;

  @ApiProperty({ example: 0 })
  startOffset!: number;

  @ApiProperty({ example: 57 })
  endOffset!: number;

  @ApiProperty({ example: 8 })
  wordCount!: number;

  @ApiProperty({ example: 4 })
  estimatedSeconds!: number;

  @ApiProperty({ type: [MicroChunkResponseDto] })
  microChunks!: MicroChunkResponseDto[];
}

export class ReadingStatisticsDto {
  @ApiProperty({ example: 1200 })
  characters!: number;

  @ApiProperty({ example: 212 })
  words!: number;

  @ApiProperty({ example: 18 })
  sentences!: number;

  @ApiProperty({ example: 4 })
  paragraphs!: number;

  @ApiProperty({ example: 11.8 })
  averageWordsPerSentence!: number;
}

export class ReadingTimeDto {
  @ApiProperty({ example: 96, description: 'Estimated whole-text reading time in seconds.' })
  estimatedSeconds!: number;

  @ApiProperty({ example: 1.6, description: 'Estimated whole-text reading time in minutes.' })
  estimatedMinutes!: number;

  @ApiProperty({ example: 150 })
  wordsPerMinute!: number;
}

export class ChunkingMetadataDto {
  @ApiProperty({ example: 12 })
  maxWordsPerChunk!: number;

  @ApiProperty({
    example: 'clause-aware-greedy',
    description: 'Sentence segments are split at clause boundaries when possible.',
  })
  strategy!: string;
}

export class DifficultyAssessmentDto {
  @ApiProperty({
    example: 38,
    minimum: 0,
    maximum: 100,
    description: 'Inverted readability score: 0 is easiest, 100 is hardest.',
  })
  score!: number;

  @ApiProperty({ enum: DifficultyLevel, example: DifficultyLevel.Moderate })
  level!: DifficultyLevel;

  @ApiProperty({ example: 62.4 })
  fleschReadingEase!: number;

  @ApiProperty({ example: 9.5 })
  averageSentenceLength!: number;

  @ApiProperty({ example: 1.62 })
  averageSyllablesPerWord!: number;

  @ApiProperty({ example: 18.4 })
  polysyllabicWordPercentage!: number;
}

export class ProcessTextResponseDto {
  @ApiProperty({ enum: ReadingLanguage })
  language!: ReadingLanguage;

  @ApiProperty({ description: 'Normalized text; all offsets refer to this string.' })
  text!: string;

  @ApiProperty({ type: ReadingStatisticsDto })
  statistics!: ReadingStatisticsDto;

  @ApiProperty({ type: ReadingTimeDto })
  readingTime!: ReadingTimeDto;

  @ApiProperty({ type: DifficultyAssessmentDto })
  difficulty!: DifficultyAssessmentDto;

  @ApiProperty({ type: ChunkingMetadataDto })
  chunking!: ChunkingMetadataDto;

  @ApiProperty({ type: [SentenceAnalysisDto] })
  sentences!: SentenceAnalysisDto[];

  @ApiProperty({ type: [WordSyllablesDto] })
  words!: WordSyllablesDto[];
}
