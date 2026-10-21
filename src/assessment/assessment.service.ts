import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssessmentService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssessment(studentId: string, results: any, notes?: string) {
    return this.prisma.assessment.create({
      data: {
        studentId,
        results,
        notes,
      },
    });
  }

  async getAssessments(studentId: string) {
    return this.prisma.assessment.findMany({
      where: { studentId },
      orderBy: { assessmentDate: 'desc' },
    });
  }
}
