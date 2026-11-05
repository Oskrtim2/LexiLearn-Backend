# API de Lexi Learn

API REST de NestJS orientada a producción para **Lexi Learn**, una plataforma de aprendizaje asistivo para estudiantes de primaria y secundaria con dislexia, TDAH y Trastorno del Espectro Autista (TEA).

La API es un monolito modular con autenticación de estudiantes adaptada a la accesibilidad, ingesta OCR, texto a voz neuronal en caché, adaptación de la lectura y una gamificación deliberadamente calmada. Los clientes (web/móvil) la consumen de forma independiente.

---

## Características destacadas

- Inicio de sesión accesible para estudiantes mediante **PIN cortos**, **códigos QR firmados** o **secuencias visuales de iconos**; no se requieren contraseñas.
- Preferencias visuales y de audio por estudiante, persistidas y validadas.
- Ingesta de páginas escaneadas con validación de **bytes mágicos PNG / JPEG / WebP**, límite estricto de 10 MB, proveedores locales **Tesseract** o **AWS Textract**, limpieza de artefactos y offsets de oraciones y palabras.
- TTS en caché mediante **Amazon Polly** o **Google Cloud Text-to-Speech**, hashes direccionados por contenido, advisory locks de PostgreSQL entre instancias y URLs firmadas de MP3 de corta duración.
- Silabación en español e inglés, división de microoraciones consciente de cláusulas, tiempo de lectura estimado e índice de legibilidad.
- Gamificación amigable para los sentidos: micro-XP, insignias suaves, celebraciones silenciosas, días de concentración acumulados y rachas no punitivas.
- TypeScript estricto, validación de DTOs, Swagger/OpenAPI, Helmet, CORS, limitación de tasa global y un sobre de error uniforme.
- Migraciones de PostgreSQL + Prisma, datos de demostración, recursos Docker, pruebas unitarias y pruebas end-to-end.

---

## Stack tecnológico

| Aspecto | Elección |
| --- | --- |
| Entorno de ejecución | Node.js 24 (Docker), compatible con `>=22` |
| Framework | NestJS 12 (ESM) |
| Lenguaje | TypeScript 6, modo estricto, `noImplicitAny` |
| Base de datos | PostgreSQL 17 |
| ORM | Prisma 6 |
| Validación | `class-validator`, `class-transformer` |
| Documentación | `@nestjs/swagger` en `/docs` |
| Autenticación | JWT sin estado + PINs con bcrypt + tokens visuales HMAC + QR JWT firmados |
| OCR | Tesseract.js (local) / AWS Textract |
| TTS | Amazon Polly Neural / Google Cloud TTS |
| Caché | Caché de audio por hash de contenido en PostgreSQL + advisory locks |
| Seguridad | Helmet, lista permitida de CORS, throttling por ruta, credenciales hasheadas |

---

## Arquitectura

```text
src/
├── common/
│   ├── auth/                 Contratos de payload JWT e identidad de la petición
│   ├── decorators/           @Public(), @CurrentStudent()
│   ├── dto/                  DTO compartido para respuestas de error de la API
│   ├── filters/              Filtro global uniforme de excepciones
│   ├── guards/               Guard JWT global, guard de API key para educadores
│   ├── middleware/           Propagación del ID de petición
│   ├── prisma/               Servicio/módulo de Prisma
│   ├── security/             Firma JWT, hashing bcrypt/HMAC
│   ├── upload/               Pipe de bytes mágicos de imágenes
│   └── validation/           Aplanado de mensajes de validación
├── config/                   Esquema de entorno + configuración tipada
└── modules/
    ├── auth/                 PIN, QR, login visual, rotación de tokens
    ├── students/             Perfil, aprovisionamiento, ajustes de accesibilidad
    ├── ocr/                  Subida, adaptadores de proveedor, estructuración de texto
    ├── tts/                  Adaptadores de proveedor, caché, streaming firmado
    ├── reading-assistant/    Sílabas, microchunks, legibilidad
    ├── gamification/         Sesiones, heartbeat, recompensas, estadísticas
    └── health/               Liveness + disponibilidad de la base de datos
```

