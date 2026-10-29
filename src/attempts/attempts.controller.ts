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
    @Body() body: { exerciseId: number; answerData: any; timeTaken: number; studentId?: number },
  ) {
    const studentId = body.studentId || req.user.id;

    return this.attemptsService.submitAttempt(
      studentId,
      body.exerciseId,
      body.answerData,
      body.timeTaken,
    );
  }
}
