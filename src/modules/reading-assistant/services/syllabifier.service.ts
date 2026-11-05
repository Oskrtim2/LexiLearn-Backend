import { Injectable } from '@nestjs/common';
import { ReadingLanguage } from '../reading-assistant.types.js';
import type { SyllableSlice } from '../reading-assistant.types.js';

type VowelClass = 'strong' | 'weak';

interface Unit {
  readonly text: string;
  readonly lower: string;
  readonly start: number;
  readonly end: number;
  readonly isVowel: boolean;
  readonly vowelClass: VowelClass | null;
  readonly accentedWeak: boolean;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú', 'ü']);
const WEAK_VOWELS = new Set(['i', 'u', 'ü', 'í', 'ú']);
const WEAK_ACCENTED_VOWELS = new Set(['í', 'ú']);

const SPANISH_ONSET_PAIRS = new Set([
  'bl',
  'br',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'kl',
  'kr',
  'pl',
  'pr',
  'tl',
  'tr',
  'ps',
  'pn',
  'gn',
  'mn',
]);

const ENGLISH_ONSET_PAIRS = new Set([
  ...SPANISH_ONSET_PAIRS,
  'ch',
  'sh',
  'th',
  'ph',
  'wh',
  'sc',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'tw',
  'wr',
  'ck',
  'gh',
]);

const SPANISH_DIGRAPHS = new Set(['ch', 'll', 'rr']);
const ENGLISH_DIGRAPHS = new Set(['ch', 'sh', 'th', 'ph', 'wh', 'ck', 'gh', 'ng']);

@Injectable()
export class SyllabifierService {
  syllabifyWord(word: string, language: ReadingLanguage): SyllableSlice[] {
    if (word.length === 0) {
      return [];
    }

    if (word.includes('-') || word.includes('’') || word.includes("'")) {
      // Compound words and contractions are kept intact; splitting inside a
      // contraction would produce misleading phonological cues.
      return [{ text: word, startOffset: 0, endOffset: word.length }];
    }

    const units = this.toUnits(word, language);
    const nuclei = this.findNuclei(units, language);

    if (nuclei.length === 0) {
      return [{ text: word, startOffset: 0, endOffset: word.length }];
    }

    const boundaries = new Set<number>([0, word.length]);

    for (let index = 1; index < nuclei.length; index += 1) {
      const previousGroup = nuclei[index - 1];
      const currentGroup = nuclei[index];
      const previousEnd = previousGroup[previousGroup.length - 1];
      const currentStart = currentGroup[0];

      if (previousEnd === undefined || currentStart === undefined) {
        continue;
      }

      const consonants = units.slice(previousEnd + 1, currentStart);
      let onsetLength = 0;

      if (consonants.length > 0) {
        onsetLength = this.resolveOnsetLength(consonants, language);
      }

      const splitUnit = units[currentStart - onsetLength];
      const splitOffset = splitUnit?.start ?? units[currentStart]?.start ?? word.length;
      boundaries.add(splitOffset);
    }

    const ordered = [...boundaries].sort((left, right) => left - right);
    const syllables: SyllableSlice[] = [];

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const start = ordered[index];
      const end = ordered[index + 1];

      if (start === undefined || end === undefined || end <= start) {
        continue;
      }

      const text = word.slice(start, end);
      if (text.trim().length === 0) {
        continue;
      }

      syllables.push({ text, startOffset: start, endOffset: end });
    }

    if (syllables.length > 1) {
      this.applyEnglishSilentE(syllables, word, language);
    }

    return syllables.length > 0
      ? syllables
      : [{ text: word, startOffset: 0, endOffset: word.length }];
  }

  countSyllables(word: string, language: ReadingLanguage): number {
    return Math.max(1, this.syllabifyWord(word, language).length);
  }

