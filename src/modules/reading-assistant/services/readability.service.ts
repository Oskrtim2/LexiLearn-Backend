import { Injectable } from '@nestjs/common';
import { DifficultyLevel } from '../reading-assistant.types.js';
import type { ReadingLanguage, SyllabifiedWord } from '../reading-assistant.types.js';

export interface DifficultyAssessment {
  readonly score: number;
  readonly level: DifficultyLevel;
  readonly fleschReadingEase: number;
  readonly averageSentenceLength: number;
  readonly averageSyllablesPerWord: number;
  readonly polysyllabicWordPercentage: number;
}

@Injectable()
export class ReadabilityService {
  assess(
    words: readonly SyllabifiedWord[],
    sentenceCount: number,
    language: ReadingLanguage,
  ): DifficultyAssessment {
    const wordCount = Math.max(1, words.length);
    const safeSentenceCount = Math.max(1, sentenceCount);
    const syllableCount = words.reduce(
      (total, word) => total + Math.max(1, word.syllables.length),
      0,
    );
    const polysyllabicWords = words.filter((word) => word.syllables.length >= 3).length;

    const averageSentenceLength = words.length / safeSentenceCount;
    const averageSyllablesPerWord = syllableCount / wordCount;

    const fleschReadingEase = this.clamp(
      language === 'es'
        ? 206.84 - 60 * averageSyllablesPerWord - 1.02 * averageSentenceLength
        : 206.835 - 1.015 * averageSentenceLength - 84.6 * averageSyllablesPerWord,
      0,
      100,
    );

    const score = Math.round(100 - fleschReadingEase);

    return {
      score,
      level: this.classify(fleschReadingEase),
      fleschReadingEase: this.round(fleschReadingEase, 1),
      averageSentenceLength: this.round(averageSentenceLength, 1),
      averageSyllablesPerWord: this.round(averageSyllablesPerWord, 2),
      polysyllabicWordPercentage: this.round((polysyllabicWords / wordCount) * 100, 1),
    };
  }

  estimateReadingSeconds(
    wordCount: number,
    wordsPerMinute: number,
    averageSyllablesPerWord: number,
  ): number {
    const baseSeconds = (wordCount / wordsPerMinute) * 60;
    // Dense, polysyllabic prose needs a little extra processing time.
    const complexityFactor = 1 + Math.max(0, averageSyllablesPerWord - 1.5) * 0.08;
    return Math.max(1, Math.round(baseSeconds * complexityFactor));
  }

  private classify(fleschReadingEase: number): DifficultyLevel {
    if (fleschReadingEase >= 80) {
      return DifficultyLevel.Easy;
    }
    if (fleschReadingEase >= 60) {
      return DifficultyLevel.Moderate;
    }
    if (fleschReadingEase >= 40) {
      return DifficultyLevel.Challenging;
    }
    return DifficultyLevel.Advanced;
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
