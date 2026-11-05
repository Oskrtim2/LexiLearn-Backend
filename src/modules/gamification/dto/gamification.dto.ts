import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingSessionStatus, RewardTaskType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional OCR document being read. It must belong to the student.',
  })
  @IsOptional()
  @IsUUID('4')
  documentId?: string;
}

export class StartSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  documentId!: string | null;

  @ApiProperty({ enum: ReadingSessionStatus, example: ReadingSessionStatus.ACTIVE })
  status!: ReadingSessionStatus;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({
    example: false,
    description: 'True when an active session was safely resumed instead of duplicated.',
  })
  resumed!: boolean;

  @ApiProperty({
    example: 'Take your time. There is no race here.',
    description: 'Calm, non-pressuring status copy.',
  })
  gentleMessage!: string;
}

export class HeartbeatDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  sessionId!: string;

  @ApiProperty({
    example: 30,
    minimum: 0,
    maximum: 300,
    description: 'Active reading seconds since the previous heartbeat.',
  })
  @IsInt()
  @Min(0)
  @Max(300)
  activeSeconds!: number;

  @ApiPropertyOptional({ example: 1, minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  chunksProcessed?: number;

  @ApiPropertyOptional({ example: 3, minimum: 0, maximum: 500, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  interactions?: number;
}

export class AcceptedHeartbeatDto {
  @ApiProperty({ example: 30 })
  activeSeconds!: number;

  @ApiProperty({ example: 1 })
  chunksProcessed!: number;

  @ApiProperty({ example: 3 })
  interactions!: number;
}

export class FocusSummaryDto {
  @ApiProperty({ example: 4, description: 'Consecutive active days, with no punishment.' })
  currentStreak!: number;

  @ApiProperty({ example: 9 })
  bestStreak!: number;

  @ApiProperty({
    example: 17,
    description: 'Cumulative active reading days. Rest days never reduce this number.',
  })
  focusDays!: number;

  @ApiProperty({
    example: 'Every reading day counts. Rest days never take progress away.',
  })
  message!: string;
}

export class HeartbeatResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ enum: ReadingSessionStatus })
  status!: ReadingSessionStatus;

  @ApiProperty({ example: 420, description: 'Total accepted reading seconds in this session.' })
  durationSeconds!: number;

  @ApiProperty({ example: 8 })
  chunksProcessed!: number;

  @ApiProperty({ example: 12 })
  interactions!: number;

  @ApiProperty({ format: 'date-time' })
  lastHeartbeatAt!: string;

  @ApiProperty({ type: AcceptedHeartbeatDto })
  accepted!: AcceptedHeartbeatDto;

  @ApiProperty({ type: FocusSummaryDto })
  focus!: FocusSummaryDto;

  @ApiProperty({ example: 'Saved quietly. Your progress is safe.' })
  gentleMessage!: string;
}

export class ClaimRewardDto {
  @ApiProperty({ enum: RewardTaskType, example: RewardTaskType.SENTENCE_COMPLETED })
  @IsEnum(RewardTaskType)
  taskType!: RewardTaskType;

  @ApiProperty({
    example: 'chunk:5f97a7c4-6d2d-4d25-bfe3-b6cd09c1f2aa',
    minLength: 1,
    maxLength: 120,
    description:
      'Client-stable completion identifier. Repeating the same taskId never awards XP twice.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  taskId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Required for SESSION_COMPLETED; recommended for every task.',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;
}

export class ProgressSummaryDto {
  @ApiProperty({ example: 135 })
  totalXp!: number;

  @ApiProperty({ example: 3 })
  level!: number;

  @ApiProperty({ example: 35 })
  xpIntoLevel!: number;

  @ApiProperty({ example: 125 })
  xpForNextLevel!: number;

  @ApiProperty({ example: 28, minimum: 0, maximum: 100 })
  levelProgressPercent!: number;
}

export class EarnedBadgeDto {
  @ApiProperty({ example: 'FIRST_STEP' })
  code!: string;

  @ApiProperty({ example: 'First gentle step' })
  name!: string;

  @ApiProperty({ example: 'You completed your first reading moment. That is enough.' })
  description!: string;

  @ApiProperty({ example: '🌱' })
  icon!: string;

  @ApiProperty({ format: 'date-time' })
  earnedAt!: string;
}

export class CalmCelebrationDto {
  @ApiProperty({
    example: 'A new calm badge is here: First gentle step. No rush — take it at your pace.',
  })
  message!: string;

  @ApiProperty({ example: 'soft-glow', description: 'Optional gentle visual treatment.' })
  animation!: string;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'Always null for now; Lexi Learn avoids startling audio cues.',
  })
  soundCue!: string | null;
}

export class ClaimRewardResponseDto {
  @ApiProperty({ format: 'uuid' })
  claimId!: string;

  @ApiProperty({ enum: RewardTaskType })
  taskType!: RewardTaskType;

  @ApiProperty({ example: 'chunk:5f97a7c4-6d2d-4d25-bfe3-b6cd09c1f2aa' })
  taskId!: string;

  @ApiProperty({ example: 5, description: 'Zero when the claim was already recorded.' })
  xpAwarded!: number;

  @ApiProperty({ example: false })
  alreadyClaimed!: boolean;

  @ApiProperty({ example: false })
  leveledUp!: boolean;

  @ApiProperty({ example: false })
  sessionCompleted!: boolean;

  @ApiProperty({ type: ProgressSummaryDto })
  progress!: ProgressSummaryDto;

  @ApiProperty({ type: FocusSummaryDto })
  focus!: FocusSummaryDto;

  @ApiProperty({ type: [EarnedBadgeDto], description: 'Only newly earned badges.' })
  badges!: EarnedBadgeDto[];

  @ApiProperty({ type: CalmCelebrationDto })
  celebration!: CalmCelebrationDto;
}

export class RewardBreakdownDto {
  @ApiProperty({ example: 18 })
  sentences!: number;

  @ApiProperty({ example: 4 })
  pages!: number;

  @ApiProperty({ example: 7 })
  focusMilestones!: number;

  @ApiProperty({ example: 3 })
  sessions!: number;

  @ApiProperty({ example: 32 })
  totalClaims!: number;
}

export class StudentStatsResponseDto {
  @ApiProperty({ format: 'uuid' })
  studentId!: string;

  @ApiProperty({ example: 'Sam' })
  displayName!: string;

  @ApiProperty({ example: 3840, description: 'Aggregated accepted reading seconds.' })
  totalReadingSeconds!: number;

  @ApiProperty({ example: 64 })
  totalReadingMinutes!: number;

  @ApiProperty({ example: 9, description: 'OCR documents created by the student.' })
  textsProcessed!: number;

  @ApiProperty({ example: 14 })
  sessionsStarted!: number;

  @ApiProperty({ example: 8 })
  sessionsCompleted!: number;

  @ApiProperty({ example: 128 })
  chunksProcessed!: number;

  @ApiProperty({ example: 342 })
  interactions!: number;

  @ApiProperty({ type: ProgressSummaryDto })
  progress!: ProgressSummaryDto;

  @ApiProperty({ type: FocusSummaryDto })
  focus!: FocusSummaryDto;

  @ApiProperty({ type: RewardBreakdownDto })
  rewards!: RewardBreakdownDto;

  @ApiProperty({ type: [EarnedBadgeDto] })
  badges!: EarnedBadgeDto[];

  @ApiProperty({ format: 'date-time' })
  generatedAt!: string;
}
