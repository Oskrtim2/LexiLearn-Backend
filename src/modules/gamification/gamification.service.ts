import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReadingSessionStatus, RewardTaskType } from '@prisma/client';
import type { StudentProgress } from '@prisma/client';
import { OcrRepository } from '../ocr/ocr.repository.js';
import { StudentsRepository } from '../students/students.repository.js';
import type {
  ClaimRewardDto,
  ClaimRewardResponseDto,
  EarnedBadgeDto,
  FocusSummaryDto,
  HeartbeatDto,
  HeartbeatResponseDto,
  ProgressSummaryDto,
  RewardBreakdownDto,
  StartSessionDto,
  StartSessionResponseDto,
  StudentStatsResponseDto,
} from './dto/gamification.dto.js';
import { GamificationRepository } from './gamification.repository.js';
import { BADGE_CATALOG, levelFromXp, REWARD_CATALOG } from './reward-catalog.js';
import type { BadgeEligibilityContext } from './reward-catalog.js';

const FOCUS_MESSAGE = 'Every reading day counts. Rest days never take progress away.';
const ABANDONED_SESSION_MESSAGE =
  'This reading session is already resting. Start a new one when you are ready.';

@Injectable()
export class GamificationService {
  constructor(
    private readonly gamificationRepository: GamificationRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly ocrRepository: OcrRepository,
  ) {}

  async startSession(studentId: string, dto: StartSessionDto): Promise<StartSessionResponseDto> {
    const documentId = dto.documentId ?? null;

    if (documentId && !(await this.ocrRepository.existsOwnedDocument(documentId, studentId))) {
      throw new NotFoundException('Reading document not found');
    }

    const { session, resumed } = await this.gamificationRepository.startSession(
      studentId,
      documentId,
    );

    return {
      sessionId: session.id,
      documentId: session.documentId,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      resumed,
      gentleMessage: resumed
        ? 'We picked up where you left off in this reading.'
        : 'Take your time. There is no race here.',
    };
  }

  async heartbeat(studentId: string, dto: HeartbeatDto): Promise<HeartbeatResponseDto> {
    const existing = await this.gamificationRepository.findOwnedSession(dto.sessionId, studentId);

    if (!existing) {
      throw new NotFoundException('Reading session not found');
    }

    if (existing.status !== ReadingSessionStatus.ACTIVE) {
      throw new ConflictException(ABANDONED_SESSION_MESSAGE);
    }

    const result = await this.gamificationRepository.recordHeartbeat({
      sessionId: dto.sessionId,
      studentId,
      activeSeconds: dto.activeSeconds,
      chunksProcessed: dto.chunksProcessed ?? 0,
      interactions: dto.interactions ?? 0,
      now: new Date(),
    });

    if (!result) {
      throw new ConflictException(ABANDONED_SESSION_MESSAGE);
    }

    return {
      sessionId: result.session.id,
      status: result.session.status,
      durationSeconds: result.session.durationSeconds,
      chunksProcessed: result.session.chunksProcessed,
      interactions: result.session.interactions,
      lastHeartbeatAt: result.session.lastHeartbeatAt.toISOString(),
      accepted: result.accepted,
      focus: this.toFocusSummary(result.progress),
      gentleMessage:
        result.accepted.activeSeconds > 0
          ? 'Saved quietly. Your progress is safe.'
          : 'Your place is saved. You can continue whenever you are ready.',
    };
  }

