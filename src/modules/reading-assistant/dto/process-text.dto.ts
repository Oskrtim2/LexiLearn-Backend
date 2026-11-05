import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ReadingLanguage } from '../reading-assistant.types.js';

export class ReadingOptionsDto {
  @ApiPropertyOptional({
    example: 12,
    minimum: 4,
    maximum: 40,
    default: 12,
    description: 'Maximum words per ADHD-friendly micro-sentence.',
  })
  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(40)
  maxWordsPerChunk?: number;

  @ApiPropertyOptional({
    example: 150,
    minimum: 80,
    maximum: 300,
    default: 150,
    description: 'Reader pace used to estimate time. 150 WPM is an accessible default.',
  })
  @IsOptional()
  @IsInt()
  @Min(80)
  @Max(300)
  wordsPerMinute?: number;
}

export class ProcessTextDto {
  @ApiProperty({
    example:
      'La lectura es un viaje tranquilo. Cada palabra es un pequeño paso que podemos dar juntos.',
    minLength: 1,
    maxLength: 20_000,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  text!: string;

  @ApiPropertyOptional({
    enum: ReadingLanguage,
    default: ReadingLanguage.Spanish,
    description: 'Language used to tune syllabification and readability formulas.',
  })
  @IsOptional()
  @IsEnum(ReadingLanguage)
  language?: ReadingLanguage;

  @ApiPropertyOptional({ type: ReadingOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReadingOptionsDto)
  options?: ReadingOptionsDto;
}
