# Lexi Learn API

Production-oriented NestJS REST API for **Lexi Learn**, an assistive learning platform for elementary and high-school students with dyslexia, ADHD, and Autism Spectrum Disorder (ASD).

The API is a modular monolith with accessibility-aware student authentication, OCR ingestion, cached neural text-to-speech, reading adaptation, and deliberately calm gamification. Clients (web/mobile) consume it independently.

---

## Highlights

- Accessible student sign-in using **short PINs**, **signed QR codes**, or **visual icon sequences** — no passwords required.
- Per-student visual and audio accessibility preferences, persisted and validated.
- Scanned page ingestion with **PNG / JPEG / WebP** magic-byte validation, a 10 MB hard limit, local **Tesseract** or **AWS Textract** providers, artifact cleanup, and sentence/word offsets.
- Cached TTS via **Amazon Polly** or **Google Cloud Text-to-Speech**, content-addressed hashes, cross-instance PostgreSQL advisory locks, and short-lived signed MP3 URLs.
- Spanish/English syllabification, clause-aware micro-sentence chunking, estimated reading time, and a readability index.
- Sensory-friendly gamification: micro-XP, calm badges, silent celebrations, cumulative focus days, and non-punitive streaks.
- Strict TypeScript, DTO validation, Swagger/OpenAPI, Helmet, CORS, global rate limiting, and a uniform error envelope.
- PostgreSQL + Prisma migrations, demo seed data, Docker assets, unit tests, and end-to-end tests.

---

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Node.js 24 (Docker), `>=22` supported |
| Framework | NestJS 12 (ESM) |
| Language | TypeScript 6, strict mode, `noImplicitAny` |
| Database | PostgreSQL 17 |
| ORM | Prisma 6 |
| Validation | `class-validator`, `class-transformer` |
| Docs | `@nestjs/swagger` at `/docs` |
| Auth | Stateless JWT + bcrypt PINs + HMAC visual tokens + signed QR JWTs |
| OCR | Tesseract.js (local) / AWS Textract |
| TTS | Amazon Polly Neural / Google Cloud TTS |
| Caching | PostgreSQL content-hash audio cache + advisory locks |
| Security | Helmet, CORS allow-list, per-route throttling, hashed credentials |

---

## Architecture

```text
src/
├── common/
│   ├── auth/                 JWT payload and request identity contracts
│   ├── decorators/           @Public(), @CurrentStudent()
│   ├── dto/                  Shared API error response DTO
│   ├── filters/              Uniform global exception filter
│   ├── guards/               Global JWT guard, educator API-key guard
│   ├── middleware/           Request ID propagation
│   ├── prisma/               Prisma service/module
│   ├── security/             JWT signing, bcrypt/HMAC hashing
│   ├── upload/               Image magic-byte pipe
│   └── validation/           Validation-message flattening
├── config/                   Env schema + typed configuration
└── modules/
    ├── auth/                 PIN, QR, visual login, token rotation
    ├── students/             Profile, provisioning, accessibility settings
    ├── ocr/                  Upload, provider adapters, text structuring
    ├── tts/                  Provider adapters, cache, signed streaming
    ├── reading-assistant/    Syllables, micro-chunks, readability
    ├── gamification/         Sessions, heartbeat, claims, stats
    └── health/               Liveness + database readiness
```

Each feature follows Controller → Service → Repository → Prisma. Pure reading logic is isolated in small testable services. External OCR/TTS integrations are behind provider interfaces and Nest injection tokens, selected by environment configuration.

### Persistence model

