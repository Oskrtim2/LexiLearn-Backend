# AGENTS.md — API Lexi Learn

Esta guía es obligatoria para cualquier agente de IA o colaborador que modifique este repositorio. Antes de tocar código, leer `README.md`, este archivo y `.agents/workflow.md`.

## 1. Contexto del proyecto

API REST en NestJS para **Lexi Learn**, una plataforma de aprendizaje asistivo para estudiantes de primaria y secundaria con dislexia, TDAH y Trastorno del Espectro Autista (TEA).

El repositorio contiene únicamente el backend. No hay frontend, aplicación móvil ni panel docente en este proyecto. Los clientes consumen la API de forma independiente.

- Remoto: https://github.com/Oskrtim2/LexiLearn-Backend.git
- Rama estable: `main`
- Prefijo de la API: `/api/v1`
- Documentación interactiva: `/docs`
- Health check: `/api/v1/health`

## 2. Estado técnico actual

| Área | Implementación real |
| --- | --- |
| Framework | NestJS 12 con ESM |
| Lenguaje | TypeScript 6, modo estricto y `noImplicitAny` |
| Base de datos | PostgreSQL 17 |
| ORM | Prisma 6 con migraciones versionadas |
| Autenticación | JWT sin estado, PIN con bcrypt, QR firmado y secuencia visual HMAC |
| OCR | Tesseract.js local o AWS Textract |
| TTS | Amazon Polly o Google Cloud Text-to-Speech |
| Caché TTS | Hash de contenido en PostgreSQL + advisory locks |
| Pruebas | Vitest para unitarias y end-to-end |
| Documentación | Swagger/OpenAPI con `@nestjs/swagger` |
| Contenedores | Dockerfile y Docker Compose con perfiles |

No reemplazar estas decisiones por TypeORM, Jest, otro ORM, otro sistema de autenticación o una arquitectura distinta sin una petición explícita.

## 3. Git (obligatorio)

Antes de cualquier cambio:

```bash
git status --short --branch
git pull --ff-only origin main
```

- Si hay cambios locales sin commitear, no borrarlos ni sobrescribirlos. Preguntar antes de continuar.
- `main` es la rama estable y debe permanecer desplegable.
- Para cambios funcionales (código, esquema, seguridad, tests) crear una rama desde `main`:
  - `feature/<descripcion>`
  - `fix/<descripcion>`
  - `test/<descripcion>`
  - `chore/<descripcion>`
- Los cambios exclusivamente documentales o de instrucciones para agentes pueden ir directamente a `main` cuando el usuario solicite implementarlos.
- No hacer force-push, reset destructivo ni reescribir la historia de `main` sin autorización explícita.
- Preparar solo los archivos intencionales con `git add`.
- Nunca commitear `.env`, credenciales, `node_modules`, `dist`, `coverage`, `.tesseract-cache`, archivos `*.traineddata`, `*.tsbuildinfo` ni logs.
- Usar Conventional Commits, con mensajes claros en español. Ejemplos: `feat: agregar validación de audio`, `fix: corregir bloqueo de PIN`, `docs: actualizar guía de proveedores`.
- No incluir atribuciones a IA en commits, pull requests, comentarios ni archivos. Prohibido `Co-Authored-By` de asistentes, “Generated with…”, “Made with…” o textos equivalentes.
- Las reglas de ramas, commits y pull requests se detallan en [`.agents/workflow.md`](.agents/workflow.md).

## 4. Alcance actual

Implementar únicamente lo solicitado. No agregar de forma no relacionada:

- Redis, colas de mensajes o caché distribuida.
- Almacenamiento S3/GCS para audio.
- Multi-tenancy, panel docente, frontend o aplicación móvil.
- Nuevos proveedores de OCR/TTS sin una tarea concreta.
- Cambios masivos de nombres, rutas o contratos públicos.

El proyecto ya utiliza Prisma, JWT real, migraciones y Docker; no son funcionalidades pendientes ni deben eliminarse. Cualquier propuesta de cambio de arquitectura debe presentarse y aprobarse antes de implementarse.

Los identificadores, nombres de módulos, rutas y mensajes de error existentes están en inglés para mantener los contratos actuales. La documentación está en español. No renombrar ni traducir contratos de la API sin coordinar una migración de clientes.

## 5. Arquitectura y capas

Cada módulo debe mantener esta dirección de dependencias:

```text
Controller → Service → Repository → PostgreSQL (Prisma)
                    ↘ DTOs / validación / Swagger
                    ↘ Providers externos (OCR, TTS)
```

- **Controller:** recibe HTTP, aplica decoradores, autenticación y DTOs. No contiene lógica de negocio ni consultas Prisma.
- **Service:** contiene la lógica del dominio, reglas de accesibilidad, autorización de propiedad y coordinación de proveedores.
- **Repository:** encapsula las consultas Prisma y las operaciones transaccionales.
- **DTOs:** cada payload de entrada debe tener su DTO con `class-validator` y decoradores de Swagger (`@ApiProperty` o `@ApiPropertyOptional`).
- **Entities/modelos:** el modelo de datos vive en `prisma/schema.prisma`; no crear entidades TypeORM paralelas.
- **Providers:** las integraciones externas se implementan detrás de las interfaces existentes y se seleccionan por configuración.
- **Pruebas:** la lógica pura debe quedar en servicios pequeños y testeables.

