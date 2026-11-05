import type { Student } from '@prisma/client';
import { AccessibilityPreferencesDto, StudentResponseDto } from './dto/student.dto.js';

export function toStudentResponse(student: Student): StudentResponseDto {
  const accessibility: AccessibilityPreferencesDto = {
    preferredFont: student.preferredFont,
    letterSpacing: student.letterSpacing,
    lineHeight: student.lineHeight,
    contrastMode: student.contrastMode,
    lineFocusWindowSize: student.lineFocusWindowSize,
    ttsVoicePersona: student.ttsVoicePersona,
    speechRate: student.speechRate,
    speechPitch: student.speechPitch,
    highlightPacing: student.highlightPacing,
    reduceMotion: student.reduceMotion,
    soundEffects: student.soundEffects,
  };

  return {
    id: student.id,
    studentCode: student.studentCode,
    displayName: student.displayName,
    gradeLevel: student.gradeLevel,
    classroomCode: student.classroomCode,
    accessibility,
    lastLoginAt: student.lastLoginAt?.toISOString() ?? null,
    createdAt: student.createdAt.toISOString(),
  };
}
