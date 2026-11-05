import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Student } from '@prisma/client';
import type { AuthenticatedStudent } from '../../common/auth/auth.interfaces.js';
import { HashingService } from '../../common/security/hashing.service.js';
import { TokenService } from '../../common/security/token.service.js';
import { toStudentResponse } from '../students/student.mapper.js';
import { StudentsRepository } from '../students/students.repository.js';
import type {
  AuthResponseDto,
  ChangePinDto,
  LoginPinDto,
  LoginQrDto,
  LoginVisualDto,
  PinChangedResponseDto,
  QrTokenResponseDto,
  SetVisualTokenDto,
  VisualTokenResponseDto,
} from './dto/auth.dto.js';

const INVALID_CREDENTIALS = 'Student code or sign-in details are not correct.';
const SIGN_IN_PAUSED = 'Sign-in is paused for a few minutes. Please ask your teacher for help.';

@Injectable()
export class AuthService {
  private readonly maxAttempts: number;
  private readonly lockMinutes: number;

  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    configService: ConfigService,
  ) {
    this.maxAttempts = configService.getOrThrow<number>('auth.loginMaxAttempts');
    this.lockMinutes = configService.getOrThrow<number>('auth.loginLockMinutes');
  }

  async loginWithPin(dto: LoginPinDto): Promise<AuthResponseDto> {
    const studentCode = dto.studentCode.trim().toUpperCase();
    const student = await this.studentsRepository.findByCode(studentCode);

    if (!student) {
      await this.hashingService.burnPinComparison(dto.pin);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.assertSignInAvailable(student);
    const isValid = await this.hashingService.verifyPin(dto.pin, student.pinHash);

    if (!isValid) {
      await this.recordFailure(student);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.completeLogin(student);
  }

  async loginWithQr(dto: LoginQrDto): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyQrToken(dto.qrToken);
    const student = await this.studentsRepository.findById(payload.sub);

    if (!student || student.qrTokenVersion !== payload.version) {
      throw new UnauthorizedException('This reader code is no longer active.');
    }

    return this.completeLogin(student);
  }

  async loginWithVisual(dto: LoginVisualDto): Promise<AuthResponseDto> {
    const studentCode = dto.studentCode.trim().toUpperCase();
    const student = await this.studentsRepository.findByCode(studentCode);

    if (!student || !student.visualTokenHash) {
      // Keep the response path and timing consistent with a real visual check.
      this.hashingService.hashVisualSequence(studentCode, dto.imageSequence);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.assertSignInAvailable(student);
    const isValid = this.hashingService.verifyVisualSequence(
      student.studentCode,
      dto.imageSequence,
      student.visualTokenHash,
    );

    if (!isValid) {
      await this.recordFailure(student);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.completeLogin(student);
  }

  async generateQrToken(
    student: AuthenticatedStudent,
    rotate: boolean,
  ): Promise<QrTokenResponseDto> {
    let current = await this.studentsRepository.findById(student.studentId);

    if (!current) {
      throw new UnauthorizedException('Student session is no longer valid.');
    }

    if (rotate) {
      current = await this.studentsRepository.rotateQrVersion(current.id);
    }

    const token = await this.tokenService.issueQrToken(current.id, current.qrTokenVersion);

    return {
      qrToken: token.token,
      studentCode: current.studentCode,
      expiresAt: token.expiresAt,
      expiresIn: token.expiresInSeconds,
    };
  }

  async setVisualToken(
    student: AuthenticatedStudent,
    dto: SetVisualTokenDto,
  ): Promise<VisualTokenResponseDto> {
    const current = await this.studentsRepository.findById(student.studentId);

    if (!current) {
      throw new UnauthorizedException('Student session is no longer valid.');
    }

    const visualTokenHash = this.hashingService.hashVisualSequence(
      current.studentCode,
      dto.imageSequence,
    );
    await this.studentsRepository.updateVisualToken(current.id, visualTokenHash);

    return {
      message: 'Visual sign-in is ready.',
      visualTokenConfigured: true,
    };
  }

  async changePin(
    student: AuthenticatedStudent,
    dto: ChangePinDto,
  ): Promise<PinChangedResponseDto> {
    const currentStudent = await this.studentsRepository.findById(student.studentId);

    if (!currentStudent) {
      throw new UnauthorizedException('Student session is no longer valid.');
    }

    await this.assertSignInAvailable(currentStudent);
    const isValid = await this.hashingService.verifyPin(dto.currentPin, currentStudent.pinHash);

    if (!isValid) {
      await this.recordFailure(currentStudent);
      throw new UnauthorizedException('The current PIN is not correct.');
    }

    const pinHash = await this.hashingService.hashPin(dto.newPin);
    await this.studentsRepository.updatePin(currentStudent.id, pinHash);

    return { message: 'Your new sign-in PIN is ready.' };
  }

  private async assertSignInAvailable(student: Student): Promise<void> {
    if (!student.loginLockedUntil) {
      return;
    }

    if (student.loginLockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException(SIGN_IN_PAUSED);
    }

    await this.studentsRepository.clearExpiredLock(student.id);
  }

  private async recordFailure(student: Student): Promise<void> {
    await this.studentsRepository.recordFailedLogin(
      student.id,
      student.failedLoginAttempts,
      this.maxAttempts,
      this.lockMinutes,
    );
  }

  private async completeLogin(student: Student): Promise<AuthResponseDto> {
    const updated = await this.studentsRepository.recordSuccessfulLogin(student.id);
    const token = await this.tokenService.issueAccessToken(updated.id, updated.studentCode);

    return {
      accessToken: token.token,
      tokenType: 'Bearer',
      expiresIn: token.expiresInSeconds,
      expiresAt: token.expiresAt,
      student: toStudentResponse(updated),
    };
  }
}
