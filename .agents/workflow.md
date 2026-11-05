# Flujo de trabajo — API Lexi Learn

Este documento complementa [`AGENTS.md`](../AGENTS.md) y define el proceso de ramas, commits, pull requests y verificación para este repositorio.

## 1. Ramas

- `main` es la rama estable y desplegable.
- Partir siempre de `main` actualizado.
- Usar nombres descriptivos:
  - `feature/<descripcion>` para funcionalidad.
  - `fix/<descripcion>` para correcciones.
  - `test/<descripcion>` para cobertura y pruebas.
  - `chore/<descripcion>` para mantenimiento, tooling o dependencias.
  - `docs/<descripcion>` para documentación.
- Los cambios exclusivamente documentales o de instrucciones para agentes pueden aplicarse en `main` cuando el usuario lo solicite explícitamente.
- No trabajar directamente en `main` para cambios de código, seguridad, esquema o pruebas.
- Nunca reescribir una rama compartida ni hacer force-push sin autorización explícita.

## 2. Sincronización antes de trabajar

```bash
git status --short --branch
git pull --ff-only origin main
```

Si hay cambios locales:

1. No borrarlos.
2. Identificar si pertenecen al usuario.
3. Preguntar antes de commitear, mover o descartar.
4. Resolver conflictos antes de iniciar el cambio solicitado.

## 3. Commits

Formato:

```text
<tipo>(<alcance opcional>): <descripcion corta en imperativo>
```

Tipos permitidos:

- `feat`: nueva funcionalidad.
- `fix`: corrección de error.
- `docs`: documentación.
- `test`: pruebas.
- `refactor`: cambio interno sin alterar comportamiento.
- `perf`: mejora de rendimiento.
- `build`: Docker, dependencias o empaquetado.
- `ci`: automatización.
- `chore`: mantenimiento general.

Alcances sugeridos: `auth`, `students`, `ocr`, `tts`, `reading`, `gamification`, `prisma`, `config`, `docker`.

Ejemplos:

```text
feat(ocr): validar firma de imágenes WebP
fix(auth): reiniciar intentos después de expirar el bloqueo
test(gamification): cubrir recompensa de sesión completada
docs: documentar variables de proveedores TTS
build(docker): persistir caché de Tesseract
```

Reglas:

- Un commit debe representar un cambio lógico.
- No mezclar refactorizaciones masivas con funcionalidad nueva.
- No commitear archivos generados, dependencias, secretos ni archivos locales.
- No incluir atribuciones a IA en el mensaje ni en el cuerpo:
  - Sin `Co-Authored-By` de asistentes.
  - Sin “Generated with…”.
  - Sin “Made with…”.
  - Sin banners o firmas equivalentes.
- El autor del commit debe ser el colaborador humano configurado en Git.

## 4. Pull requests

Cuando se use pull request:

- Base: `main`.
- El título debe seguir el formato de Conventional Commits.
- Mantener el PR enfocado en un objetivo.
- Incluir evidencia de pruebas y, si aplica, capturas o ejemplos de request/response.
- No hacer merge con checks en rojo ni omitir reglas de protección configuradas en GitHub.
- No hacer force-push a una rama con revisión activa sin avisar.
- No incluir atribuciones a IA en la descripción, comentarios o revisión.

Plantilla sugerida:

```markdown
## Resumen

Describe el problema y la solución en 2–5 líneas.

## Cambios

- Cambio 1
- Cambio 2

## Cómo probar

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## Impacto

- Variables de entorno nuevas: sí/no
- Migraciones de Prisma: sí/no
- Cambios en contratos de API: sí/no
- Impacto en accesibilidad: descripción o “ninguno”

## Checklist

- [ ] DTOs y Swagger actualizados
- [ ] Pruebas agregadas o actualizadas
- [ ] Autorización y ownership revisados
- [ ] Sin secretos ni artefactos locales
- [ ] README/.env.example actualizados si corresponde
```

## 5. Verificación mínima

Ejecutar antes de cada commit o PR:

```bash
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

Y cuando el cambio toque base de datos, autenticación, OCR, TTS, gamificación o contratos HTTP:

```bash
docker compose up -d postgres
npm run test:e2e
```

Requisitos:

- Las pruebas end-to-end deben usar PostgreSQL real y proveedores simulados.
- No usar credenciales cloud reales en la suite de pruebas.
- No eliminar tests para ocultar fallos.
- No introducir `any` explícito.
- Reportar en el PR o en la entrega cualquier comando que no haya podido ejecutarse.

## 6. Migraciones y datos

- Los cambios de esquema van con migración de Prisma.
- No editar migraciones ya aplicadas.
- Verificar `prisma migrate status` antes de un despliegue.
- En desarrollo, usar `npm run prisma:migrate:dev`.
- En despliegue, usar `npm run prisma:migrate`.
- El seed es solo para desarrollo/demostración.
- No borrar volúmenes de PostgreSQL ni ejecutar `prisma migrate reset` sin autorización; son operaciones destructivas.

## 7. Seguridad y secretos

- `.env` nunca se versiona.
- Mantener `.env.example` sin secretos reales.
- No incluir tokens, PINs, claves de AWS, credenciales de Google ni contraseñas en commits, logs, pruebas o documentación.
- No desactivar autenticación, rate limiting, bloqueos de cuenta, validaciones de subida o filtros globales para facilitar una prueba.
- Revisar que las respuestas de error no filtren detalles internos de proveedores o base de datos.

## 8. Cierre de la tarea

Antes de finalizar:

1. Ejecutar la verificación correspondiente.
2. Revisar `git diff` y `git status`.
3. Confirmar que no se incluyeron secretos ni archivos ignorados.
4. Actualizar README, Swagger, `.env.example` o migraciones si aplica.
5. Dejar commits claros y la rama en un estado comprensible.
6. Informar commit, rama, pruebas ejecutadas y cualquier pendiente.