`Student`, `StudentProgress`, `ReadingSession`, `RewardClaim`, `StudentBadge`, `OcrDocument`, `OcrTextChunk`, and `TtsAsset`. See [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Quick start

### Prerequisites

- Node.js 22+ (24 recommended)
- npm 10+
- Docker Desktop (for the provided PostgreSQL container)
- Optional cloud credentials for Textract/Polly/Google TTS

### 1. Install and configure

```bash
npm ci
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Generate independent 32-byte secrets for the four signing secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set at minimum:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `QR_TOKEN_SECRET`
- `VISUAL_TOKEN_SECRET`
- `TTS_URL_SIGNING_SECRET`
- `ADMIN_API_KEY` (educator provisioning key; 24+ chars)

### 2. Start PostgreSQL and apply migrations

```bash
docker compose up -d postgres
npm run prisma:migrate:dev
npm run prisma:seed
```

For a non-development environment:

```bash
npm run prisma:migrate
```

### 3. Run the API

```bash
npm run start:dev
# production build:
npm run build && npm run start:prod
```

- API base URL: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

### Demo students (development seed only)

| Student code | PIN | Visual sequence |
| --- | --- | --- |
| `LEX-001` | `4821` | `star → moon → leaf` |
| `LEX-002` | `7350` | `sun → cloud → flower` |

Seeded accounts are for local development. Never run the demo seed in production.

### Docker application profile

```bash
docker compose --profile app up --build
```

This builds the API, starts PostgreSQL, waits for health, applies migrations, and starts the compiled server. It reads `.env`; the compose file overrides `DATABASE_URL` to the internal `postgres` hostname and sets `NODE_ENV=production`.

---

## Environment reference

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |
| `PORT` | `3000` | HTTP port |
| `API_PREFIX` | `api/v1` | Global route prefix |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Absolute base for signed audio URLs |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allow-list; empty disables CORS |
| `TRUST_PROXY` | `false` | Trust one reverse-proxy hop |
| `DOCS_ENABLED` | `true` | Enable Swagger UI |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | — | ≥32-char access-token secret |
| `JWT_ACCESS_TTL_SECONDS` | `43200` | Student access-token lifetime |
| `QR_TOKEN_SECRET` | — | ≥32-char QR signing secret |
| `QR_TOKEN_TTL_SECONDS` | `31536000` | QR lifetime |
| `VISUAL_TOKEN_SECRET` | — | ≥32-char HMAC secret for visual sequences |
| `ADMIN_API_KEY` | — | Educator-only provisioning key |
| `BCRYPT_ROUNDS` | `12` | PIN hashing cost (10–15) |
| `LOGIN_MAX_ATTEMPTS` | `5` | Failed attempts before temporary lock |
| `LOGIN_LOCK_MINUTES` | `15` | Account pause duration |
| `TTS_URL_SIGNING_SECRET` | — | ≥32-char independent audio URL secret |
| `TTS_URL_TTL_SECONDS` | `3600` | Signed audio URL lifetime |
| `THROTTLE_TTL_MS` | `60000` | Global rate-limit window |
| `THROTTLE_LIMIT` | `300` | Global requests per IP per window |
| `OCR_PROVIDER` | `tesseract` | `tesseract` or `textract` |
| `OCR_LANGUAGES` | `eng` | Tesseract language packs, e.g. `eng+spa` |
| `OCR_TEXT_LOCALE` | `en` | `Intl.Segmenter` locale, e.g. `es` |
| `TESSERACT_CACHE_PATH` | `.tesseract-cache` | Writable language-data cache directory |
| `TTS_PROVIDER` | `aws` | `aws` or `google` |
| `AWS_REGION` | `us-east-1` | Polly/Textract region |
| `AWS_POLLY_ENGINE` | `neural` | `neural`, `standard`, `generative`, `long-form` |
| `AWS_POLLY_VOICE_*` | demo voices | Voice mapping for each persona |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Service-account JSON path; ADC is used when empty |
| `GOOGLE_TTS_LANGUAGE_CODE` | `en-US` | Google TTS language |
| `GOOGLE_TTS_VOICE_*` | demo voices | Voice mapping for each persona |

All secrets are validated at startup. The API will not boot with missing or short secrets.

---

## API summary

All routes are under `/api/v1`. Student routes require `Authorization: Bearer <accessToken>` unless specified otherwise.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Database readiness |
| POST | `/students` | `x-admin-api-key` | Provision a student |
| POST | `/auth/login/pin` | Public | Student code + PIN login |
| POST | `/auth/login/qr` | Public | Login with signed QR token |
| POST | `/auth/login/visual` | Public | Login with icon sequence |
| POST | `/auth/qr-token` | Student | Retrieve/rotate a QR token |
| POST | `/auth/visual-token` | Student | Set the visual icon sequence |
| PATCH | `/auth/pin` | Student | Change PIN |
| GET | `/students/me` | Student | Profile + preferences |
| PATCH | `/students/me/preferences` | Student | Update accessibility settings |
| POST | `/ocr/extract` | Student | Upload an image and structure text |
| POST | `/tts/synthesize` | Student | Synthesize or reuse cached speech |
| GET | `/tts/audio/:assetId?token=...` | Signed URL | Stream MP3 with byte-range support |
| POST | `/reading-assistant/process-text` | Student | Syllables, chunks, readability |
| POST | `/gamification/sessions/start` | Student | Start or resume a session |
| POST | `/gamification/sessions/heartbeat` | Student | Record activity |
| POST | `/gamification/rewards/claim` | Student | Idempotently record a completed task |
| GET | `/gamification/students/:id/stats` | Student (self) | Aggregate progress |

Interactive schemas and examples are available at `/docs`.

### Accessible authentication

Student codes are normalized to uppercase. PINs are 4–6 digits and hashed with bcrypt; they are never returned. Failed logins are tracked per student and temporarily lock the account after the configured threshold. Login attempts are also rate-limited per IP.

Provisioning requires the educator API key:

```bash
curl -X POST http://localhost:3000/api/v1/students \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: $ADMIN_API_KEY" \
  -d '{
    "studentCode": "LEX-001",
    "displayName": "Sam",
    "gradeLevel": 4,
    "classroomCode": "CLASS-4A",
    "pin": "4821",
    "visualSequence": ["star", "moon", "leaf"]
  }'