  async claimReward(studentId: string, dto: ClaimRewardDto): Promise<ClaimRewardResponseDto> {
    if (dto.taskType === RewardTaskType.SESSION_COMPLETED && !dto.sessionId) {
      throw new BadRequestException('sessionId is required to complete a reading session');
    }

    if (dto.sessionId) {
      const session = await this.gamificationRepository.findOwnedSession(dto.sessionId, studentId);

      if (!session) {
        throw new NotFoundException('Reading session not found');
      }

      if (session.status === ReadingSessionStatus.ABANDONED) {
        throw new ConflictException(ABANDONED_SESSION_MESSAGE);
      }

      if (
        dto.taskType === RewardTaskType.SESSION_COMPLETED &&
        session.status !== ReadingSessionStatus.ACTIVE
      ) {
        throw new ConflictException('This reading session is already complete.');
      }
    }

    const definition = REWARD_CATALOG[dto.taskType];
    const now = new Date();

    return this.gamificationRepository.withRewardLock(studentId, async (transaction) => {
      const existingClaim = await transaction.rewardClaim.findUnique({
        where: {
          studentId_taskId: {
            studentId,
            taskId: dto.taskId,
          },
        },
      });

      if (existingClaim) {
        const progress = await transaction.studentProgress.findUnique({
          where: { studentId },
        });

        return {
          claimId: existingClaim.id,
          taskType: existingClaim.taskType,
          taskId: existingClaim.taskId,
          xpAwarded: 0,
          alreadyClaimed: true,
          leveledUp: false,
          sessionCompleted: false,
          progress: this.toProgressSummary(progress),
          focus: this.toFocusSummary(progress),
          badges: [],
          celebration: {
            message: 'This step is already saved. You are all set.',
            animation: 'soft-glow',
            soundCue: null,
          },
        };
      }

      if (dto.sessionId) {
        const session = await transaction.readingSession.findFirst({
          where: { id: dto.sessionId, studentId },
        });

        if (!session) {
          throw new NotFoundException('Reading session not found');
        }

        if (session.status === ReadingSessionStatus.ABANDONED) {
          throw new ConflictException(ABANDONED_SESSION_MESSAGE);
        }
      }

      const claim = await transaction.rewardClaim.create({
        data: {
          studentId,
          sessionId: dto.sessionId ?? null,
          taskType: dto.taskType,
          taskId: dto.taskId,
          xpAwarded: definition.xp,
        },
      });

      let sessionCompleted = false;
      if (dto.sessionId && dto.taskType === RewardTaskType.SESSION_COMPLETED) {
        await transaction.readingSession.update({
          where: { id: dto.sessionId },
          data: {
            status: ReadingSessionStatus.COMPLETED,
            endedAt: now,
          },
        });
        sessionCompleted = true;
      }

      const currentProgress = await transaction.studentProgress.findUnique({
        where: { studentId },
      });
      const previousLevel = currentProgress ? levelFromXp(currentProgress.totalXp).level : 1;
      const totalXp = (currentProgress?.totalXp ?? 0) + definition.xp;
      const nextLevel = levelFromXp(totalXp);

      const updatedProgress = currentProgress
        ? await transaction.studentProgress.update({
            where: { studentId },
            data: { totalXp, level: nextLevel.level },
          })
        : await transaction.studentProgress.create({
            data: {
              studentId,
              totalXp,
              level: nextLevel.level,
            },
          });

      const claimGroups = await transaction.rewardClaim.groupBy({
        by: ['taskType'],
        where: { studentId },
        _count: { _all: true },
      });
      const countByType = (taskType: RewardTaskType): number =>
        claimGroups.find((group) => group.taskType === taskType)?._count._all ?? 0;
      const totalClaims = claimGroups.reduce((total, group) => total + group._count._all, 0);

      const eligibility: BadgeEligibilityContext = {
        totalClaims,
        sentenceClaims: countByType(RewardTaskType.SENTENCE_COMPLETED),
        pageClaims: countByType(RewardTaskType.PAGE_COMPLETED),
        focusMilestones: countByType(RewardTaskType.FOCUS_MILESTONE),
        completedSessions: countByType(RewardTaskType.SESSION_COMPLETED),
        totalFocusDays: updatedProgress.totalFocusDays,
      };

      const existingBadges = await transaction.studentBadge.findMany({
        where: { studentId },
        select: { code: true },
      });
      const existingCodes = new Set(existingBadges.map((badge) => badge.code));
      const eligibleBadges = BADGE_CATALOG.filter(
        (badge) => badge.isEligible(eligibility) && !existingCodes.has(badge.code),
      );

      if (eligibleBadges.length > 0) {
        await transaction.studentBadge.createMany({
          data: eligibleBadges.map((badge) => ({
            studentId,
            code: badge.code,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            earnedAt: now,
          })),
          skipDuplicates: true,
        });
      }

      const earnedBadges: EarnedBadgeDto[] = eligibleBadges.map((badge) => ({
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: now.toISOString(),
      }));
      const leveledUp = nextLevel.level > previousLevel;

      return {
        claimId: claim.id,
        taskType: claim.taskType,
        taskId: claim.taskId,
        xpAwarded: definition.xp,
        alreadyClaimed: false,
        leveledUp,
        sessionCompleted,
        progress: this.toProgressSummary(updatedProgress),
        focus: this.toFocusSummary(updatedProgress),
        badges: earnedBadges,
        celebration: {
          message: this.celebrationMessage(earnedBadges, leveledUp, nextLevel.level),
          animation: 'soft-glow',
          soundCue: null,
        },
      };
    });
  }

