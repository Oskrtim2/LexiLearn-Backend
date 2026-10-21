import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post()
  async createAssessment(
    @Request() req: any,
    @Body() body: { results: any, notes?: string, studentId?: string }
  ) {
    const studentId = body.studentId || req.user.id;
    return this.assessmentService.createAssessment(studentId, body.results, body.notes);
  }

  @Get(':studentId')
  async getAssessments(@Param('studentId') studentId: string) {
    return this.assessmentService.getAssessments(studentId);
  }
}
