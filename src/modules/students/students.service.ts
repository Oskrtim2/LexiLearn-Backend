import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Student } from '@prisma/client';
import { HashingService } from '../../common/security/hashing.service.js';
import { TokenService } from '../../common/security/token.service.js';
import type {
  CreateStudentDto,
  ProvisionedStudentResponseDto,
  StudentResponseDto,
  UpdateAccessibilityPreferencesDto,
} from './dto/student.dto.js';
import { toStudentResponse } from './student.mapper.js';
import { StudentsRepository } from './students.repository.js';

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
  ) {}

  async create(dto: CreateStudentDto): Promise<ProvisionedStudentResponseDto> {
    const studentCode = dto.studentCode.trim().toUpperCase();
    const existing = await this.studentsRepository.findByCode(studentCode);

    if (existing) {
      throw new ConflictException('studentCode is already registered');
    }

    const pinHash = await this.hashingService.hashPin(dto.pin);
    const visualTokenHash = dto.visualSequence
      ? this.hashingService.hashVisualSequence(studentCode, dto.visualSequence)
      : undefined;

    // The HMAC helper binds the visual secret to a stable student identifier.
    // At creation time the code is unique and stable, so it is used as the scope.
    const created = await this.studentsRepository.create({
      studentCode,
      displayName: dto.displayName,
      gradeLevel: dto.gradeLevel,
      classroomCode: dto.classroomCode?.trim() || null,
      pinHash,
      visualTokenHash,
      progress: { create: {} },
    });

    const qr = await this.tokenService.issueQrToken(created.id, created.qrTokenVersion);
    const profile = toStudentResponse(created);

    return {
      id: profile.id,
      studentCode: profile.studentCode,
      displayName: profile.displayName,
      gradeLevel: profile.gradeLevel,
      classroomCode: profile.classroomCode,
      accessibility: profile.accessibility,
      lastLoginAt: profile.lastLoginAt,
      createdAt: profile.createdAt,
      qrToken: qr.token,
      qrTokenExpiresAt: qr.expiresAt,
    };
  }

  async getProfile(studentId: string): Promise<StudentResponseDto> {
    const student = await this.requireStudent(studentId);
    return toStudentResponse(student);
  }

  async updatePreferences(
    studentId: string,
    dto: UpdateAccessibilityPreferencesDto,
  ): Promise<StudentResponseDto> {
    await this.requireStudent(studentId);

    const data: Prisma.StudentUpdateInput = {
      ...(dto.preferredFont !== undefined ? { preferredFont: dto.preferredFont } : {}),
      ...(dto.letterSpacing !== undefined ? { letterSpacing: dto.letterSpacing } : {}),
      ...(dto.lineHeight !== undefined ? { lineHeight: dto.lineHeight } : {}),
      ...(dto.contrastMode !== undefined ? { contrastMode: dto.contrastMode } : {}),
      ...(dto.lineFocusWindowSize !== undefined
        ? { lineFocusWindowSize: dto.lineFocusWindowSize }
        : {}),
      ...(dto.ttsVoicePersona !== undefined ? { ttsVoicePersona: dto.ttsVoicePersona } : {}),
      ...(dto.speechRate !== undefined ? { speechRate: dto.speechRate } : {}),
      ...(dto.speechPitch !== undefined ? { speechPitch: dto.speechPitch } : {}),
      ...(dto.highlightPacing !== undefined ? { highlightPacing: dto.highlightPacing } : {}),
      ...(dto.reduceMotion !== undefined ? { reduceMotion: dto.reduceMotion } : {}),
      ...(dto.soundEffects !== undefined ? { soundEffects: dto.soundEffects } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one accessibility preference must be provided');
    }

    const updated = await this.studentsRepository.updatePreferences(studentId, data);
    return toStudentResponse(updated);
  }

  private async requireStudent(studentId: string): Promise<Student> {
    const student = await this.studentsRepository.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }
}
