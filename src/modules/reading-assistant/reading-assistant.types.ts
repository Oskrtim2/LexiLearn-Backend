export enum ReadingLanguage {
  Spanish = 'es',
  English = 'en',
}

export enum DifficultyLevel {
  Easy = 'easy',
  Moderate = 'moderate',
  Challenging = 'challenging',
  Advanced = 'advanced',
}

export interface WordToken {
  readonly index: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface SentenceSegment {
  readonly index: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface SyllableSlice {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface SyllabifiedWord extends WordToken {
  readonly syllables: SyllableSlice[];
}
