# LexiLearn - Backend

Servidor backend desarrollado con NestJS, TypeScript, PostgreSQL y TypeORM para la plataforma educativa LexiLearn, contenedorizado con Docker.

---

## Contenedorización con Docker

- **`docker-compose.yml`**: Orquesta los servicios de infraestructura local:
  - **`postgres`**: Base de datos relacional (PostgreSQL 15 Alpine) en el puerto 5432 con volumen persistente (`postgres_data`).
  - **`pgadmin`**: Interfaz web de administración de base de datos (pgAdmin 4) en el puerto 5050.
- **`notas.md`**: Referencia rápida de comandos de Docker Compose para iniciar, detener y monitorear los servicios.

---

## Estructura del Proyecto

### 1. Archivos Raíz de Configuración
- **`.env.example`**: Plantilla de variables de entorno para la conexión a la base de datos PostgreSQL y configuración del servidor.
- **`nest-cli.json`**: Configuración del CLI de NestJS para compilación y generación de recursos.
- **`package.json`**: Especificación de dependencias del framework (`@nestjs/core`, `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`, `passport`) y scripts de ejecución (`build`, `start:dev`, `start:prod`, `test`).
- **`tsconfig.json` / `tsconfig.build.json`**: Configuración del compilador de TypeScript con soporte de decoradores y generación de artefactos en `/dist`.
- **`vitest.config.mts` / `vitest.config.e2e.mts`**: Configuración del entorno de pruebas unitarias y de integración.

---

### 2. Configuración y Variables de Entorno (`src/`)
- **`src/env.model.ts`**: Interfaz de tipado seguro para las variables de entorno (`Env`), garantizando acceso estructurado a través de `ConfigService`.
- **`src/main.ts`**: Inicialización del servidor HTTP con `ValidationPipe` global, CORS habilitado y documentación OpenAPI/Swagger en `/api/docs`.
- **`src/app.module.ts`**: Módulo raíz que carga `ConfigModule` de manera global y configura `TypeOrmModule.forRootAsync` con las credenciales de PostgreSQL.

---

### 3. Módulos de Dominio y Entidades (`src/`)

- **`src/users/`**:
  - `entities/user.entity.ts`: Entidad de usuario con decoradores TypeORM (`@Entity`, `@PrimaryGeneratedColumn`, `@Column`).
  - `users.service.ts`: Lógica de persistencia con `Repository<User>` inyectado mediante `@InjectRepository`.
  - `users.controller.ts`: Rutas para consulta de usuarios protegidas con autenticación y `ParseIntPipe`.
  - `users.module.ts`: Configuración con `TypeOrmModule.forFeature([User])`.

- **`src/students/`**:
  - `entities/student.entity.ts`: Perfil del estudiante disléxico con relación 1:1 con `User` y 1:N con intentos y evaluaciones.
  - `students.service.ts`: Consultas de perfiles, relaciones y diagnósticos mediante `Repository<Student>`.
  - `students.controller.ts`: Endpoints para consulta de estudiantes y métricas.
  - `students.module.ts`: Configuración con `TypeOrmModule.forFeature([Student])`.

- **`src/skills/`**:
  - `entities/skill.entity.ts`: Entidad de habilidades y competencias psicopedagógicas.
  - `skills.service.ts`: Consulta y administración de habilidades con `Repository<Skill>`.
  - `skills.controller.ts`: Endpoints para listado y detalle de habilidades.
  - `skills.module.ts`: Configuración con `TypeOrmModule.forFeature([Skill])`.

- **`src/exercises/`**:
  - `entities/exercise.entity.ts`: Actividades clasificadas por nivel de dificultad asociadas a una habilidad.
  - `exercises.service.ts`: Persistencia y consulta de ejercicios con `Repository<Exercise>`.
  - `exercises.controller.ts`: Endpoints para consulta y registro de ejercicios.
  - `exercises.module.ts`: Configuración con `TypeOrmModule.forFeature([Exercise])`.

- **`src/attempts/`**:
  - `entities/exercise-attempt.entity.ts`: Historial de intentos de ejercicios por alumno.
  - `attempts.service.ts`: Registro del intento evaluando respuesta y tiempo con `Repository<ExerciseAttempt>`.
  - `attempts.controller.ts`: Endpoint `POST /attempts` para recepción de intentos.
  - `attempts.module.ts`: Configuración con `TypeOrmModule.forFeature([ExerciseAttempt, Exercise])`.

- **`src/assessment/`**:
  - `entities/assessment.entity.ts`: Registro de evaluaciones diagnósticas iniciales del estudiante.
  - `assessment.service.ts`: Persistencia y consulta de diagnósticos con `Repository<Assessment>`.
  - `assessment.controller.ts`: Endpoints para registrar y listar evaluaciones.
  - `assessment.module.ts`: Configuración con `TypeOrmModule.forFeature([Assessment])`.

- **`src/auth/`**:
  - `auth.service.ts`: Manejo de inicio de sesión, registro y generación de tokens JWT.
  - `auth.controller.ts`: Endpoints públicos `POST /auth/login` y `POST /auth/register`.
  - `jwt.strategy.ts` / `jwt-auth.guard.ts`: Guardia y estrategia Passport para verificación de tokens Bearer.
  - `auth.module.ts`: Registro de `JwtModule` y `PassportModule`.

---

## Ejecución Local

1. **Iniciar Base de Datos con Docker:**
   ```bash
   docker compose up -d
   ```

2. **Iniciar Backend en Desarrollo:**
   ```bash
   npm run start:dev
   ```

3. **Documentación Swagger:**
   Disponible en `http://localhost:3000/api/docs`.