Cada funcionalidad sigue Controlador → Servicio → Repositorio → Prisma. La lógica pura de lectura está aislada en servicios pequeños y testeables. Las integraciones externas de OCR/TTS están detrás de interfaces de proveedor y tokens de inyección de Nest, seleccionados mediante configuración de entorno.

### Modelo de persistencia

`Student`, `StudentProgress`, `ReadingSession`, `RewardClaim`, `StudentBadge`, `OcrDocument`, `OcrTextChunk` y `TtsAsset`. Consulta [`prisma/schema.prisma`](prisma/schema.prisma).

---

## Inicio rápido

### Requisitos previos

- Node.js 22+ (se recomienda 24)
- npm 10+
- Docker Desktop (para el contenedor PostgreSQL incluido)
- Credenciales en la nube opcionales para Textract/Polly/Google TTS

### 1. Instalar y configurar

```bash
npm ci
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Genera secretos independientes de 32 bytes para los cuatro secretos de firma:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configura como mínimo:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `QR_TOKEN_SECRET`
- `VISUAL_TOKEN_SECRET`
- `TTS_URL_SIGNING_SECRET`
- `ADMIN_API_KEY` (clave de aprovisionamiento para educadores; 24+ caracteres)

### 2. Iniciar PostgreSQL y aplicar migraciones

```bash
docker compose up -d postgres
npm run prisma:migrate:dev
npm run prisma:seed
```

Para un entorno que no sea de desarrollo:

```bash
npm run prisma:migrate
```

### 3. Ejecutar la API

```bash
npm run start:dev
# compilación de producción:
npm run build && npm run start:prod
```

- URL base de la API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`

### Estudiantes de demostración (solo seed de desarrollo)

| Código de estudiante | PIN | Secuencia visual |
| --- | --- | --- |
| `LEX-001` | `4821` | `star → moon → leaf` |
| `LEX-002` | `7350` | `sun → cloud → flower` |

Las cuentas del seed son para desarrollo local. Nunca ejecutes el seed de demostración en producción.

### Perfil de aplicación con Docker

```bash
docker compose --profile app up --build
```

Esto compila la API, inicia PostgreSQL, espera el health check, aplica migraciones e inicia el servidor compilado. Lee `.env`; el archivo compose sobrescribe `DATABASE_URL` con el hostname interno `postgres` y establece `NODE_ENV=production`.

---

## Referencia de variables de entorno

