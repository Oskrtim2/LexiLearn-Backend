import { Injectable } from '@nestjs/common';
import type { Prisma, Student } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

export interface AccessIdentity {
  readonly id: string;
  readonly studentCode: string;
}

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(studentCode: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { studentCode } });
  }

  findById(studentId: string): Promise<Student | null> {
    return this.prisma.student.findUnique({ where: { id: studentId } });
  }

  findAccessIdentity(studentId: string): Promise<AccessIdentity | null> {
    return this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, studentCode: true },
    });
  }

  create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  updatePreferences(studentId: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return this.prisma.student.update({ where: { id: studentId }, data });
  }

  updatePin(studentId: string, pinHash: string): Promise<Student> {
    return this.prisma.student.update({ where: { id: studentId }, data: { pinHash } });
  }

  updateVisualToken(studentId: string, visualTokenHash: string | null): Promise<Student> {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { visualTokenHash },
    });
  }

  async rotateQrVersion(studentId: string): Promise<Student> {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { qrTokenVersion: { increment: 1 } },
    });
  }

  async recordSuccessfulLogin(studentId: string): Promise<Student> {
    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        loginLockedUntil: null,
      },
    });
  }

  async recordFailedLogin(
    studentId: string,
    currentAttempts: number,
    maxAttempts: number,
    lockMinutes: number,
  ): Promise<void> {
    const shouldLock = currentAttempts + 1 >= maxAttempts;
    await this.prisma.student.update({
      where: { id: studentId },
      data: shouldLock
        ? {
            failedLoginAttempts: 0,
            loginLockedUntil: new Date(Date.now() + lockMinutes * 60_000),
          }
        : { failedLoginAttempts: { increment: 1 } },
    });
  }

  async clearExpiredLock(studentId: string): Promise<void> {
    await this.prisma.student.update({
      where: { id: studentId },
      data: { failedLoginAttempts: 0, loginLockedUntil: null },
    });
  }
}
