-- CreateEnum
CREATE TYPE "FontFamily" AS ENUM ('OPEN_DYSLEXIC', 'ATKINSON_HYPERLEGIBLE', 'VERDANA', 'ARIAL', 'COMIC_SANS');

-- CreateEnum
CREATE TYPE "ContrastMode" AS ENUM ('LIGHT', 'DARK', 'PASTEL', 'HIGH_CONTRAST');

-- CreateEnum
CREATE TYPE "TtsVoicePersona" AS ENUM ('CHILD_FRIENDLY', 'CALM_NARRATOR', 'NEURAL_FRIENDLY');

-- CreateEnum
CREATE TYPE "HighlightPacing" AS ENUM ('SLOW', 'BALANCED', 'FAST');

-- CreateEnum
CREATE TYPE "ReadingSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RewardTaskType" AS ENUM ('SENTENCE_COMPLETED', 'PAGE_COMPLETED', 'SESSION_COMPLETED', 'FOCUS_MILESTONE');

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "studentCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "classroomCode" TEXT,
    "pinHash" TEXT NOT NULL,
    "visualTokenHash" TEXT,
    "qrTokenVersion" INTEGER NOT NULL DEFAULT 1,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "loginLockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "preferredFont" "FontFamily" NOT NULL DEFAULT 'OPEN_DYSLEXIC',
    "letterSpacing" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.6,
    "contrastMode" "ContrastMode" NOT NULL DEFAULT 'LIGHT',
    "lineFocusWindowSize" INTEGER NOT NULL DEFAULT 3,
    "ttsVoicePersona" "TtsVoicePersona" NOT NULL DEFAULT 'CHILD_FRIENDLY',
    "speechRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "speechPitch" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "highlightPacing" "HighlightPacing" NOT NULL DEFAULT 'BALANCED',
    "reduceMotion" BOOLEAN NOT NULL DEFAULT true,
    "soundEffects" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentFocusStreak" INTEGER NOT NULL DEFAULT 0,
    "bestFocusStreak" INTEGER NOT NULL DEFAULT 0,
    "totalFocusDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingSession" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "documentId" UUID,
    "status" "ReadingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "chunksProcessed" INTEGER NOT NULL DEFAULT 0,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardClaim" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "sessionId" UUID,
    "taskType" "RewardTaskType" NOT NULL,
    "taskId" TEXT NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBadge" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrDocument" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "processingMs" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "blocks" JSONB NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "sentenceCount" INTEGER NOT NULL,
    "paragraphCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrTextChunk" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcrTextChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsAsset" (
    "id" UUID NOT NULL,
    "contentHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "pitch" DOUBLE PRECISION NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "audioData" BYTEA NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentCode_key" ON "Student"("studentCode");

-- CreateIndex
CREATE INDEX "Student_classroomCode_idx" ON "Student"("classroomCode");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_studentId_key" ON "StudentProgress"("studentId");

-- CreateIndex
CREATE INDEX "ReadingSession_studentId_status_idx" ON "ReadingSession"("studentId", "status");

-- CreateIndex
CREATE INDEX "ReadingSession_studentId_startedAt_idx" ON "ReadingSession"("studentId", "startedAt");

-- CreateIndex
CREATE INDEX "RewardClaim_studentId_createdAt_idx" ON "RewardClaim"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RewardClaim_studentId_taskId_key" ON "RewardClaim"("studentId", "taskId");

-- CreateIndex
CREATE INDEX "StudentBadge_studentId_earnedAt_idx" ON "StudentBadge"("studentId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBadge_studentId_code_key" ON "StudentBadge"("studentId", "code");

-- CreateIndex
CREATE INDEX "OcrDocument_studentId_createdAt_idx" ON "OcrDocument"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "OcrTextChunk_documentId_idx" ON "OcrTextChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "OcrTextChunk_documentId_order_key" ON "OcrTextChunk"("documentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TtsAsset_contentHash_key" ON "TtsAsset"("contentHash");

-- CreateIndex
CREATE INDEX "TtsAsset_lastAccessedAt_idx" ON "TtsAsset"("lastAccessedAt");

-- AddForeignKey
ALTER TABLE "StudentProgress" ADD CONSTRAINT "StudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OcrDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardClaim" ADD CONSTRAINT "RewardClaim_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReadingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBadge" ADD CONSTRAINT "StudentBadge_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrDocument" ADD CONSTRAINT "OcrDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrTextChunk" ADD CONSTRAINT "OcrTextChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OcrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