```

The response includes a long-lived signed `qrToken`. Clients may render it as a QR code. Passing `{"rotate": true}` to `POST /auth/qr-token` invalidates every previously issued QR token for that student.

A visual sequence is stored as an HMAC digest (scoped by student code), not as plain icons. Visual sign-in is intentionally complemented by rate limiting and account locks.

### Accessibility preferences

`PATCH /students/me/preferences` accepts any subset of:

| Group | Field | Allowed values |
| --- | --- | --- |
| Visual | `preferredFont` | `OPEN_DYSLEXIC`, `ATKINSON_HYPERLEGIBLE`, `VERDANA`, `ARIAL`, `COMIC_SANS` |
| Visual | `letterSpacing` | `0`–`0.3` |
| Visual | `lineHeight` | `1`–`3` |
| Visual | `contrastMode` | `LIGHT`, `DARK`, `PASTEL`, `HIGH_CONTRAST` |
| Visual | `lineFocusWindowSize` | `1`–`10` lines |
| Audio | `ttsVoicePersona` | `CHILD_FRIENDLY`, `CALM_NARRATOR`, `NEURAL_FRIENDLY` |
| Audio | `speechRate` | `0.75`–`1.25` |
| Audio | `speechPitch` | `0.75`–`1.5` |
| Audio | `highlightPacing` | `SLOW`, `BALANCED`, `FAST` |
| Sensory | `reduceMotion` | boolean |
| Sensory | `soundEffects` | boolean (default `false`) |

### OCR ingestion

```bash
curl -X POST http://localhost:3000/api/v1/ocr/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@page.png;type=image/png"
```

The server:

1. Enforces multipart limits and rejects files **≥ 10 MB**.
2. Verifies actual PNG/JPEG/WebP magic bytes instead of trusting the client MIME type.
3. Sends the buffer to the configured provider.
4. Removes control characters, repeated running headers/footers, page labels, isolated page numbers, symbol-only noise, and hyphenated line wraps.
5. Segments paragraphs → sentences → words with global character offsets.
6. Persists the document and each sentence as a `chunkId` usable by TTS.

The image itself is not persisted. Raw OCR output and normalized text are retained in PostgreSQL.

### Text-to-speech

```bash
curl -X POST http://localhost:3000/api/v1/tts/synthesize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "textChunkId": "e7aca05d-6d8b-4017-9d1b-6205248c8ba8",
    "voice": { "speed": 1, "pitch": 1 }
  }'
