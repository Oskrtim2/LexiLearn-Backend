import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assessment } from './entities/assessment.entity';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectRepository(Assessment)
    private readonly assessmentRepository: Repository<Assessment>,
  ) {}

  async createAssessment(studentId: number, results: any, notes?: string) {
    return this.assessmentRepository.save({
      studentId,
      results,
      notes,
    });
  }

  async getAssessments(studentId: number) {
    return this.assessmentRepository.find({
      where: { studentId },
      order: { assessmentDate: 'DESC' },
    });
  }
}