| Variable | Valor por defecto | Propósito |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `PORT` | `3000` | Puerto HTTP |
| `API_PREFIX` | `api/v1` | Prefijo global de rutas |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Base absoluta para URLs de audio firmadas |
| `CORS_ORIGINS` | `http://localhost:5173` | Lista permitida separada por comas; vacía desactiva CORS |
| `TRUST_PROXY` | `false` | Confiar en un salto de proxy inverso |
| `DOCS_ENABLED` | `true` | Habilitar Swagger UI |
| `DATABASE_URL` | — | Cadena de conexión de PostgreSQL |
| `JWT_ACCESS_SECRET` | — | Secreto de 32+ caracteres para tokens de acceso |
| `JWT_ACCESS_TTL_SECONDS` | `43200` | Duración del token de acceso del estudiante |
| `QR_TOKEN_SECRET` | — | Secreto de 32+ caracteres para firma QR |
| `QR_TOKEN_TTL_SECONDS` | `31536000` | Duración del QR |
| `VISUAL_TOKEN_SECRET` | — | Secreto HMAC de 32+ caracteres para secuencias visuales |
| `ADMIN_API_KEY` | — | Clave exclusiva para aprovisionamiento por educadores |
| `BCRYPT_ROUNDS` | `12` | Coste del hashing de PIN (10–15) |
| `LOGIN_MAX_ATTEMPTS` | `5` | Intentos fallidos antes del bloqueo temporal |
| `LOGIN_LOCK_MINUTES` | `15` | Duración de la pausa de la cuenta |
| `TTS_URL_SIGNING_SECRET` | — | Secreto independiente de 32+ caracteres para URLs de audio |
| `TTS_URL_TTL_SECONDS` | `3600` | Duración de la URL de audio firmada |
| `THROTTLE_TTL_MS` | `60000` | Ventana global de limitación de tasa |
| `THROTTLE_LIMIT` | `300` | Solicitudes globales por IP por ventana |
| `OCR_PROVIDER` | `tesseract` | `tesseract` o `textract` |
| `OCR_LANGUAGES` | `eng` | Paquetes de idioma de Tesseract, por ejemplo `eng+spa` |
| `OCR_TEXT_LOCALE` | `en` | Configuración regional de `Intl.Segmenter`, por ejemplo `es` |
| `TESSERACT_CACHE_PATH` | `.tesseract-cache` | Directorio de caché de datos de idioma con permisos de escritura |
| `TTS_PROVIDER` | `aws` | `aws` o `google` |
| `AWS_REGION` | `us-east-1` | Región de Polly/Textract |
| `AWS_POLLY_ENGINE` | `neural` | `neural`, `standard`, `generative`, `long-form` |
| `AWS_POLLY_VOICE_*` | voces demo | Asignación de voz para cada persona |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Ruta al JSON de la cuenta de servicio; se usa ADC cuando está vacía |
| `GOOGLE_TTS_LANGUAGE_CODE` | `en-US` | Idioma de Google TTS |
| `GOOGLE_TTS_VOICE_*` | voces demo | Asignación de voz para cada persona |

Todos los secretos se validan al iniciar. La API no arrancará si faltan secretos o son demasiado cortos.

---

## Resumen de la API

Todas las rutas están bajo `/api/v1`. Las rutas de estudiantes requieren `Authorization: Bearer <accessToken>` salvo que se indique lo contrario.

| Método | Ruta | Autenticación | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | Público | Disponibilidad de la base de datos |
| POST | `/students` | `x-admin-api-key` | Aprovisionar un estudiante |
| POST | `/auth/login/pin` | Público | Inicio de sesión con código de estudiante + PIN |
| POST | `/auth/login/qr` | Público | Inicio de sesión con token QR firmado |
| POST | `/auth/login/visual` | Público | Inicio de sesión con secuencia de iconos |
| POST | `/auth/qr-token` | Estudiante | Obtener/rotar un token QR |
| POST | `/auth/visual-token` | Estudiante | Configurar la secuencia visual de iconos |
| PATCH | `/auth/pin` | Estudiante | Cambiar el PIN |
| GET | `/students/me` | Estudiante | Perfil + preferencias |
| PATCH | `/students/me/preferences` | Estudiante | Actualizar ajustes de accesibilidad |
| POST | `/ocr/extract` | Estudiante | Subir una imagen y estructurar el texto |
| POST | `/tts/synthesize` | Estudiante | Sintetizar o reutilizar voz en caché |
| GET | `/tts/audio/:assetId?token=...` | URL firmada | Transmitir MP3 con soporte de rangos de bytes |
| POST | `/reading-assistant/process-text` | Estudiante | Sílabas, chunks, legibilidad |
| POST | `/gamification/sessions/start` | Estudiante | Iniciar o reanudar una sesión |
| POST | `/gamification/sessions/heartbeat` | Estudiante | Registrar actividad |
| POST | `/gamification/rewards/claim` | Estudiante | Registrar una tarea completada de forma idempotente |
| GET | `/gamification/students/:id/stats` | Estudiante (propio) | Progreso agregado |

Los esquemas interactivos y ejemplos están disponibles en `/docs`.