```

Or supply raw `text` instead of `textChunkId` (exactly one is required). TTS caps a single synthesis at 5,000 characters.

Response:

```json
{
  "assetId": "8d1c...",
  "textChunkId": "e7aca05d-...",
  "text": "Reading is a calm journey.",
  "provider": "aws-polly",
  "voiceId": "Joanna",
  "speed": 1,
  "pitch": 1,
  "mimeType": "audio/mpeg",
  "signedUrl": "http://localhost:3000/api/v1/tts/audio/8d1c...?token=...",
  "expiresAt": "2026-11-05T15:11:00.000Z",
  "cached": true,
  "characterCount": 24,
  "durationMs": null
}
```

Cache behavior:

- The cache key is SHA-256 over normalized text + provider + voice ID + speed + pitch.
- Cache hits are served without invoking the provider.
- Concurrent misses are serialized with a PostgreSQL transaction-scoped advisory lock and re-checked, preventing duplicate billing across API replicas sharing the database.
- Audio is stored as `BYTEA`; replace this with object storage (S3/GCS) and a CDN for very high volume. Maintain a retention policy using `lastAccessedAt`.
- Signed URLs are independent of the bearer token and can be used directly by `<audio>`. HTTP byte ranges are supported (`206 Partial Content`).

### Reading assistant

```bash
curl -X POST http://localhost:3000/api/v1/reading-assistant/process-text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cuando la lectura se siente grande, podemos dividirla en partes pequeñas.",
    "language": "es",
    "options": { "maxWordsPerChunk": 10, "wordsPerMinute": 140 }
  }'
```

The response includes:

- `text` — normalized text; every offset refers to this string.
- `words[]` — global word index, start/end offsets, and syllable breakdown with offsets.
- `sentences[]` — sentence metadata plus `microChunks[]` split at clauses/conjunctions for ADHD-friendly pacing.
- `readingTime` — accessible WPM estimate adjusted for syllable density.
- `difficulty` — Flesch Reading Ease (Spanish Huerta variant or English Flesch), a `0–100` inverted score, and a friendly level.

Spanish syllabification handles diphthongs, hiatuses, accented weak vowels, digraphs (`ch`, `ll`, `rr`), and inseparable onsets. English support is a documented heuristic; for high-stakes English phonological work, add a dictionary/pattern provider behind the same service boundary.

### Gamification

| Task | XP |
| --- | ---: |
| `SENTENCE_COMPLETED` | 5 |
| `FOCUS_MILESTONE` | 10 |
| `SESSION_COMPLETED` | 15 |
| `PAGE_COMPLETED` | 20 |

Key semantics:

- Claims are idempotent by `(studentId, taskId)`. Repeating a claim returns `xpAwarded: 0` and `alreadyClaimed: true`.
- Only one active reading session is kept per student. Recent matching sessions resume; stale or different-document sessions are quietly marked abandoned and a new one starts.
- Heartbeat duration is capped by wall-clock time plus a small grace budget, so a client cannot inflate minutes.
- Missing a day never removes XP, badges, or cumulative focus days. `currentStreak` starts a new gentle count, while `bestStreak` and `focusDays` are preserved.
- Celebration payloads use `animation: "soft-glow"` and **always** return `soundCue: null`; no aggressive audio or jarring motion instructions are emitted.
- `SESSION_COMPLETED` with a `sessionId` marks the session complete and updates aggregated stats.

Badges include First gentle step, Sentence explorer, Page wanderer, Focus spark, Steady reader, and Calm finisher. They are descriptive, permanent, and never penalize a child.

---

## Uniform error format

Every error returns the same JSON shape, including validation, authorization, throttling, Prisma, and unknown errors:

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-05T14:11:00.000Z",
  "path": "/api/v1/ocr/extract",
  "error": "Bad Request",
  "message": ["image must be a valid image file buffer"]
}
```

