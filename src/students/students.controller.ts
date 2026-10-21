import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string) {
    return this.studentsService.getProgress(id);
  }

  @Get(':id/attempts')
  async getAttempts(@Param('id') id: string) {
    return this.studentsService.getAttempts(id);
  }

  @Get(':id/assessment')
  async getAssessment(@Param('id') id: string) {
    return this.studentsService.getAssessment(id);
  }
}
