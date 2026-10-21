import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student.findMany();
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        progresses: true,
      }
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async getProgress(id: string) {
    const student = await this.findOne(id);
    return student.progresses;
  }

  async getAttempts(id: string) {
    return this.prisma.exerciseAttempt.findMany({
      where: { studentId: id },
      orderBy: { attemptDate: 'desc' },
      include: {
        exercise: true,
      }
    });
  }

  async getAssessment(id: string) {
    return this.prisma.assessment.findMany({
      where: { studentId: id },
      orderBy: { assessmentDate: 'desc' },
    });
  }
}
