import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContrastMode, FontFamily, HighlightPacing, TtsVoicePersona } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AccessibilityPreferencesDto {
  @ApiProperty({
    enum: FontFamily,
    example: FontFamily.OPEN_DYSLEXIC,
    description: 'Preferred reading font.',
  })
  preferredFont!: FontFamily;

  @ApiProperty({
    example: 0.05,
    minimum: 0,
    maximum: 0.3,
    description: 'Additional letter spacing in em units.',
  })
  letterSpacing!: number;

  @ApiProperty({
    example: 1.6,
    minimum: 1,
    maximum: 3,
    description: 'Line height as a unitless multiplier.',
  })
  lineHeight!: number;

  @ApiProperty({ enum: ContrastMode, example: ContrastMode.LIGHT })
  contrastMode!: ContrastMode;

  @ApiProperty({
    example: 3,
    minimum: 1,
    maximum: 10,
    description: 'Number of visible lines in the reading focus window.',
  })
  lineFocusWindowSize!: number;

  @ApiProperty({ enum: TtsVoicePersona, example: TtsVoicePersona.CHILD_FRIENDLY })
  ttsVoicePersona!: TtsVoicePersona;

  @ApiProperty({
    example: 1,
    minimum: 0.75,
    maximum: 1.25,
    description: 'Speech playback speed multiplier.',
  })
  speechRate!: number;

  @ApiProperty({ example: 1, minimum: 0.75, maximum: 1.5 })
  speechPitch!: number;

  @ApiProperty({ enum: HighlightPacing, example: HighlightPacing.BALANCED })
  highlightPacing!: HighlightPacing;

  @ApiProperty({
    example: true,
    description: 'Minimizes non-essential animation across clients.',
  })
  reduceMotion!: boolean;

  @ApiProperty({
    example: false,
    description: 'Opt-in for soft interface sounds. Disabled by default.',
  })
  soundEffects!: boolean;
}

export class StudentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LEX-001' })
  studentCode!: string;

  @ApiProperty({ example: 'Sam' })
  displayName!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 12 })
  gradeLevel!: number;

  @ApiPropertyOptional({ example: 'CLASS-3A', nullable: true })
  classroomCode!: string | null;

  @ApiProperty({ type: AccessibilityPreferencesDto })
  accessibility!: AccessibilityPreferencesDto;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastLoginAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'LEX-001', minLength: 3, maxLength: 32 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/, {
    message: 'studentCode must contain only letters, numbers, dashes, and underscores',
  })
  studentCode!: string;

  @ApiProperty({ example: 'Sam', minLength: 2, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel!: number;

  @ApiPropertyOptional({ example: 'CLASS-3A', maxLength: 32, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  classroomCode?: string;

  @ApiProperty({
    example: '4821',
    description: 'Short numeric PIN. It is hashed with bcrypt before storage.',
  })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'pin must contain between 4 and 6 digits' })
  pin!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['star', 'moon', 'leaf'],
    minItems: 3,
    maxItems: 6,
    description: 'Optional visual sign-in sequence made of icon identifiers.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]{1,30}$/, {
    each: true,
    message: 'each visual token must be a lowercase icon identifier',
  })
  visualSequence?: string[];
}

export class ProvisionedStudentResponseDto extends StudentResponseDto {
  @ApiProperty({
    description:
      'Long-lived QR sign-in token. Print it as a QR code; rotating it later invalidates this value.',
  })
  qrToken!: string;

  @ApiProperty({ format: 'date-time' })
  qrTokenExpiresAt!: string;
}

export class UpdateAccessibilityPreferencesDto {
  @ApiPropertyOptional({ enum: FontFamily })
  @IsOptional()
  @IsEnum(FontFamily)
  preferredFont?: FontFamily;

  @ApiPropertyOptional({ minimum: 0, maximum: 0.3 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(0.3)
  letterSpacing?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 3 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(3)
  lineHeight?: number;

  @ApiPropertyOptional({ enum: ContrastMode })
  @IsOptional()
  @IsEnum(ContrastMode)
  contrastMode?: ContrastMode;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  lineFocusWindowSize?: number;

  @ApiPropertyOptional({ enum: TtsVoicePersona })
  @IsOptional()
  @IsEnum(TtsVoicePersona)
  ttsVoicePersona?: TtsVoicePersona;

  @ApiPropertyOptional({ minimum: 0.75, maximum: 1.25 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.75)
  @Max(1.25)
  speechRate?: number;

  @ApiPropertyOptional({ minimum: 0.75, maximum: 1.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.75)
  @Max(1.5)
  speechPitch?: number;

  @ApiPropertyOptional({ enum: HighlightPacing })
  @IsOptional()
  @IsEnum(HighlightPacing)
  highlightPacing?: HighlightPacing;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reduceMotion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  soundEffects?: boolean;
}
