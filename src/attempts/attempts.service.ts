import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitAttempt(studentId: string, exerciseId: string, answerData: any, timeTaken: number) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { skill: true }
    });

    if (!exercise) throw new NotFoundException('Exercise not found');

    // Basic evaluation logic (mocked for this phase)
    // In reality, this would compare answerData with exercise.content
    const isCorrect = answerData?.isCorrect === true;
    const score = isCorrect ? 100 : 0;

    // 1. Store the attempt
    const attempt = await this.prisma.exerciseAttempt.create({
      data: {
        studentId,
        exerciseId,
        score,
        isCorrect,
        timeTaken,
        answerData,
      }
    });

    // 2. Update basic progress tracking
    // Fetch or create progress for this skill
    let progress = await this.prisma.progress.findUnique({
      where: {
        studentId_skillId: {
          studentId,
          skillId: exercise.skillId,
        }
      }
    });

    if (!progress) {
      progress = await this.prisma.progress.create({
        data: {
          studentId,
          skillId: exercise.skillId,
          proficiencyLevel: 0,
        }
      });
    }

    // Adaptive Learning Logic: Simple rules based on correct answers
    let newProficiency = progress.proficiencyLevel;
    if (isCorrect) {
      newProficiency += (10 / exercise.difficulty); // Increases based on difficulty
    } else {
      newProficiency -= 5;
    }
    
    // Clamp between 0 and 100
    newProficiency = Math.max(0, Math.min(100, newProficiency));
    const needsPractice = newProficiency < 80;

    await this.prisma.progress.update({
      where: { id: progress.id },
      data: {
        proficiencyLevel: newProficiency,
        needsPractice,
        lastPracticed: new Date(),
      }
    });

    return {
      attempt,
      progressUpdate: {
        newProficiency,
        needsPractice
      }
    };
  }
}
