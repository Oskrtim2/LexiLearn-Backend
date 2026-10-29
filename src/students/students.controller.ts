import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Get(':id/attempts')
  async getAttempts(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getAttempts(id);
  }

  @Get(':id/assessment')
  async getAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.getAssessment(id);
  }
}
