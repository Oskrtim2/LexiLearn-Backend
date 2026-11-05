import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { CurrentStudent } from '../../common/decorators/current-student.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto.js';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard.js';
import {
  CreateStudentDto,
  ProvisionedStudentResponseDto,
  StudentResponseDto,
  UpdateAccessibilityPreferencesDto,
} from './dto/student.dto.js';
import { StudentsService } from './students.service.js';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Public()
  @UseGuards(AdminApiKeyGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @ApiOperation({
    summary: 'Provision a student profile (educators only)',
    description:
      'Creates a student with a hashed PIN, optional visual sign-in sequence, default accessibility settings, and a QR sign-in token.',
  })
  @ApiSecurity('admin-api-key')
  @ApiHeader({
    name: 'x-admin-api-key',
    required: true,
    description: 'Classroom provisioning key. Never exposed to students.',
  })
  @ApiCreatedResponse({ type: ProvisionedStudentResponseDto })
  @ApiResponse({ status: 409, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  create(@Body() dto: CreateStudentDto): Promise<ProvisionedStudentResponseDto> {
    return this.studentsService.create(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the signed-in student profile and preferences' })
  @ApiOkResponse({ type: StudentResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  getMe(@CurrentStudent() student: AuthenticatedStudent): Promise<StudentResponseDto> {
    return this.studentsService.getProfile(student.studentId);
  }

  @Patch('me/preferences')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update accessibility and sensory preferences',
    description:
      'Every field is optional. Only safe, validated accessibility settings are accepted.',
  })
  @ApiOkResponse({ type: StudentResponseDto })
  @ApiResponse({ status: 400, type: ApiErrorResponseDto })
  @ApiResponse({ status: 401, type: ApiErrorResponseDto })
  updatePreferences(
    @CurrentStudent() student: AuthenticatedStudent,
    @Body() dto: UpdateAccessibilityPreferencesDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.updatePreferences(student.studentId, dto);
  }
}