Validation messages are flattened from nested DTOs. Query strings are excluded from `path` so signed audio tokens are never echoed into errors. Request IDs are returned in the `X-Request-Id` response header.

---

## Security and accessibility engineering

- **Stateless JWT** access tokens with issuer/audience checks and separate secrets for access, QR, and signed audio URLs.
- **bcrypt PIN hashing** plus constant-time dummy comparisons for unknown student codes.
- **Account lockout** and per-IP, per-route throttling. The default global limit is 300 requests/min/IP; adjust `THROTTLE_LIMIT` for shared classroom NAT, or replace the in-memory throttler storage with Redis for multi-replica deployments.
- **Helmet** headers, CORS allow-list, JSON body limits, request IDs, and graceful shutdown.
- **Upload hardening**: 10 MB multipart cap, magic-byte verification, no path writes, and a custom validation pipe.
- **CSP is intentionally disabled** because the service returns JSON and hosts Swagger UI. Add a strict CSP at the edge if you expose more browser-rendered content.
- **Accessibility defaults**: OpenDyslexic, 1.6 line height, reduced motion, sound effects off, child-friendly voice, 1× speed.
- **No punitive gamification**: no XP loss, no badge revocation, no loud celebration payloads, and cumulative focus days.
- **Privacy**: images are not persisted; OCR text and audio are persisted. Delete student records through the database/administrative process to cascade their content. TTS audio is content-addressed and not linked to a student.

### Horizontal scaling notes

The TTS cache is safe across replicas because it uses PostgreSQL uniqueness and advisory locks. Rate limiting is in-memory per replica by default; replace `ThrottlerStorage` with a Redis implementation when scaling horizontally. Signed URLs work across replicas because every instance shares `TTS_URL_SIGNING_SECRET`.

---

## Development commands

```bash
npm run start:dev        # watch mode
npm run build            # compile to dist/
npm run start:prod       # run compiled API
npm run typecheck        # strict TypeScript, no emit
npm run lint             # Oxlint type-aware (explicit any is an error)
npm run test             # unit tests
npm run test:cov         # coverage
npm run test:e2e         # PostgreSQL-backed end-to-end tests
npm run format           # Prettier
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate
npm run prisma:seed
```

E2E tests require a migrated PostgreSQL database and a valid `.env`. They provision a temporary student, override OCR/TTS with deterministic test providers, exercise the HTTP surface, and clean up their data.

Current verification status on this workspace:

- `npm run typecheck` — passing
- `npm run lint` — passing
- `npm run test` — 19 unit tests passing
- `npm run test:e2e` — 8 endpoint tests passing
- `npm run build` — passing

---

## Operational notes and extension points

- **OCR**: local Tesseract jobs are serialized behind one worker to avoid CPU thrash. Use `OCR_PROVIDER=textract` or a dedicated OCR worker pool for parallel volume. Tesseract language data is downloaded on first use.
- **TTS provider setup**: configure AWS credentials through the environment/IAM role, or set `GOOGLE_APPLICATION_CREDENTIALS`; Google ADC is also supported. Both providers produce `audio/mpeg`.
- **Database**: run `prisma migrate deploy` before each release. The seed is idempotent but intended for development.
- **Observability**: request IDs are emitted, but production tracing/metrics/error aggregation should be attached at the deployment platform or via an OpenTelemetry agent.
- **Retention**: configure cleanup for `TtsAsset` based on `lastAccessedAt`, and define an OCR text retention policy for minors' data.
- **Future providers**: implement `OcrProvider` or `TtsProvider`, register it in the module factory, and select it with the existing environment variables. No controller/service changes are required.

---

## License

UNLICENSED — proprietary project configuration. Add the project’s actual license before distribution.
