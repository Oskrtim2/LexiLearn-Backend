import { BadRequestException, Injectable } from '@nestjs/common';
import type { ProcessTextDto } from './dto/process-text.dto.js';
import type {
  ChunkingMetadataDto,
  DifficultyAssessmentDto,
  MicroChunkResponseDto,
  ProcessTextResponseDto,
  ReadingStatisticsDto,
  ReadingTimeDto,
  SentenceAnalysisDto,
  WordSyllablesDto,
} from './dto/process-text-response.dto.js';
import { ReadingLanguage } from './reading-assistant.types.js';
import type { SentenceSegment, SyllabifiedWord, WordToken } from './reading-assistant.types.js';
import { MicroChunkerService } from './services/micro-chunker.service.js';
import { ReadabilityService } from './services/readability.service.js';
import { SyllabifierService } from './services/syllabifier.service.js';
import {
  countParagraphs,
  normalizeReadingText,
  segmentSentences,
  tokenizeWords,
} from './utils/text-segmentation.js';

@Injectable()
export class ReadingAssistantService {
  constructor(
    private readonly syllabifier: SyllabifierService,
    private readonly microChunker: MicroChunkerService,
    private readonly readability: ReadabilityService,
  ) {}

  process(dto: ProcessTextDto): ProcessTextResponseDto {
    const language = dto.language ?? ReadingLanguage.Spanish;
    const wordsPerMinute = dto.options?.wordsPerMinute ?? 150;
    const maxWordsPerChunk = dto.options?.maxWordsPerChunk ?? 12;
    const text = normalizeReadingText(dto.text);

    if (text.length === 0) {
      throw new BadRequestException('text must contain readable content');
    }

    const tokens = tokenizeWords(text);
    if (tokens.length === 0) {
      throw new BadRequestException('text must contain at least one readable word');
    }

    const locale = language === ReadingLanguage.Spanish ? 'es' : 'en';
    const rawSentences = segmentSentences(text, locale);
    const syllabifiedWords: SyllabifiedWord[] = tokens.map((word) => {
      const syllables = this.syllabifier.syllabifyWord(word.text, language);
      return {
        ...word,
        syllables: syllables.map((syllable) => ({
          ...syllable,
          startOffset: word.startOffset + syllable.startOffset,
          endOffset: word.startOffset + syllable.endOffset,
        })),
      };
    });

    const sentenceWords = this.attachWordsToSentences(rawSentences, tokens);
    const sentences: SentenceAnalysisDto[] = [];

    for (const { sentence, words } of sentenceWords) {
      if (words.length === 0) {
        continue;
      }

      const firstWordIndex = words[0]?.index ?? 0;
      const syllableCount = syllabifiedWords
        .slice(firstWordIndex, firstWordIndex + words.length)
        .reduce((total, word) => total + word.syllables.length, 0);
      const averageSyllables = syllableCount / Math.max(1, words.length);
      const sentenceSeconds = this.readability.estimateReadingSeconds(
        words.length,
        wordsPerMinute,
        averageSyllables,
      );
      const chunks = this.microChunker.chunkSentence(
        text,
        sentence,
        words,
        maxWordsPerChunk,
        wordsPerMinute,
        language,
      );

      const microChunks: MicroChunkResponseDto[] = chunks.map((chunk) => ({
        text: chunk.text,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        startWordIndex: chunk.startWordIndex,
        endWordIndex: chunk.endWordIndex,
        wordCount: chunk.wordCount,
        estimatedSeconds: chunk.estimatedSeconds,
      }));

      sentences.push({
        index: sentences.length,
        text: sentence.text,
        startOffset: sentence.startOffset,
        endOffset: sentence.endOffset,
        wordCount: words.length,
        estimatedSeconds: sentenceSeconds,
        microChunks,
      });
    }

    const difficulty = this.readability.assess(syllabifiedWords, sentences.length, language);
    const readingSeconds = this.readability.estimateReadingSeconds(
      syllabifiedWords.length,
      wordsPerMinute,
      difficulty.averageSyllablesPerWord,
    );
    const statistics: ReadingStatisticsDto = {
      characters: text.length,
      words: syllabifiedWords.length,
      sentences: sentences.length,
      paragraphs: Math.max(1, countParagraphs(text)),
      averageWordsPerSentence: this.round(
        syllabifiedWords.length / Math.max(1, sentences.length),
        1,
      ),
    };
    const readingTime: ReadingTimeDto = {
      estimatedSeconds: readingSeconds,
      estimatedMinutes: this.round(readingSeconds / 60, 1),
      wordsPerMinute,
    };
    const difficultyResponse: DifficultyAssessmentDto = {
      score: difficulty.score,
      level: difficulty.level,
      fleschReadingEase: difficulty.fleschReadingEase,
      averageSentenceLength: difficulty.averageSentenceLength,
      averageSyllablesPerWord: difficulty.averageSyllablesPerWord,
      polysyllabicWordPercentage: difficulty.polysyllabicWordPercentage,
    };
    const chunking: ChunkingMetadataDto = {
      maxWordsPerChunk,
      strategy: 'clause-aware-greedy',
    };
    const responseWords: WordSyllablesDto[] = syllabifiedWords.map((word) => ({
      index: word.index,
      text: word.text,
      startOffset: word.startOffset,
      endOffset: word.endOffset,
      syllableCount: word.syllables.length,
      syllables: word.syllables.map((syllable) => ({
        text: syllable.text,
        startOffset: syllable.startOffset,
        endOffset: syllable.endOffset,
      })),
    }));

    return {
      language,
      text,
      statistics,
      readingTime,
      difficulty: difficultyResponse,
      chunking,
      sentences,
      words: responseWords,
    };
  }

  private attachWordsToSentences(
    sentences: readonly SentenceSegment[],
    words: readonly WordToken[],
  ): Array<{ readonly sentence: SentenceSegment; readonly words: WordToken[] }> {
    const attached: Array<{ sentence: SentenceSegment; words: WordToken[] }> = [];
    let cursor = 0;

    for (const sentence of sentences) {
      while (cursor < words.length && (words[cursor]?.endOffset ?? 0) <= sentence.startOffset) {
        cursor += 1;
      }

      const sentenceWordList: WordToken[] = [];
      let probe = cursor;

      while (probe < words.length) {
        const word = words[probe];
        if (!word || word.startOffset >= sentence.endOffset) {
          break;
        }
        if (word.startOffset >= sentence.startOffset && word.endOffset <= sentence.endOffset) {
          sentenceWordList.push(word);
        }
        probe += 1;
      }

      attached.push({ sentence, words: sentenceWordList });
      cursor = probe;
    }

    return attached;
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
