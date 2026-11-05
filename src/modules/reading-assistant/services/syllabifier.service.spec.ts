import { ReadingLanguage } from '../reading-assistant.types.js';
import { SyllabifierService } from './syllabifier.service.js';

describe('SyllabifierService', () => {
  const service = new SyllabifierService();

  const join = (word: string, language = ReadingLanguage.Spanish): string =>
    service
      .syllabifyWord(word, language)
      .map((syllable) => syllable.text)
      .join('-');

  it('splits common Spanish words at natural syllable boundaries', () => {
    expect(join('lectura')).toBe('lec-tu-ra');
    expect(join('tranquilo')).toBe('tran-qui-lo');
    expect(join('palabra')).toBe('pa-la-bra');
    expect(join('juntos')).toBe('jun-tos');
  });

  it('handles Spanish diphthongs, hiatuses, and accents', () => {
    expect(join('ciudad')).toBe('ciu-dad');
    expect(join('poesía')).toBe('po-e-sí-a');
    expect(join('mañana')).toBe('ma-ña-na');
    expect(join('pingüino')).toBe('pin-güi-no');
    expect(join('murciélago')).toBe('mur-cié-la-go');
  });

  it('keeps digraphs and inseparable onsets together', () => {
    expect(join('perro')).toBe('pe-rro');
    expect(join('acción')).toBe('ac-ción');
    expect(join('construir')).toBe('cons-truir');
    expect(join('instante')).toBe('ins-tan-te');
  });

  it('returns stable offsets that reconstruct the original word', () => {
    const syllables = service.syllabifyWord('murciélago', ReadingLanguage.Spanish);
    expect(syllables.map((syllable) => syllable.text).join('')).toBe('murciélago');
    expect(syllables[0]?.startOffset).toBe(0);
    expect(syllables.at(-1)?.endOffset).toBe('murciélago'.length);
  });

  it('provides an English heuristic fallback', () => {
    expect(service.syllabifyWord('beautiful', ReadingLanguage.English).length).toBeGreaterThan(1);
    expect(service.syllabifyWord('make', ReadingLanguage.English).length).toBe(1);
  });

  it('never drops a word without vowels', () => {
    const syllables = service.syllabifyWord('123', ReadingLanguage.Spanish);
    expect(syllables).toHaveLength(1);
    expect(syllables[0]?.text).toBe('123');
  });
});
