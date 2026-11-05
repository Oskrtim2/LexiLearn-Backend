import { Injectable } from '@nestjs/common';
import { Prisma, ReadingSessionStatus, RewardTaskType } from '@prisma/client';
import type { ReadingSession, StudentBadge, StudentProgress } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

export interface StartSessionResult {
  readonly session: ReadingSession;
  readonly resumed: boolean;
}

export interface HeartbeatCommand {
  readonly sessionId: string;
  readonly studentId: string;
  readonly activeSeconds: number;
  readonly chunksProcessed: number;
  readonly interactions: number;
  readonly now: Date;
}

export interface HeartbeatResult {
  readonly session: ReadingSession;
  readonly progress: StudentProgress;
  readonly accepted: {
    readonly activeSeconds: number;
    readonly chunksProcessed: number;
    readonly interactions: number;
  };
}

export interface ClaimBreakdown {
  readonly taskType: RewardTaskType;
  readonly count: number;
}

export interface StatsAggregates {
  readonly sessionsStarted: number;
  readonly sessionsCompleted: number;
  readonly totalReadingSeconds: number;
  readonly chunksProcessed: number;
  readonly interactions: number;
  readonly textsProcessed: number;
  readonly badges: StudentBadge[];
  readonly claimBreakdown: ClaimBreakdown[];
}

const SESSION_RESUME_WINDOW_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class GamificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedSession(sessionId: string, studentId: string): Promise<ReadingSession | null> {
    return this.prisma.readingSession.findFirst({
      where: { id: sessionId, studentId },
    });
  }

  async startSession(studentId: string, documentId: string | null): Promise<StartSessionResult> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - SESSION_RESUME_WINDOW_MS);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`session-start:${studentId}`}))`;

      const active = await transaction.readingSession.findFirst({
        where: { studentId, status: ReadingSessionStatus.ACTIVE },
        orderBy: { lastHeartbeatAt: 'desc' },
      });

      if (
        active &&
        active.documentId === documentId &&
        active.lastHeartbeatAt.getTime() >= staleBefore.getTime()
      ) {
        return { session: active, resumed: true };
      }

      if (active) {
        await transaction.readingSession.update({
          where: { id: active.id },
          data: {
            status: ReadingSessionStatus.ABANDONED,
            endedAt: now,
          },
        });
      }

      await transaction.readingSession.updateMany({
        where: { studentId, status: ReadingSessionStatus.ACTIVE },
        data: {
          status: ReadingSessionStatus.ABANDONED,
          endedAt: now,
        },
      });

      const session = await transaction.readingSession.create({
        data: {
          studentId,
          documentId,
          status: ReadingSessionStatus.ACTIVE,
          startedAt: now,
          lastHeartbeatAt: now,
        },
      });

      return { session, resumed: false };
    });
  }

  async recordHeartbeat(command: HeartbeatCommand): Promise<HeartbeatResult | null> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`heartbeat:${command.sessionId}`}))`;

        const session = await transaction.readingSession.findFirst({
          where: {
            id: command.sessionId,
            studentId: command.studentId,
            status: ReadingSessionStatus.ACTIVE,
          },
        });

        if (!session) {
          return null;
        }

        const elapsedSinceStart = Math.max(
          0,
          Math.floor((command.now.getTime() - session.startedAt.getTime()) / 1000),
        );
        const wallClockBudget = elapsedSinceStart + 30;
        const acceptedSeconds = Math.max(
          0,
          Math.min(command.activeSeconds, wallClockBudget - session.durationSeconds),
        );
        const acceptedChunks = command.chunksProcessed;
        const acceptedInteractions = command.interactions;

        const updatedSession = await transaction.readingSession.update({
          where: { id: session.id },
          data: {
            durationSeconds: { increment: acceptedSeconds },
            chunksProcessed: { increment: acceptedChunks },
            interactions: { increment: acceptedInteractions },
            lastHeartbeatAt: command.now,
          },
        });

        const hasActivity = acceptedSeconds > 0 || acceptedChunks > 0 || acceptedInteractions > 0;
        const progress = hasActivity
          ? await this.recordFocusDay(transaction, command.studentId, command.now)
          : await this.getOrCreateProgress(transaction, command.studentId);

        return {
          session: updatedSession,
          progress,
          accepted: {
            activeSeconds: acceptedSeconds,
            chunksProcessed: acceptedChunks,
            interactions: acceptedInteractions,
          },
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  }

  async withRewardLock<T>(
    studentId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`rewards:${studentId}`}))`;
        return operation(transaction);
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  }

  getProgress(studentId: string): Promise<StudentProgress | null> {
    return this.prisma.studentProgress.findUnique({ where: { studentId } });
  }

  async getStatsAggregates(studentId: string): Promise<StatsAggregates> {
    const [sessionAggregate, completedSessions, textsProcessed, badges, claimGroups] =
      await Promise.all([
        this.prisma.readingSession.aggregate({
          where: { studentId },
          _count: { _all: true },
          _sum: {
            durationSeconds: true,
            chunksProcessed: true,
            interactions: true,
          },
        }),
        this.prisma.readingSession.count({
          where: { studentId, status: ReadingSessionStatus.COMPLETED },
        }),
        this.prisma.ocrDocument.count({ where: { studentId } }),
        this.prisma.studentBadge.findMany({
          where: { studentId },
          orderBy: { earnedAt: 'asc' },
        }),
        this.prisma.rewardClaim.groupBy({
          by: ['taskType'],
          where: { studentId },
          _count: { _all: true },
        }),
      ]);

    return {
      sessionsStarted: sessionAggregate._count._all,
      sessionsCompleted: completedSessions,
      totalReadingSeconds: sessionAggregate._sum.durationSeconds ?? 0,
      chunksProcessed: sessionAggregate._sum.chunksProcessed ?? 0,
      interactions: sessionAggregate._sum.interactions ?? 0,
      textsProcessed,
      badges,
      claimBreakdown: claimGroups.map((group) => ({
        taskType: group.taskType,
        count: group._count._all,
      })),
    };
  }

  private async recordFocusDay(
    transaction: Prisma.TransactionClient,
    studentId: string,
    now: Date,
  ): Promise<StudentProgress> {
    const progress = await this.getOrCreateProgress(transaction, studentId);
    const today = this.startOfUtcDay(now);
    const lastActive = progress.lastActiveDate;
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    if (lastActive && this.isSameUtcDay(lastActive, today)) {
      return progress;
    }

    const continuesStreak = lastActive ? this.isSameUtcDay(lastActive, yesterday) : false;
    const nextStreak = continuesStreak ? progress.currentFocusStreak + 1 : 1;
    const nextBest = Math.max(progress.bestFocusStreak, nextStreak);

    return transaction.studentProgress.update({
      where: { studentId },
      data: {
        currentFocusStreak: nextStreak,
        bestFocusStreak: nextBest,
        totalFocusDays: { increment: 1 },
        lastActiveDate: today,
      },
    });
  }

  private async getOrCreateProgress(
    transaction: Prisma.TransactionClient,
    studentId: string,
  ): Promise<StudentProgress> {
    const existing = await transaction.studentProgress.findUnique({
      where: { studentId },
    });

    if (existing) {
      return existing;
    }

    return transaction.studentProgress.create({
      data: { studentId },
    });
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private isSameUtcDay(left: Date, right: Date): boolean {
    return (
      left.getUTCFullYear() === right.getUTCFullYear() &&
      left.getUTCMonth() === right.getUTCMonth() &&
      left.getUTCDate() === right.getUTCDate()
    );
  }
}