### Autenticación accesible

Los códigos de estudiante se normalizan a mayúsculas. Los PIN tienen entre 4 y 6 dígitos y se hashean con bcrypt; nunca se devuelven. Los inicios de sesión fallidos se registran por estudiante y bloquean temporalmente la cuenta después del umbral configurado. Los intentos de inicio de sesión también están limitados por IP.

El aprovisionamiento requiere la clave de API del educador:

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

La respuesta incluye un `qrToken` firmado de larga duración. Los clientes pueden renderizarlo como un código QR. Enviar `{"rotate": true}` a `POST /auth/qr-token` invalida todos los tokens QR emitidos previamente para ese estudiante.

Una secuencia visual se almacena como un digest HMAC (delimitado por el código del estudiante), no como iconos en texto plano. El inicio de sesión visual se complementa intencionalmente con limitación de tasa y bloqueos de cuenta.

### Preferencias de accesibilidad

`PATCH /students/me/preferences` acepta cualquier subconjunto de:

| Grupo | Campo | Valores permitidos |
| --- | --- | --- |
| Visual | `preferredFont` | `OPEN_DYSLEXIC`, `ATKINSON_HYPERLEGIBLE`, `VERDANA`, `ARIAL`, `COMIC_SANS` |
| Visual | `letterSpacing` | `0`–`0.3` |
| Visual | `lineHeight` | `1`–`3` |
| Visual | `contrastMode` | `LIGHT`, `DARK`, `PASTEL`, `HIGH_CONTRAST` |
| Visual | `lineFocusWindowSize` | `1`–`10` líneas |
| Audio | `ttsVoicePersona` | `CHILD_FRIENDLY`, `CALM_NARRATOR`, `NEURAL_FRIENDLY` |
| Audio | `speechRate` | `0.75`–`1.25` |
| Audio | `speechPitch` | `0.75`–`1.5` |
| Audio | `highlightPacing` | `SLOW`, `BALANCED`, `FAST` |
| Sensorial | `reduceMotion` | booleano |
| Sensorial | `soundEffects` | booleano (por defecto `false`) |

### Ingesta OCR

```bash
curl -X POST http://localhost:3000/api/v1/ocr/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@page.png;type=image/png"
```

El servidor:

1. Aplica límites multipart y rechaza archivos **≥ 10 MB**.
2. Verifica los bytes mágicos reales de PNG/JPEG/WebP en lugar de confiar en el MIME del cliente.
3. Envía el buffer al proveedor configurado.
4. Elimina caracteres de control, encabezados/pies de página repetidos, etiquetas de página, números de página aislados, ruido de solo símbolos y saltos de línea con guiones.
5. Segmenta párrafos → oraciones → palabras con offsets globales de caracteres.
6. Persiste el documento y cada oración como un `chunkId` utilizable por TTS.

La imagen no se persiste. La salida OCR cruda y el texto normalizado se conservan en PostgreSQL.

### Texto a voz

```bash
curl -X POST http://localhost:3000/api/v1/tts/synthesize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "textChunkId": "e7aca05d-6d8b-4017-9d1b-6205248c8ba8",
    "voice": { "speed": 1, "pitch": 1 }
  }'
```

También puedes enviar `text` en crudo en lugar de `textChunkId` (se requiere exactamente uno). TTS limita una síntesis individual a 5000 caracteres.

Respuesta:

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

Comportamiento de la caché:

- La clave de caché es SHA-256 sobre el texto normalizado + proveedor + ID de voz + velocidad + tono.
- Los aciertos de caché se sirven sin invocar al proveedor.
- Los fallos concurrentes se serializan con un advisory lock transaccional de PostgreSQL y se vuelven a comprobar, evitando la doble facturación entre réplicas de la API que comparten la base de datos.
- El audio se guarda como `BYTEA`; para volúmenes muy altos, reemplázalo por almacenamiento de objetos (S3/GCS) y un CDN. Mantén una política de retención usando `lastAccessedAt`.
- Las URLs firmadas son independientes del token bearer y pueden usarse directamente en `<audio>`. Se admiten rangos de bytes HTTP (`206 Partial Content`).