  async getStats(
    requestingStudentId: string,
    targetStudentId: string,
  ): Promise<StudentStatsResponseDto> {
    if (requestingStudentId !== targetStudentId) {
      throw new ForbiddenException('You can only view your own reading progress.');
    }

    const student = await this.studentsRepository.findById(targetStudentId);
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const [aggregates, progress] = await Promise.all([
      this.gamificationRepository.getStatsAggregates(targetStudentId),
      this.gamificationRepository.getProgress(targetStudentId),
    ]);

    const rewards = this.toRewardBreakdown(aggregates);

    return {
      studentId: student.id,
      displayName: student.displayName,
      totalReadingSeconds: aggregates.totalReadingSeconds,
      totalReadingMinutes: this.round(aggregates.totalReadingSeconds / 60, 1),
      textsProcessed: aggregates.textsProcessed,
      sessionsStarted: aggregates.sessionsStarted,
      sessionsCompleted: aggregates.sessionsCompleted,
      chunksProcessed: aggregates.chunksProcessed,
      interactions: aggregates.interactions,
      progress: this.toProgressSummary(progress),
      focus: this.toFocusSummary(progress),
      rewards,
      badges: aggregates.badges.map((badge) => ({
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt.toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  private toProgressSummary(progress: StudentProgress | null): ProgressSummaryDto {
    return levelFromXp(progress?.totalXp ?? 0);
  }

  private toFocusSummary(progress: StudentProgress | null): FocusSummaryDto {
    return {
      currentStreak: progress?.currentFocusStreak ?? 0,
      bestStreak: progress?.bestFocusStreak ?? 0,
      focusDays: progress?.totalFocusDays ?? 0,
      message: FOCUS_MESSAGE,
    };
  }

  private toRewardBreakdown(aggregates: {
    readonly claimBreakdown: ReadonlyArray<{
      readonly taskType: RewardTaskType;
      readonly count: number;
    }>;
  }): RewardBreakdownDto {
    const count = (taskType: RewardTaskType): number =>
      aggregates.claimBreakdown.find((item) => item.taskType === taskType)?.count ?? 0;

    return {
      sentences: count(RewardTaskType.SENTENCE_COMPLETED),
      pages: count(RewardTaskType.PAGE_COMPLETED),
      focusMilestones: count(RewardTaskType.FOCUS_MILESTONE),
      sessions: count(RewardTaskType.SESSION_COMPLETED),
      totalClaims: aggregates.claimBreakdown.reduce((total, item) => total + item.count, 0),
    };
  }

  private celebrationMessage(
    badges: readonly EarnedBadgeDto[],
    leveledUp: boolean,
    level: number,
  ): string {
    if (badges.length > 0) {
      return `A new calm badge is here: ${badges[0]?.name ?? 'a new badge'}. No rush — take it at your pace.`;
    }

    if (leveledUp) {
      return `Your reading path reached level ${level}. Keep going gently.`;
    }

    return 'Small steps count. This one is saved.';
  }

  private round(value: number, decimalPlaces: number): number {
    const factor = 10 ** decimalPlaces;
    return Math.round(value * factor) / factor;
  }
}
