import { RewardTaskType } from '@prisma/client';

export interface RewardDefinition {
  readonly xp: number;
  readonly label: string;
}

export const REWARD_CATALOG: Readonly<Record<RewardTaskType, RewardDefinition>> = {
  [RewardTaskType.SENTENCE_COMPLETED]: {
    xp: 5,
    label: 'One sentence explored',
  },
  [RewardTaskType.PAGE_COMPLETED]: {
    xp: 20,
    label: 'One page explored',
  },
  [RewardTaskType.FOCUS_MILESTONE]: {
    xp: 10,
    label: 'A focused moment',
  },
  [RewardTaskType.SESSION_COMPLETED]: {
    xp: 15,
    label: 'Reading session completed',
  },
};

export interface BadgeEligibilityContext {
  readonly totalClaims: number;
  readonly sentenceClaims: number;
  readonly pageClaims: number;
  readonly focusMilestones: number;
  readonly completedSessions: number;
  readonly totalFocusDays: number;
}

export interface BadgeDefinition {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly isEligible: (context: BadgeEligibilityContext) => boolean;
}

/**
 * Badges are deliberately calm and descriptive. They never expire, never
 * reduce XP, and never carry loud celebration copy.
 */
export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  {
    code: 'FIRST_STEP',
    name: 'First gentle step',
    description: 'You completed your first reading moment. That is enough.',
    icon: '🌱',
    isEligible: (context) => context.totalClaims >= 1,
  },
  {
    code: 'SENTENCE_EXPLORER',
    name: 'Sentence explorer',
    description: 'You explored five sentences at your own pace.',
    icon: '✨',
    isEligible: (context) => context.sentenceClaims >= 5,
  },
  {
    code: 'PAGE_WANDERER',
    name: 'Page wanderer',
    description: 'You read through five pages, one calm step at a time.',
    icon: '📖',
    isEligible: (context) => context.pageClaims >= 5,
  },
  {
    code: 'FOCUS_SPARK',
    name: 'Focus spark',
    description: 'You found ten small moments of focus.',
    icon: '🫧',
    isEligible: (context) => context.focusMilestones >= 10,
  },
  {
    code: 'STEADY_READER',
    name: 'Steady reader',
    description: 'You returned to reading on three different days.',
    icon: '🍃',
    isEligible: (context) => context.totalFocusDays >= 3,
  },
  {
    code: 'CALM_FINISHER',
    name: 'Calm finisher',
    description: 'You completed three reading sessions without pressure.',
    icon: '🌙',
    isEligible: (context) => context.completedSessions >= 3,
  },
];

export interface LevelProgress {
  readonly totalXp: number;
  readonly level: number;
  readonly xpIntoLevel: number;
  readonly xpForNextLevel: number;
  readonly levelProgressPercent: number;
}

const XP_PER_LEVEL_STEP = 25;

export function levelFromXp(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(Math.sqrt(safeXp / XP_PER_LEVEL_STEP)) + 1;
  const previousThreshold = XP_PER_LEVEL_STEP * (level - 1) ** 2;
  const nextThreshold = XP_PER_LEVEL_STEP * level ** 2;
  const xpIntoLevel = safeXp - previousThreshold;
  const xpForNextLevel = nextThreshold - previousThreshold;
  const levelProgressPercent =
    xpForNextLevel <= 0
      ? 100
      : Math.round(Math.min(1, xpIntoLevel / xpForNextLevel) * 100 * 10) / 10;

  return {
    totalXp: safeXp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    levelProgressPercent,
  };
}