Módulos actuales y ubicación:

```text
src/modules/
├── auth/                 Inicio de sesión y tokens
├── students/             Perfil, preferencias y aprovisionamiento
├── ocr/                  Ingesta y estructuración de imágenes
├── tts/                  Síntesis, caché y audio firmado
├── reading-assistant/    Sílabas, microoraciones y legibilidad
├── gamification/         Sesiones, recompensas y estadísticas
└── health/               Disponibilidad de la API y PostgreSQL
```

No crear carpetas de módulos nuevas sin registrar el módulo correspondiente en `src/app.module.ts`.

## 6. Configuración y variables de entorno

La configuración real del proyecto está en:

- `src/config/configuration.ts`: esquema Joi y configuración tipada.
- `.env.example`: plantilla pública sin secretos reales.
- `.env`: archivo local ignorado por Git. Nunca debe commitearse.

Al agregar una variable de entorno hay que actualizar, como mínimo:

1. El esquema de validación Joi en `src/config/configuration.ts`.
2. La interfaz y el objeto de configuración.
3. `.env.example`.
4. La tabla de variables de entorno de `README.md`.
5. Las pruebas o mocks que dependan de la nueva configuración.

Leer valores con `ConfigService.getOrThrow(...)` o desde la configuración tipada. No usar valores por defecto inseguros para secretos.

## 7. Contratos de la API y validación

Todas las rutas están bajo `/api/v1`.

| Módulo | Rutas principales | Autenticación |
| --- | --- | --- |
| Health | `GET /health` | Pública |
| Students | `POST /students`, `GET /students/me`, `PATCH /students/me/preferences` | Admin key / estudiante |
| Auth | `POST /auth/login/{pin,qr,visual}`, `POST /auth/qr-token`, `POST /auth/visual-token`, `PATCH /auth/pin` | Pública / estudiante |
| OCR | `POST /ocr/extract` | Estudiante |
| TTS | `POST /tts/synthesize`, `GET /tts/audio/:assetId` | Estudiante / URL firmada |
| Reading | `POST /reading-assistant/process-text` | Estudiante |
| Gamification | `POST /gamification/sessions/start`, `POST /gamification/sessions/heartbeat`, `POST /gamification/rewards/claim`, `GET /gamification/students/:id/stats` | Estudiante |

Reglas:

- No introducir un wrapper `{ message, data }`; los endpoints exitosos devuelven los DTOs documentados o binarios.
- Todos los errores pasan por el filtro global y conservan la estructura `{ statusCode, timestamp, path, error, message[] }`.
- Los mensajes de validación se aplanan desde DTOs anidados.
- Solo las rutas marcadas con `@Public()` omiten JWT.
- Los estudiantes solo pueden acceder a sus propios documentos, progreso y estadísticas.
- No modificar códigos HTTP, nombres de campos, rutas o formatos de respuesta existentes sin una petición explícita de cambio de contrato.
- Toda ruta nueva debe documentarse en Swagger y tener DTOs de entrada/salida.
- No generar tokens de audio, tokens QR o contraseñas en logs.

## 8. Persistencia y Prisma

- El esquema está en `prisma/schema.prisma`.
- Los IDs son UUID y las relaciones relevantes usan borrado en cascada o `SetNull` según corresponda.
- Las migraciones se versionan en `prisma/migrations/`.
- Nunca editar una migración ya aplicada. Crear una nueva migración para cada cambio de esquema.
- Desarrollo: `npm run prisma:migrate:dev`.
- Entornos desplegados: `npm run prisma:migrate` (`prisma migrate deploy`).
- No usar `prisma db push` para reemplazar migraciones en producción.
- El seed (`prisma/seed.ts`) es idempotente y solo para desarrollo/demostración.
- Las consultas deben estar en repositorios, no en controllers.
- Las operaciones de recompensas y caché TTS deben conservar sus transacciones y bloqueos actuales.

## 9. Seguridad y autenticación

- Mantener separados los secretos de JWT de acceso, tokens QR y URLs de audio firmadas.
- No aceptar un token QR o un token de audio como token Bearer, ni viceversa.
- Los PIN se almacenan con bcrypt y nunca se devuelven ni se registran.
- Mantener el bloqueo temporal de cuenta y la limitación de intentos de inicio de sesión.
- El endpoint de aprovisionamiento usa `x-admin-api-key` y nunca debe llamarse desde código de estudiante.
- La clave de administración y todos los secretos viven en `.env` o variables del entorno de despliegue.
- Las URLs de audio son públicas únicamente a través de su firma de corta duración; validar la firma y el `assetId`.
- No desactivar Helmet, CORS, ValidationPipe, el filtro global de excepciones ni los guards sin justificación y aprobación.
- No registrar cuerpos con PIN, tokens, textos de estudiantes o credenciales de proveedores.
- Los errores de proveedores externos se registran internamente y se responden con mensajes seguros para el cliente.

