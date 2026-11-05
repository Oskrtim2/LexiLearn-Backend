import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OcrParagraphDto, OcrSentenceDto } from '../dto/ocr.dto.js';
import type { ReadingLanguage } from '../../reading-assistant/reading-assistant.types.js';
import {
  segmentSentences,
  tokenizeWords,
} from '../../reading-assistant/utils/text-segmentation.js';

interface PageLine {
  readonly text: string;
  readonly isBlank: boolean;
  dropped: boolean;
}

interface NormalizedParagraph {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface OcrTextChunkInput {
  readonly id: string;
  readonly order: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly wordCount: number;
}

export interface StructuredOcrResult {
  readonly text: string;
  readonly blocks: OcrParagraphDto[];
  readonly chunks: OcrTextChunkInput[];
  readonly statistics: {
    readonly paragraphs: number;
    readonly sentences: number;
    readonly words: number;
    readonly characters: number;
  };
}

/* eslint-disable no-control-regex -- OCR cleanup intentionally matches control characters. */
const PAGE_ARTIFACT =
  /^(?:[-–—]\s*)?(?:(?:page|p[aá]g(?:ina)?)\.?\s*[:#-]?\s*[ivxlcdm\d]{1,8}(?:\s*(?:of|de)\s*\d{1,4})?|\d{1,4})(?:\s*[-–—])?$/i;
const SYMBOL_ONLY = /^[\s|_~·•*=+\-–—]+$/u;

@Injectable()
export class OcrTextStructuringService {
  structure(rawText: string, language: ReadingLanguage, locale: string): StructuredOcrResult {
    const paragraphTexts = this.normalizeIntoParagraphs(rawText);
    const normalizedText = paragraphTexts.join('\n\n');
    const paragraphs = this.withOffsets(paragraphTexts);
    const blocks: OcrParagraphDto[] = [];
    const chunks: OcrTextChunkInput[] = [];
    let wordCount = 0;
    let sentenceCount = 0;

    for (const paragraph of paragraphs) {
      const paragraphSentences = segmentSentences(paragraph.text, locale);
      const sentences: OcrSentenceDto[] = [];

      for (const segment of paragraphSentences) {
        const chunkId = randomUUID();
        const sentenceStart = paragraph.startOffset + segment.startOffset;
        const sentenceText = segment.text;
        const words = tokenizeWords(sentenceText).map((word) => ({
          index: word.index,
          text: word.text,
          startOffset: sentenceStart + word.startOffset,
          endOffset: sentenceStart + word.endOffset,
        }));

        if (words.length === 0) {
          continue;
        }

        const sentence: OcrSentenceDto = {
          chunkId,
          index: sentences.length,
          text: sentenceText,
          startOffset: sentenceStart,
          endOffset: sentenceStart + sentenceText.length,
          wordCount: words.length,
          words,
        };
        sentences.push(sentence);
        chunks.push({
          id: chunkId,
          order: chunks.length,
          text: sentenceText,
          startOffset: sentence.startOffset,
          endOffset: sentence.endOffset,
          wordCount: words.length,
        });
        wordCount += words.length;
        sentenceCount += 1;
      }

      if (sentences.length > 0) {
        blocks.push({
          index: blocks.length,
          text: paragraph.text,
          startOffset: paragraph.startOffset,
          endOffset: paragraph.endOffset,
          sentenceCount: sentences.length,
          sentences,
        });
      }
    }

    return {
      text: normalizedText,
      blocks,
      chunks,
      statistics: {
        paragraphs: blocks.length,
        sentences: sentenceCount,
        words: wordCount,
        characters: normalizedText.length,
      },
    };
  }

  /**
   * Cleans scanned text and removes common page artifacts:
   * - repeated running headers/footers across pages,
   * - page labels and isolated page numbers,
   * - scanner noise, control characters, and hyphenated line wraps.
   */
  normalizeIntoParagraphs(rawText: string): string[] {
    if (rawText.trim().length === 0) {
      return [];
    }

    const pages = rawText
      .normalize('NFKC')
      .replace(/\r\n?/g, '\n')
      .split(/\f+/)
      .map((page) => page.split('\n').map((line) => this.cleanLine(line)));

    this.dropRunningHeadersAndFooters(pages);

    const paragraphs: string[] = [];
    let current: string[] = [];

    const flush = (): void => {
      if (current.length === 0) {
        return;
      }

      const paragraph = this.finishParagraph(current.join(' '));
      current = [];
      if (paragraph.length > 0) {
        paragraphs.push(paragraph);
      }
    };

    for (const page of pages) {
      for (const line of page) {
        if (line.dropped || line.isBlank) {
          if (!line.dropped) {
            flush();
          }
          continue;
        }

        if (current.length === 0) {
          current.push(line.text);
          continue;
        }

        const previous = current[current.length - 1];
        const shouldDehyphenate =
          previous !== undefined && /[\p{L}]-$/u.test(previous) && /^[\p{Ll}]/u.test(line.text);

        if (shouldDehyphenate) {
          current[current.length - 1] = `${previous.slice(0, -1)}${line.text}`;
        } else {
          current.push(line.text);
        }
      }

      // A page boundary is always a safe paragraph boundary.
      flush();
    }

    return paragraphs;
  }

  private cleanLine(line: string): PageLine {
    const cleaned = line
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
      .replace(/\t/g, ' ')
      .replace(/[ \u00A0]+/g, ' ')
      .trim();

    if (cleaned.length === 0) {
      return { text: '', isBlank: true, dropped: false };
    }

    if (PAGE_ARTIFACT.test(cleaned) || SYMBOL_ONLY.test(cleaned)) {
      return { text: '', isBlank: false, dropped: true };
    }

    return {
      text: cleaned
        .replace(/^[|_~]+\s*/, '')
        .replace(/\s*[|_~]+$/, '')
        .trim(),
      isBlank: false,
      dropped: false,
    };
  }

  private dropRunningHeadersAndFooters(pages: PageLine[][]): void {
    if (pages.length < 2) {
      return;
    }

    const candidates: Array<{
      readonly page: number;
      readonly index: number;
      readonly key: string;
    }> = [];

    pages.forEach((page, pageIndex) => {
      const nonEmpty = page
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => !line.isBlank && !line.dropped);

      if (nonEmpty.length < 2) {
        return;
      }

      const first = nonEmpty[0];
      const last = nonEmpty[nonEmpty.length - 1];

      if (first) {
        candidates.push({
          page: pageIndex,
          index: first.index,
          key: this.lineKey(first.line.text),
        });
      }
      if (last && last.index !== first?.index) {
        candidates.push({
          page: pageIndex,
          index: last.index,
          key: this.lineKey(last.line.text),
        });
      }
    });

    const counts = new Map<string, number>();
    for (const candidate of candidates) {
      counts.set(candidate.key, (counts.get(candidate.key) ?? 0) + 1);
    }

    for (const candidate of candidates) {
      if ((counts.get(candidate.key) ?? 0) < 2) {
        continue;
      }

      const page = pages[candidate.page];
      const line = page?.[candidate.index];
      if (line) {
        line.dropped = true;
      }
    }
  }

  private lineKey(line: string): string {
    return line.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  }

  private finishParagraph(paragraph: string): string {
    return paragraph
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([,.;:!?…])/g, '$1')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private withOffsets(paragraphs: readonly string[]): NormalizedParagraph[] {
    const result: NormalizedParagraph[] = [];
    let offset = 0;

    for (const text of paragraphs) {
      if (text.length === 0) {
        continue;
      }

      result.push({
        text,
        startOffset: offset,
        endOffset: offset + text.length,
      });
      offset += text.length + 2;
    }

    return result;
  }
}
