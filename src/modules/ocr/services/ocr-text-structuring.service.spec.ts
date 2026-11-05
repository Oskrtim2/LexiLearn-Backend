import { ReadingLanguage } from '../../reading-assistant/reading-assistant.types.js';
import { OcrTextStructuringService } from './ocr-text-structuring.service.js';

describe('OcrTextStructuringService', () => {
  const service = new OcrTextStructuringService();

  it('removes page headers, page numbers, and hyphenated wraps', () => {
    const raw = [
      'LEXILEARN WORKSHEET',
      'Page 1 of 2',
      'La lectura tran-',
      'quila ayuda a apren-',
      'der con calma.',
      '\f',
      'LEXILEARN WORKSHEET',
      'Page 2 of 2',
      'Cada palabra es un paso.',
    ].join('\n');

    const paragraphs = service.normalizeIntoParagraphs(raw);

    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toBe('La lectura tranquila ayuda a aprender con calma.');
    expect(paragraphs[1]).toBe('Cada palabra es un paso.');
    expect(paragraphs.join(' ')).not.toContain('Page');
  });

  it('builds offset-addressable sentences, words, and TTS chunks', () => {
    const result = service.structure(
      'Lee con calma. Cada palabra cuenta.\n\nHoy es un buen dia.',
      ReadingLanguage.Spanish,
      'es',
    );

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]?.sentences).toHaveLength(2);
    expect(result.chunks).toHaveLength(3);
    expect(result.statistics.words).toBe(11);

    for (const block of result.blocks) {
      expect(result.text.slice(block.startOffset, block.endOffset)).toBe(block.text);
      for (const sentence of block.sentences) {
        expect(result.text.slice(sentence.startOffset, sentence.endOffset)).toBe(sentence.text);
        expect(sentence.chunkId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        for (const word of sentence.words) {
          expect(result.text.slice(word.startOffset, word.endOffset)).toBe(word.text);
        }
      }
    }
  });

  it('removes symbol-only scanner noise and returns no chunks for empty output', () => {
    const result = service.structure('— — —\n||||\n~~~', ReadingLanguage.Spanish, 'es');
    expect(result.blocks).toHaveLength(0);
    expect(result.chunks).toHaveLength(0);
    expect(result.statistics.words).toBe(0);
  });
});