## 10. Invariantes de accesibilidad y dominio

Estas reglas no son cosméticas: forman parte del comportamiento del producto.

- Las preferencias visuales, de audio y sensoriales se guardan por estudiante y deben respetar los rangos de validación actuales.
- Los archivos OCR aceptan únicamente PNG, JPEG o WebP reales, con un límite estricto de 10 MB.
- La respuesta OCR debe conservar offsets de párrafos, oraciones y palabras para el resaltado sincronizado.
- El asistente de lectura no debe perder offsets ni la relación entre texto normalizado, microoraciones y palabras.
- El TTS acepta exactamente una fuente (`texto` o `textChunkId`), limita el tamaño por síntesis y conserva la caché por hash.
- La gamificación es calmada y no punitiva: no eliminar XP, insignias, días de foco acumulados ni sonidos optativos por defectos de diseño.
- Las celebraciones siempre devuelven `soundCue: null` mientras no exista una evaluación de accesibilidad sensorial aprobada.
- El heartbeat no debe permitir inflar la duración de lectura.
- La autorización de documentos y chunks debe verificar que pertenecen al estudiante autenticado.

## 11. Proveedores externos

Las integraciones externas están detrás de interfaces y tokens de inyección:

- OCR: `src/modules/ocr/providers/`.
- TTS: `src/modules/tts/providers/`.
- Selección por configuración: `OCR_PROVIDER` y `TTS_PROVIDER`.

Para agregar un proveedor:

1. Implementar la interfaz existente.
2. Registrarlo en el módulo correspondiente y en la fábrica de selección.
3. Añadir configuración validada y variables a `.env.example`.
4. Actualizar documentación.
5. Escribir pruebas con un adaptador simulado; no depender de servicios cloud en tests.

No llamar SDKs externos directamente desde controllers o servicios de dominio. Tampoco exponer mensajes técnicos de AWS/Google al cliente.

## 12. Pruebas y calidad

Comandos obligatorios antes de cerrar un cambio:

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

- `npm test` ejecuta las pruebas unitarias ubicadas en `src/**/*.spec.ts`.
- `npm run test:e2e` requiere PostgreSQL activo y usa `test/**/*.e2e-spec.ts`.
- Las pruebas E2E sustituyen OCR y TTS por adaptadores deterministas. No usar credenciales reales de AWS o Google en tests.
- No eliminar pruebas existentes para hacer pasar un cambio.
- Agregar pruebas para nuevas reglas de negocio, validaciones, errores y contratos.
- No introducir `any` explícito; el lint lo considera error.
- No bajar la cobertura de comportamiento de los módulos tocados.
- Si se modifica el esquema, probar migraciones y seed en una base limpia.

## 13. Entorno local, Docker y operación

Requisitos: Node.js 22+ (recomendado 24), npm, Docker Desktop y PostgreSQL.

```bash
npm ci
docker compose up -d postgres
npm run prisma:migrate:dev
npm run prisma:seed
npm run start:dev
```

- API local: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- Health: `http://localhost:3000/api/v1/health`
- Stack completo: `docker compose --profile app up -d --build`
- El contenedor de la API ejecuta migraciones antes de arrancar y usa un volumen persistente para la caché de Tesseract.
- La API se ejecuta como usuario no root.
- No incluir secretos en imágenes Docker ni en archivos versionados.
- Para TTS real se necesitan credenciales de AWS Polly o Google Cloud TTS. El OCR local funciona sin nube, aunque la primera ejecución descarga los datos de idioma.

## 14. Limitaciones conocidas

No “corregir” estas limitaciones como parte de una tarea no relacionada:

- La limitación de tasa vive en memoria y es por réplica.
- El audio TTS se almacena en PostgreSQL como `BYTEA`.
- El silabador de inglés es heurístico.
- Tesseract serializa trabajos en un único worker.
- Los contratos y mensajes de error de la API están en inglés.
- La caché TTS compartida requiere PostgreSQL y advisory locks.

Cualquier cambio en estas áreas debe discutirse y planificarse, no introducirse silenciosamente dentro de otra tarea.

## 15. Definición de terminado

Un cambio está terminado cuando:

- Cumple el contrato y las invariantes de accesibilidad.
- Tiene DTOs, validación y Swagger actualizados.
- Incluye pruebas nuevas o actualizadas.
- Pasa formato, typecheck, lint, unitarias, e2e y build.
- No incluye secretos ni artefactos locales.
- Actualiza README, `.env.example` o migraciones si corresponde.
- Revisa autorización, logging y manejo de errores.
- Tiene commits claros y sin atribuciones a IA.
- El estado de Git explica exactamente qué se cambió.

## 16. Referencias

- [`README.md`](README.md)
- [`prisma/schema.prisma`](prisma/schema.prisma)
- [`.agents/workflow.md`](.agents/workflow.md)
- [`src/config/configuration.ts`](src/config/configuration.ts)
- [`test/api.e2e-spec.ts`](test/api.e2e-spec.ts)
