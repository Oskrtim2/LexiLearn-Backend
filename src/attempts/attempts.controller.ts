import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  async submitAttempt(
    @Request() req: any,
    @Body() body: { exerciseId: string, answerData: any, timeTaken: number, studentId?: string }
  ) {
    // For simplicity, extracting studentId from authenticated user if available
    // Otherwise from body if this is requested by a teacher for a student
    const studentId = body.studentId || req.user.id; 
    
    return this.attemptsService.submitAttempt(
      studentId,
      body.exerciseId,
      body.answerData,
      body.timeTaken
    );
  }
}
