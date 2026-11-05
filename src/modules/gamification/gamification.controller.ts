import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { CurrentStudent } from '../../common/decorators/current-student.decorator.js';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import {
  ClaimRewardDto,
  ClaimRewardResponseDto,
  HeartbeatDto,
  HeartbeatResponseDto,
  StartSessionDto,
  StartSessionResponseDto,
  StudentStatsResponseDto,
} from './dto/gamification.dto.js';
import { GamificationService } from './gamification.service.js';

@ApiTags('Gamification')
@ApiBearerAuth()
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Post('sessions/start')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Start or safely resume a reading session',
    description:
      'Only one active session is kept per student. Recent sessions resume instead of creating duplicate tracking records.',
  })
  @ApiOkResponse({ type: StartSessionResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  startSession(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: StartSessionDto,
  ): Promise<StartSessionResponseDto> {
    return this.gamificationService.startSession(student.studentId, dto);
  }

  @Post('sessions/heartbeat')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Record reading activity without pressure',
    description:
      'Server-side wall-clock budgets prevent inflated durations. Focus days are cumulative, and missing a day never removes XP or badges.',
  })
  @ApiOkResponse({ type: HeartbeatResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  heartbeat(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: HeartbeatDto,
  ): Promise<HeartbeatResponseDto> {
    return this.gamificationService.heartbeat(student.studentId, dto);
  }

  @Post('rewards/claim')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Record a completed task and award calm micro-progress',
    description:
      'Task IDs are idempotent per student. XP is never removed; streaks have no punitive notifications, and celebration responses carry no sound cue.',
  })
  @ApiOkResponse({ type: ClaimRewardResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  claimReward(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: ClaimRewardDto,
  ): Promise<ClaimRewardResponseDto> {
    return this.gamificationService.claimReward(student.studentId, dto);
  }

  @Get('students/:id/stats')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get aggregate progress for the signed-in student' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: StudentStatsResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  @ApiResponse({ status: 403, type: ApiErrorResponseDto })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  getStats(
    @CurrentStudent() student: AuthenticatedStudent,
    @Param('id', new ParseUUIDPipe({ version: '4' })) studentId: string,
  ): Promise<StudentStatsResponseDto> {
    return this.gamificationService.getStats(student.studentId, studentId);
  }
}