### Asistente de lectura

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

La respuesta incluye:

- `text` — texto normalizado; todos los offsets se refieren a esta cadena.
- `words[]` — índice global de palabra, offsets de inicio/fin y desglose silábico con offsets.
- `sentences[]` — metadatos de oración más `microChunks[]` divididos en cláusulas/conjunciones para un ritmo amigable con el TDAH.
- `readingTime` — estimación accesible de palabras por minuto ajustada por densidad silábica.
- `difficulty` — Flesch Reading Ease (variante Huerta para español o Flesch para inglés), una puntuación invertida de `0–100` y un nivel amigable.

La silabación en español maneja diptongos, hiatos, vocales débiles acentuadas, dígrafos (`ch`, `ll`, `rr`) y ataques inseparables. El soporte de inglés es una heurística documentada; para trabajo fonológico de inglés de alta exigencia, añade un proveedor de diccionario/patrones detrás del mismo límite de servicio.

### Gamificación

| Tarea | XP |
| --- | ---: |
| `SENTENCE_COMPLETED` | 5 |
| `FOCUS_MILESTONE` | 10 |
| `SESSION_COMPLETED` | 15 |
| `PAGE_COMPLETED` | 20 |

Semántica clave:

- Las reclamaciones son idempotentes por `(studentId, taskId)`. Repetir una reclamación devuelve `xpAwarded: 0` y `alreadyClaimed: true`.
- Solo se mantiene una sesión de lectura activa por estudiante. Las sesiones recientes que coinciden se reanudan; las sesiones obsoletas o con otro documento se marcan silenciosamente como abandonadas y se inicia una nueva.
- La duración del heartbeat está limitada por el tiempo de reloj más un pequeño margen, así que el cliente no puede inflar los minutos.
- Faltar un día nunca elimina XP, insignias ni días de concentración acumulados. `currentStreak` comienza una nueva cuenta suave, mientras que `bestStreak` y `focusDays` se conservan.
- Los payloads de celebración usan `animation: "soft-glow"` y **siempre** devuelven `soundCue: null`; no se emiten audios agresivos ni instrucciones de movimiento bruscas.
- `SESSION_COMPLETED` con un `sessionId` marca la sesión como completada y actualiza las estadísticas agregadas.

Las insignias incluyen First gentle step, Sentence explorer, Page wanderer, Focus spark, Steady reader y Calm finisher. Son descriptivas, permanentes y nunca penalizan al estudiante.

---

## Formato uniforme de errores