  private toUnits(word: string, language: ReadingLanguage): Unit[] {
    const units: Unit[] = [];
    const lower = word.toLocaleLowerCase(language);
    const digraphs = language === 'en' ? ENGLISH_DIGRAPHS : SPANISH_DIGRAPHS;
    let index = 0;

    while (index < word.length) {
      const current = lower[index] ?? '';
      const next = lower[index + 1] ?? '';
      const pair = `${current}${next}`;
      const isDigraph = next.length > 0 && digraphs.has(pair) && !this.isVowel(current);

      if (isDigraph) {
        units.push({
          text: word.slice(index, index + 2),
          lower: pair,
          start: index,
          end: index + 2,
          isVowel: false,
          vowelClass: null,
          accentedWeak: false,
        });
        index += 2;
        continue;
      }

      const vowelClass = this.vowelClass(current, language);
      units.push({
        text: current,
        lower: current,
        start: index,
        end: index + 1,
        isVowel: vowelClass !== null,
        vowelClass,
        accentedWeak: WEAK_ACCENTED_VOWELS.has(current),
      });
      index += 1;
    }

    return units;
  }

  private findNuclei(units: Unit[], language: ReadingLanguage): number[][] {
    const nuclei: number[][] = [];
    let current: number[] = [];

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];
      if (!unit || !unit.isVowel) {
        if (current.length > 0) {
          nuclei.push(current);
          current = [];
        }
        continue;
      }

      const previousIndex = current[current.length - 1];
      if (previousIndex !== undefined) {
        const previous = units[previousIndex];
        if (previous && this.breaksNucleus(previous, unit, language)) {
          nuclei.push(current);
          current = [index];
          continue;
        }
      }

      current.push(index);
    }

    if (current.length > 0) {
      nuclei.push(current);
    }

    return nuclei;
  }

  private breaksNucleus(previous: Unit, current: Unit, language: ReadingLanguage): boolean {
    if (language === 'en') {
      // English vowel pairs are commonly digraphs (rain, book). Keep them
      // together; the silent-e pass handles the most common split exception.
      return false;
    }

    const previousClass = previous.vowelClass;
    const currentClass = current.vowelClass;

    if (!previousClass || !currentClass) {
      return false;
    }

    if (previous.accentedWeak || current.accentedWeak) {
      return true;
    }

    return previousClass === 'strong' && currentClass === 'strong';
  }

  private resolveOnsetLength(consonants: Unit[], language: ReadingLanguage): number {
    if (consonants.length <= 1) {
      return consonants.length;
    }

    const pairSet = language === 'en' ? ENGLISH_ONSET_PAIRS : SPANISH_ONSET_PAIRS;
    const last = consonants[consonants.length - 1];
    const penultimate = consonants[consonants.length - 2];

    if (last && penultimate && pairSet.has(`${penultimate.lower}${last.lower}`)) {
      return 2;
    }

    return 1;
  }

  private applyEnglishSilentE(
    syllables: SyllableSlice[],
    word: string,
    language: ReadingLanguage,
  ): void {
    if (language !== 'en' || syllables.length < 2) {
      return;
    }

    const last = syllables[syllables.length - 1];
    const previous = syllables[syllables.length - 2];

    if (!last || !previous || last.text.length !== 2) {
      return;
    }

    const [consonant, finalLetter] = last.text.toLocaleLowerCase('en');
    if (finalLetter !== 'e' || !consonant || this.isVowel(consonant)) {
      return;
    }

    if (!/[aeiouy]$/.test(previous.text.toLocaleLowerCase('en'))) {
      return;
    }

    const mergedText = word.slice(previous.startOffset, last.endOffset);
    const merged = {
      text: mergedText,
      startOffset: previous.startOffset,
      endOffset: last.endOffset,
    };

    syllables.splice(syllables.length - 2, 2, merged);
  }

  private vowelClass(char: string, language: ReadingLanguage): VowelClass | null {
    if (!this.isVowel(char, language)) {
      return null;
    }

    return WEAK_VOWELS.has(char) ? 'weak' : 'strong';
  }

  private isVowel(char: string, language: ReadingLanguage = ReadingLanguage.Spanish): boolean {
    if (language === 'en' && char === 'y') {
      return false;
    }

    return VOWELS.has(char);
  }
}
