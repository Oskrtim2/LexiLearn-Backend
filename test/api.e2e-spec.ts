import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TtsVoicePersona } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { validationExceptionFactory } from '../src/common/validation/validation-exception.factory.js';
import { OCR_PROVIDER } from '../src/modules/ocr/providers/ocr-provider.interface.js';
import type {
  OcrProvider,
  OcrProviderInput,
  OcrProviderResult,
} from '../src/modules/ocr/providers/ocr-provider.interface.js';
import { TTS_PROVIDER } from '../src/modules/tts/providers/tts-provider.interface.js';
import type {
  TtsProvider,
  TtsProviderResult,
  TtsSynthesisInput,
} from '../src/modules/tts/providers/tts-provider.interface.js';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

const MOCK_AUDIO = Buffer.from([0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00]);

describe('Lexi Learn API (e2e)', () => {
  let app: INestApplication<App>;
  let httpServer: App;
  let prefix: string;
  let adminKey: string;
  let accessToken: string;
  let studentId: string;
  let studentCode: string;
  let ocrChunkId: string;
  let sessionId: string;
  let ttsSynthesisCount = 0;
  const runId = Date.now().toString(36).toUpperCase();
  const testStartedAt = new Date();

  const ocrProviderMock: OcrProvider = {
    name: 'mock-ocr',
    extract: async (_input: OcrProviderInput): Promise<OcrProviderResult> => ({
      text: 'La lectura es un viaje tranquilo.\n\nCada palabra es un paso.',
      confidence: 97.5,
    }),
  };

  const ttsProviderMock: TtsProvider = {
    name: 'mock-tts',
    resolveVoiceId: (persona: TtsVoicePersona, requestedVoiceId?: string): string =>
      requestedVoiceId ?? `mock-${persona.toLowerCase()}`,
    synthesize: async (_input: TtsSynthesisInput): Promise<TtsProviderResult> => {
      ttsSynthesisCount += 1;
      return {
        audio: MOCK_AUDIO,
        mimeType: 'audio/mpeg',
        durationMs: 120,
      };
    },
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OCR_PROVIDER)
      .useValue(ocrProviderMock)
      .overrideProvider(TTS_PROVIDER)
      .useValue(ttsProviderMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);
    prefix = configService.getOrThrow<string>('app.apiPrefix');
    adminKey = configService.getOrThrow<string>('auth.adminApiKey');

    app.setGlobalPrefix(prefix);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer();

    studentCode = `E2E-${runId}`;
    const provisioned = await request(httpServer)
      .post(`/${prefix}/students`)
      .set('x-admin-api-key', adminKey)
      .send({
        studentCode,
        displayName: 'E2E Student',
        gradeLevel: 5,
        classroomCode: 'E2E-CLASS',
        pin: '4821',
        visualSequence: ['star', 'moon', 'leaf'],
      })
      .expect(201);

    studentId = provisioned.body.id as string;
    expect(provisioned.body.qrToken).toEqual(expect.any(String));
  });

  afterAll(async () => {
    if (app) {
      const prisma = app.get(PrismaService);

      if (studentId) {
        await prisma.student.delete({ where: { id: studentId } }).catch(() => undefined);
      }

      await prisma.ttsAsset
        .deleteMany({ where: { createdAt: { gte: testStartedAt } } })
        .catch(() => undefined);
      await app.close();
    }
  });

  it('exposes a public health endpoint and a uniform 401 error envelope', async () => {
    const health = await request(httpServer).get(`/${prefix}/health`).expect(200);
    expect(health.body.status).toBe('ok');
    expect(health.body.database).toBe('up');

    const unauthorized = await request(httpServer).get(`/${prefix}/students/me`).expect(401);

    expect(unauthorized.body).toEqual({
      statusCode: 401,
      timestamp: expect.any(String),
      path: `/${prefix}/students/me`,
      error: 'Unauthorized',
      message: expect.any(Array),
    });
    expect(unauthorized.body.message.length).toBeGreaterThan(0);
  });

  it('signs in with a PIN and updates accessibility preferences', async () => {
    const login = await request(httpServer)
      .post(`/${prefix}/auth/login/pin`)
      .send({ studentCode, pin: '4821' })
      .expect(200);

    accessToken = login.body.accessToken as string;
    expect(login.body.tokenType).toBe('Bearer');
    expect(login.body.student.id).toBe(studentId);

    const preferences = await request(httpServer)
      .patch(`/${prefix}/students/me/preferences`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        preferredFont: 'ATKINSON_HYPERLEGIBLE',
        contrastMode: 'PASTEL',
        lineFocusWindowSize: 4,
        speechRate: 1.15,
        soundEffects: false,
      })
      .expect(200);

    expect(preferences.body.accessibility.contrastMode).toBe('PASTEL');
    expect(preferences.body.accessibility.speechRate).toBe(1.15);
  });

  it('rejects malformed input with validation messages as an array', async () => {
    const response = await request(httpServer)
      .post(`/${prefix}/reading-assistant/process-text`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: '', language: 'xx' })
      .expect(400);

    expect(Array.isArray(response.body.message)).toBe(true);
    expect(response.body.message.length).toBeGreaterThan(0);
    expect(response.body.path).toBe(`/${prefix}/reading-assistant/process-text`);
  });

  it('returns syllables, offsets, micro-chunks, reading time, and difficulty', async () => {
    const response = await request(httpServer)
      .post(`/${prefix}/reading-assistant/process-text`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        text: 'La lectura tranquila avanza. Cada palabra es un pequeno paso, y podemos leer con calma.',
        language: 'es',
        options: { maxWordsPerChunk: 6, wordsPerMinute: 140 },
      })
      .expect(200);

    expect(response.body.statistics.words).toBeGreaterThan(10);
    expect(response.body.sentences.length).toBeGreaterThan(0);
    expect(response.body.sentences[0].microChunks.length).toBeGreaterThan(0);
    expect(response.body.readingTime.estimatedSeconds).toBeGreaterThan(0);
    expect(response.body.difficulty.score).toBeGreaterThanOrEqual(0);

    const word = response.body.words.find((item: { text: string }) => item.text === 'lectura') as
      { syllables: Array<{ text: string }> } | undefined;
    expect(word?.syllables.map((syllable) => syllable.text)).toEqual(['lec', 'tu', 'ra']);
  });

  it('extracts structured OCR text from a validated image and creates TTS chunks', async () => {
    const response = await request(httpServer)
      .post(`/${prefix}/ocr/extract`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', PNG_1X1, {
        filename: 'page.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body.provider).toBe('mock-ocr');
    expect(response.body.blocks.length).toBeGreaterThan(0);
    expect(response.body.statistics.words).toBeGreaterThan(0);
    ocrChunkId = response.body.blocks[0].sentences[0].chunkId as string;
    expect(ocrChunkId).toEqual(expect.any(String));
  });

  it('synthesizes once, reuses the content-hash cache, and serves a signed MP3 URL', async () => {
    const uniqueText = `Every quiet step counts ${runId}.`;
    const first = await request(httpServer)
      .post(`/${prefix}/tts/synthesize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: uniqueText, voice: { speed: 1, pitch: 1 } })
      .expect(200);

    expect(first.body.cached).toBe(false);
    expect(first.body.mimeType).toBe('audio/mpeg');
    expect(ttsSynthesisCount).toBe(1);

    const second = await request(httpServer)
      .post(`/${prefix}/tts/synthesize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: uniqueText, voice: { speed: 1, pitch: 1 } })
      .expect(200);

    expect(second.body.cached).toBe(true);
    expect(second.body.assetId).toBe(first.body.assetId);
    expect(ttsSynthesisCount).toBe(1);

    const chunkAudio = await request(httpServer)
      .post(`/${prefix}/tts/synthesize`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ textChunkId: ocrChunkId })
      .expect(200);

    expect(chunkAudio.body.textChunkId).toBe(ocrChunkId);
    expect(chunkAudio.body.cached).toBe(false);
    expect(ttsSynthesisCount).toBe(2);

    const signedUrl = new URL(chunkAudio.body.signedUrl as string);
    const audio = await request(httpServer)
      .get(`${signedUrl.pathname}${signedUrl.search}`)
      .expect(200)
      .expect('Content-Type', /audio\/mpeg/);

    expect(audio.headers['accept-ranges']).toBe('bytes');
    expect(Number(audio.headers['content-length'])).toBe(MOCK_AUDIO.length);

    const range = await request(httpServer)
      .get(`${signedUrl.pathname}${signedUrl.search}`)
      .set('Range', 'bytes=0-1')
      .expect(206);

    expect(range.headers['content-range']).toBe(`bytes 0-1/${MOCK_AUDIO.length}`);

    await request(httpServer)
      .get(`${signedUrl.pathname}?token=${'x'.repeat(40)}`)
      .expect(401);
  });

  it('tracks a session, applies non-punitive focus, and persists idempotent rewards', async () => {
    const start = await request(httpServer)
      .post(`/${prefix}/gamification/sessions/start`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200);

    sessionId = start.body.sessionId as string;
    expect(start.body.resumed).toBe(false);

    const heartbeat = await request(httpServer)
      .post(`/${prefix}/gamification/sessions/heartbeat`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sessionId, activeSeconds: 5, chunksProcessed: 1, interactions: 2 })
      .expect(200);

    expect(heartbeat.body.accepted.activeSeconds).toBeLessThanOrEqual(35);
    expect(heartbeat.body.focus.focusDays).toBe(1);
    expect(heartbeat.body.focus.message).toContain('Rest days');

    const taskId = `sentence:${runId}`;
    const claim = await request(httpServer)
      .post(`/${prefix}/gamification/rewards/claim`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taskType: 'SENTENCE_COMPLETED', taskId, sessionId })
      .expect(200);

    expect(claim.body.xpAwarded).toBe(5);
    expect(claim.body.alreadyClaimed).toBe(false);
    expect(claim.body.badges.length).toBeGreaterThan(0);
    expect(claim.body.celebration.soundCue).toBeNull();

    const duplicate = await request(httpServer)
      .post(`/${prefix}/gamification/rewards/claim`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taskType: 'SENTENCE_COMPLETED', taskId, sessionId })
      .expect(200);

    expect(duplicate.body.xpAwarded).toBe(0);
    expect(duplicate.body.alreadyClaimed).toBe(true);

    const completion = await request(httpServer)
      .post(`/${prefix}/gamification/rewards/claim`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taskType: 'SESSION_COMPLETED', taskId: `session:${runId}`, sessionId })
      .expect(200);

    expect(completion.body.sessionCompleted).toBe(true);
    expect(completion.body.progress.totalXp).toBe(20);

    const stats = await request(httpServer)
      .get(`/${prefix}/gamification/students/${studentId}/stats`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(stats.body.textsProcessed).toBe(1);
    expect(stats.body.sessionsCompleted).toBe(1);
    expect(stats.body.progress.totalXp).toBe(20);
    expect(stats.body.badges.length).toBeGreaterThan(0);
    expect(stats.body.focus.focusDays).toBe(1);
    expect(stats.body.rewards.totalClaims).toBe(2);
  });

  it('supports all three accessible login methods', async () => {
    const visual = await request(httpServer)
      .post(`/${prefix}/auth/login/visual`)
      .send({ studentCode, imageSequence: ['star', 'moon', 'leaf'] })
      .expect(200);

    expect(visual.body.accessToken).toEqual(expect.any(String));

    const qrResponse = await request(httpServer)
      .post(`/${prefix}/auth/qr-token`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ rotate: true })
      .expect(200);

    const qrLogin = await request(httpServer)
      .post(`/${prefix}/auth/login/qr`)
      .send({ qrToken: qrResponse.body.qrToken })
      .expect(200);

    expect(qrLogin.body.accessToken).toEqual(expect.any(String));
    expect(qrLogin.body.student.studentCode).toBe(studentCode);
  });
});