Cada error devuelve la misma estructura JSON, incluidos errores de validación, autorización, throttling, Prisma y desconocidos:

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-05T14:11:00.000Z",
  "path": "/api/v1/ocr/extract",
  "error": "Bad Request",
  "message": ["image must be a valid image file buffer"]
}
```

Los mensajes de validación se aplanan desde DTOs anidados. Las cadenas de consulta se excluyen de `path` para que los tokens de audio firmados nunca se reflejen en los errores. Los IDs de petición se devuelven en la cabecera de respuesta `X-Request-Id`.

---

## Ingeniería de seguridad y accesibilidad

- **Tokens de acceso JWT sin estado** con verificación de emisor/audiencia y secretos separados para acceso, QR y URLs de audio firmadas.
- **Hash de PIN con bcrypt** y comparaciones ficticias de tiempo constante para códigos de estudiante desconocidos.
- **Bloqueo de cuenta** y limitación de tasa por IP y por ruta. El límite global por defecto es de 300 solicitudes/min/IP; ajusta `THROTTLE_LIMIT` para NAT compartido en aulas o reemplaza el almacenamiento en memoria del throttler por Redis para despliegues con múltiples réplicas.
- **Cabeceras de Helmet**, lista permitida de CORS, límites del cuerpo JSON, IDs de petición y cierre ordenado.
- **Endurecimiento de subidas**: límite multipart de 10 MB, verificación de bytes mágicos, sin escrituras de rutas y un pipe de validación personalizado.
- **CSP se desactiva intencionalmente** porque el servicio devuelve JSON y aloja Swagger UI. Añade una CSP estricta en el borde si expones más contenido renderizado en navegador.
- **Valores por defecto de accesibilidad**: OpenDyslexic, altura de línea 1.6, movimiento reducido, efectos de sonido desactivados, voz amigable para estudiantes, velocidad 1×.
- **Gamificación no punitiva**: sin pérdida de XP, sin revocación de insignias, sin payloads de celebración ruidosos y días de concentración acumulados.
- **Privacidad**: las imágenes no se persisten; el texto OCR y el audio sí. Elimina los registros de estudiantes mediante la base de datos o un proceso administrativo para eliminar en cascada su contenido. El audio TTS está direccionado por contenido y no vinculado a un estudiante.

### Notas de escalado horizontal

La caché TTS es segura entre réplicas porque usa unicidad y advisory locks de PostgreSQL. La limitación de tasa es en memoria por réplica por defecto; reemplaza `ThrottlerStorage` por una implementación Redis al escalar horizontalmente. Las URLs firmadas funcionan entre réplicas porque todas comparten `TTS_URL_SIGNING_SECRET`.

---

## Comandos de desarrollo

```bash
npm run start:dev        # modo watch
npm run build            # compilar a dist/
npm run start:prod       # ejecutar la API compilada
npm run typecheck        # TypeScript estricto, sin emitir
npm run lint             # Oxlint con tipos (any explícito es un error)
npm run test             # pruebas unitarias
npm run test:cov         # cobertura
npm run test:e2e         # pruebas end-to-end con PostgreSQL
npm run format           # Prettier
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate
npm run prisma:seed
```

Las pruebas E2E requieren una base de datos PostgreSQL migrada y un `.env` válido. Crean un estudiante temporal, sustituyen OCR/TTS por proveedores deterministas de prueba, ejercitan la superficie HTTP y limpian sus datos.

Estado de verificación actual en este workspace:

- `npm run typecheck` — pasando
- `npm run lint` — pasando
- `npm run test` — 19 pruebas unitarias pasando
- `npm run test:e2e` — 8 pruebas de endpoints pasando
- `npm run build` — pasando

---

## Notas operativas y puntos de extensión

- **OCR**: los trabajos locales de Tesseract se serializan detrás de un único worker para evitar un uso excesivo de CPU. Usa `OCR_PROVIDER=textract` o un pool dedicado de workers OCR para volumen paralelo. Los datos de idioma de Tesseract se descargan en el primer uso.
- **Configuración del proveedor TTS**: configura credenciales de AWS mediante el entorno o un rol IAM, o establece `GOOGLE_APPLICATION_CREDENTIALS`; también se admite Google ADC. Ambos proveedores producen `audio/mpeg`.
- **Base de datos**: ejecuta `prisma migrate deploy` antes de cada despliegue. El seed es idempotente pero está pensado para desarrollo.
- **Observabilidad**: se emiten IDs de petición, pero el trazado, las métricas y la agregación de errores de producción deben añadirse en la plataforma de despliegue o mediante un agente de OpenTelemetry.
- **Retención**: configura la limpieza de `TtsAsset` según `lastAccessedAt` y define una política de retención del texto OCR para datos de menores.
- **Proveedores futuros**: implementa `OcrProvider` o `TtsProvider`, regístralo en la fábrica del módulo y selecciónalo con las variables de entorno existentes. No se requieren cambios en controladores ni servicios.

---

## Licencia

UNLICENSED — configuración propietaria del proyecto. Añade la licencia real del proyecto antes de distribuirlo.
