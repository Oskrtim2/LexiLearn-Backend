import { Injectable } from '@nestjs/common';
import { trimRange } from '../utils/text-segmentation.js';
import type { ReadingLanguage, SentenceSegment, WordToken } from '../reading-assistant.types.js';

export interface MicroChunkDraft {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly startWordIndex: number;
  readonly endWordIndex: number;
  readonly wordCount: number;
  readonly estimatedSeconds: number;
}

const SPANISH_CONJUNCTIONS = new Set([
  'y',
  'e',
  'o',
  'u',
  'pero',
  'porque',
  'aunque',
  'mientras',
  'sino',
  'sin',
  'embargo',
]);

const ENGLISH_CONJUNCTIONS = new Set([
  'and',
  'or',
  'but',
  'because',
  'although',
  'while',
  'yet',
  'so',
  'however',
]);

interface WordRange {
  readonly start: number;
  readonly end: number;
}

@Injectable()
export class MicroChunkerService {
  chunkSentence(
    fullText: string,
    sentence: SentenceSegment,
    sentenceWords: readonly WordToken[],
    maxWords: number,
    wordsPerMinute: number,
    language: ReadingLanguage,
  ): MicroChunkDraft[] {
    if (sentenceWords.length === 0) {
      return [];
    }

    const ranges = this.groupWords(sentence, sentenceWords, maxWords, language);

    return ranges
      .map((range): MicroChunkDraft | null => {
        const firstWord = sentenceWords[range.start];
        const lastWord = sentenceWords[range.end];

        if (!firstWord || !lastWord) {
          return null;
        }

        const startOffset = range.start === 0 ? sentence.startOffset : firstWord.startOffset;
        const endOffset =
          range.end === sentenceWords.length - 1
            ? sentence.endOffset
            : (sentenceWords[range.end + 1]?.startOffset ?? sentence.endOffset);
        const trimmed = trimRange(fullText, startOffset, endOffset);

        if (!trimmed) {
          return null;
        }

        const wordCount = range.end - range.start + 1;

        return {
          text: trimmed.text,
          startOffset: trimmed.startOffset,
          endOffset: trimmed.endOffset,
          startWordIndex: firstWord.index,
          endWordIndex: lastWord.index,
          wordCount,
          estimatedSeconds: Math.max(1, Math.ceil((wordCount / Math.max(1, wordsPerMinute)) * 60)),
        };
      })
      .filter((chunk): chunk is MicroChunkDraft => chunk !== null);
  }

  private groupWords(
    sentence: SentenceSegment,
    words: readonly WordToken[],
    maxWords: number,
    language: ReadingLanguage,
  ): WordRange[] {
    const ranges: WordRange[] = [];
    const safeMax = Math.max(1, maxWords);
    let start = 0;

    while (start < words.length) {
      const remaining = words.length - start;

      if (remaining <= safeMax) {
        ranges.push({ start, end: words.length - 1 });
        break;
      }

      const target = start + safeMax - 1;
      const preferred = this.findPreferredBreak(sentence, words, start, target, language);
      const end = preferred ?? target;

      ranges.push({ start, end });
      start = end + 1;
    }

    // Avoid a lonely one-word sliver at the end of a sentence.
    if (ranges.length > 1) {
      const last = ranges[ranges.length - 1];
      const previous = ranges[ranges.length - 2];

      if (last && previous) {
        const previousWords = previous.end - previous.start + 1;
        const lastWords = last.end - last.start + 1;

        if (lastWords < 3 && previousWords + lastWords <= safeMax + 3) {
          ranges.splice(ranges.length - 2, 2, {
            start: previous.start,
            end: last.end,
          });
        }
      }
    }

    return ranges;
  }

  private findPreferredBreak(
    sentence: SentenceSegment,
    words: readonly WordToken[],
    start: number,
    target: number,
    language: ReadingLanguage,
  ): number | null {
    const minimumChunkWords = Math.min(3, target - start + 1);
    const minimumBreak = start + minimumChunkWords - 1;
    const conjunctions = language === 'en' ? ENGLISH_CONJUNCTIONS : SPANISH_CONJUNCTIONS;

    for (let index = target; index >= minimumBreak; index -= 1) {
      const current = words[index];
      const next = words[index + 1];

      if (!current || !next) {
        continue;
      }

      const relativeEnd = current.endOffset - sentence.startOffset;
      const relativeNextStart = next.startOffset - sentence.startOffset;
      const between = sentence.text.slice(relativeEnd, relativeNextStart);

      if (/[,;:—–]/.test(between)) {
        return index;
      }

      if (conjunctions.has(next.text.toLocaleLowerCase(language))) {
        return index;
      }
    }

    return null;
  }
}
