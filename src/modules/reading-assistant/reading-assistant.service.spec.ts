import { BadRequestException } from '@nestjs/common';
import { ProcessTextDto } from './dto/process-text.dto.js';
import { ReadingAssistantService } from './reading-assistant.service.js';
import { ReadingLanguage } from './reading-assistant.types.js';
import { MicroChunkerService } from './services/micro-chunker.service.js';
import { ReadabilityService } from './services/readability.service.js';
import { SyllabifierService } from './services/syllabifier.service.js';

describe('ReadingAssistantService', () => {
  const service = new ReadingAssistantService(
    new SyllabifierService(),
    new MicroChunkerService(),
    new ReadabilityService(),
  );

  const createDto = (text: string): ProcessTextDto => {
    const dto = new ProcessTextDto();
    dto.text = text;
    dto.language = ReadingLanguage.Spanish;
    dto.options = { maxWordsPerChunk: 6, wordsPerMinute: 140 };
    return dto;
  };

  it('returns syllable-separated words with global offsets', () => {
    const result = service.process(createDto('La lectura tranquila avanza.'));
    const firstWord = result.words.find((word) => word.text === 'lectura');

    expect(firstWord?.syllables.map((syllable) => syllable.text)).toEqual(['lec', 'tu', 'ra']);
    for (const word of result.words) {
      expect(result.text.slice(word.startOffset, word.endOffset)).toBe(word.text);
      expect(word.syllables.map((syllable) => syllable.text).join('')).toBe(word.text);
    }
  });

  it('chunks long sentences at clause boundaries without dropping text', () => {
    const text =
      'Cuando la lectura se siente demasiado grande, podemos dividirla en partes pequenas y respirar con calma antes de continuar.';
    const result = service.process(createDto(text));

    expect(result.sentences).toHaveLength(1);
    const sentence = result.sentences[0];
    const chunks = sentence?.microChunks ?? [];

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.text).join(' ')).toContain('respirar');
    expect(chunks[0]?.startOffset).toBe(0);
    expect(chunks.at(-1)?.endOffset).toBe(result.text.length);
    for (const chunk of chunks) {
      expect(chunk.wordCount).toBeLessThanOrEqual(9);
      expect(chunk.estimatedSeconds).toBeGreaterThanOrEqual(1);
    }
  });

  it('computes reading time and difficulty metadata', () => {
    const result = service.process(createDto('El sol brilla. La niña lee.'));

    expect(result.statistics.words).toBe(6);
    expect(result.statistics.sentences).toBe(2);
    expect(result.readingTime.estimatedSeconds).toBeGreaterThan(0);
    expect(result.difficulty.score).toBeGreaterThanOrEqual(0);
    expect(result.difficulty.score).toBeLessThanOrEqual(100);
    expect(['easy', 'moderate', 'challenging', 'advanced']).toContain(result.difficulty.level);
  });

  it('rejects text without readable content', () => {
    expect(() => service.process(createDto('!!! ...'))).toThrow(BadRequestException);
  });

  it('supports English processing metadata', () => {
    const dto = createDto('The quiet library is a peaceful place to read.');
    dto.language = ReadingLanguage.English;
    const result = service.process(dto);

    expect(result.language).toBe(ReadingLanguage.English);
    expect(result.words.length).toBeGreaterThan(5);
    expect(result.difficulty.fleschReadingEase).toBeGreaterThan(0);
  });
});
