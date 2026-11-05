import type { SentenceSegment, WordToken } from '../reading-assistant.types.js';

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const SENTENCE_FALLBACK = /[^.!?…]+[.!?…]+|[^.!?…]+$/gu;

/**
 * Normalizes user-supplied reading material without flattening paragraph
 * breaks. All API offsets refer to this normalized text.
 */
/* eslint-disable no-control-regex -- OCR normalization intentionally strips control characters. */
export function normalizeReadingText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \u00A0]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function tokenizeWords(text: string): WordToken[] {
  const words: WordToken[] = [];
  const regex = new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags);

  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) {
      continue;
    }

    const value = match[0];
    words.push({
      index: words.length,
      text: value,
      startOffset: match.index,
      endOffset: match.index + value.length,
    });
  }

  return words;
}

export function segmentSentences(text: string, locale: string): SentenceSegment[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const rawSegments: Array<{ readonly segment: string; readonly index: number }> = [];

  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    for (const part of segmenter.segment(text)) {
      rawSegments.push({ segment: part.segment, index: part.index });
    }
  } else {
    const regex = new RegExp(SENTENCE_FALLBACK.source, SENTENCE_FALLBACK.flags);
    for (const match of text.matchAll(regex)) {
      if (match.index !== undefined) {
        rawSegments.push({ segment: match[0], index: match.index });
      }
    }
  }

  const sentences: SentenceSegment[] = [];

  for (const raw of rawSegments) {
    const leadingWhitespace = raw.segment.length - raw.segment.trimStart().length;
    const content = raw.segment.trim();
    if (content.length === 0) {
      continue;
    }

    const startOffset = raw.index + leadingWhitespace;
    sentences.push({
      index: sentences.length,
      text: content,
      startOffset,
      endOffset: startOffset + content.length,
    });
  }

  return sentences;
}

export function countParagraphs(text: string): number {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0).length;
}

export function trimRange(
  text: string,
  startOffset: number,
  endOffset: number,
): { startOffset: number; endOffset: number; text: string } | null {
  let start = Math.max(0, startOffset);
  let end = Math.min(text.length, endOffset);

  while (start < end && /\s/.test(text[start] ?? '')) {
    start += 1;
  }
  while (end > start && /\s/.test(text[end - 1] ?? '')) {
    end -= 1;
  }

  if (start >= end) {
    return null;
  }

  return {
    startOffset: start,
    endOffset: end,
    text: text.slice(start, end),
  };
}
