import { createHmac } from 'node:crypto';
import { PrismaClient, ReadingSessionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface DemoStudent {
  readonly studentCode: string;
  readonly displayName: string;
  readonly gradeLevel: number;
  readonly classroomCode: string;
  readonly pin: string;
  readonly visualSequence: readonly string[];
}

const demoStudents: readonly DemoStudent[] = [
  {
    studentCode: 'LEX-001',
    displayName: 'Sam',
    gradeLevel: 4,
    classroomCode: 'CLASS-4A',
    pin: '4821',
    visualSequence: ['star', 'moon', 'leaf'],
  },
  {
    studentCode: 'LEX-002',
    displayName: 'Maya',
    gradeLevel: 6,
    classroomCode: 'CLASS-6B',
    pin: '7350',
    visualSequence: ['sun', 'cloud', 'flower'],
  },
];

function visualHash(studentCode: string, sequence: readonly string[]): string {
  const secret = process.env.VISUAL_TOKEN_SECRET;

  if (!secret) {
    throw new Error('VISUAL_TOKEN_SECRET is required to seed visual sign-in tokens');
  }

  return createHmac('sha256', secret)
    .update(studentCode)
    .update('\u001e')
    .update(sequence.map((icon) => icon.trim().toLowerCase()).join('\u001f'))
    .digest('hex');
}

async function main(): Promise<void> {
  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  for (const demo of demoStudents) {
    const pinHash = await bcrypt.hash(demo.pin, bcryptRounds);
    const visualTokenHash = visualHash(demo.studentCode, demo.visualSequence);

    const student = await prisma.student.upsert({
      where: { studentCode: demo.studentCode },
      update: {
        displayName: demo.displayName,
        gradeLevel: demo.gradeLevel,
        classroomCode: demo.classroomCode,
        pinHash,
        visualTokenHash,
      },
      create: {
        studentCode: demo.studentCode,
        displayName: demo.displayName,
        gradeLevel: demo.gradeLevel,
        classroomCode: demo.classroomCode,
        pinHash,
        visualTokenHash,
        progress: { create: {} },
      },
    });

    await prisma.studentProgress.upsert({
      where: { studentId: student.id },
      update: {},
      create: { studentId: student.id },
    });

    // A tiny amount of history makes the stats endpoint useful immediately in
    // local development. It is only ever run explicitly by the operator.
    const existingSessions = await prisma.readingSession.count({
      where: { studentId: student.id },
    });

    if (existingSessions === 0) {
      await prisma.readingSession.create({
        data: {
          studentId: student.id,
          status: ReadingSessionStatus.COMPLETED,
          startedAt: new Date(Date.now() - 15 * 60_000),
          lastHeartbeatAt: new Date(Date.now() - 10 * 60_000),
          endedAt: new Date(Date.now() - 10 * 60_000),
          durationSeconds: 300,
          chunksProcessed: 4,
          interactions: 9,
        },
      });
    }

    console.log(
      `Seeded ${demo.studentCode} (PIN ${demo.pin}, visual ${demo.visualSequence.join(' → ')})`,
    );
  }
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    console.error('Seed failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error('Seed cleanup failed', error);
  process.exitCode = 1;
});
