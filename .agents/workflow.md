# Flujo de trabajo — API Lexi Learn

Este documento complementa [`AGENTS.md`](../AGENTS.md) y define el proceso de ramas, commits, pull requests, aprobaciones y verificación para este repositorio.

## 1. Equipo y cuentas de GitHub

El repositorio se trabaja con las siguientes cuentas:

| Cuenta | Rol |
| --- | --- |
| `@Oskrtim2` | Propietario, administrador, aprobador y responsable del merge de pull requests |
| `@juansem08` | Colaborador y revisor |

Reglas de identidad:

- Cada integrante sube sus ramas con su propia cuenta de GitHub.
- No suplantar la cuenta del otro integrante.
- No compartir tokens, contraseñas ni sesiones de Git Credential Manager.
- Si se usa GitHub CLI, cambiar de cuenta explícitamente antes de trabajar:
  - `gh auth switch --user Oskrtim2`
  - `gh auth switch --user juansem08`
- Una rama debe ser subida por la cuenta que la creó.
- Ambas cuentas deben tener acceso de escritura al repositorio para poder crear ramas y revisar.
- Solo el propietario administra colaboradores, secretos y reglas de protección del repositorio.

## 2. Ramas

- `main` es la rama estable, desplegable y protegida. No se trabaja directamente en ella para cambios funcionales.
- Partir siempre de `main` actualizado.
- Usar nombres descriptivos:
  - `feature/<descripcion>` para funcionalidad.
  - `fix/<descripcion>` para correcciones.
  - `test/<descripcion>` para cobertura y pruebas.
  - `chore/<descripcion>` para mantenimiento, tooling o dependencias.
  - `docs/<descripcion>` para documentación.
- Los cambios exclusivamente documentales o de instrucciones para agentes pueden aplicarse en `main` cuando el usuario lo solicite explícitamente.
- No trabajar directamente en `main` para cambios de código, seguridad, esquema o pruebas.
- Cada rama debe tener al menos un commit propio.
- Cada integrante trabaja únicamente en sus ramas. No reescribir ni eliminar ramas de la otra cuenta sin coordinarlo.
- Al mergear el pull request se puede eliminar la rama remota.
- Nunca reescribir una rama compartida ni hacer force-push sin autorización explícita.

## 3. Sincronización antes de trabajar

```bash
git status --short --branch
git pull --ff-only origin main
```

Si hay cambios locales:

1. No borrarlos.
2. Identificar si pertenecen al usuario.
3. Preguntar antes de commitear, mover o descartar.
4. Resolver conflictos antes de iniciar el cambio solicitado.

## 4. Commits

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
- Cada rama debe tener como mínimo un commit.
- No mezclar refactorizaciones masivas con funcionalidad nueva.
- No commitear archivos generados, dependencias, secretos ni archivos locales.
- No incluir atribuciones a IA en el mensaje ni en el cuerpo:
  - Sin `Co-Authored-By` de asistentes.
  - Sin “Generated with…”.
  - Sin “Made with…”.
  - Sin banners o firmas equivalentes.
- El autor del commit debe ser el colaborador humano configurado en Git.

## 5. Pull requests

- La base del PR es siempre `main`.
- Todo cambio funcional debe llegar mediante pull request; no se mergea directamente en `main`.
- Un PR requiere **1 aprobación de la cuenta contraria**:
  - Un PR de `@Oskrtim2` debe ser aprobado por `@juansem08`.
  - Un PR de `@juansem08` debe ser aprobado por `@Oskrtim2`.
  - El autor nunca puede aprobar su propio PR.
- La adaptación a una sola aprobación se debe a que el equipo actual tiene dos cuentas. Si se incorporan más integrantes, la regla puede elevarse a 2 aprobaciones.
- Las aprobaciones deben emitirse sin comentarios de revisión: solo aprobar. Cualquier observación debe dejarse como comentario en el hilo antes de aprobar.

### Cuenta de aceptación y merge

- La cuenta `@Oskrtim2` es la responsable de aceptar y mergear todos los pull requests dirigidos a este repositorio.
- PR de `@juansem08`: `@Oskrtim2` revisa, aprueba y ejecuta el merge.
- PR de `@Oskrtim2`: `@juansem08` otorga la aprobación requerida y `@Oskrtim2` ejecuta el merge. GitHub no permite que el autor apruebe su propio PR.
- PR de otras cuentas: `@Oskrtim2` revisa, aprueba si corresponde y ejecuta el merge.
- La aceptación con `@Oskrtim2` no exime de los checks de calidad, la resolución de conflictos, las reglas de protección de `main`, la revisión de seguridad ni las validaciones de accesibilidad.
- No se debe hacer merge de un PR con checks en rojo, conflictos sin resolver o cambios no revisados.
- Después del merge, eliminar la rama remota cuando ya no sea necesaria.
- No hacer merge si:
  - Falta la aprobación requerida.
  - Hay conflictos sin resolver.
  - Algún check de calidad está en rojo.
  - Existen dudas funcionales o de accesibilidad sin resolver.
- La plantilla del cuerpo del PR es obligatoria: [`.github/pull_request_template.md`](../.github/pull_request_template.md).
- El título del PR debe seguir el formato de Conventional Commits.
- Mantener el PR enfocado en un objetivo.
- Incluir evidencia de pruebas y, si aplica, capturas o ejemplos de request/response.
- No hacer force-push a una rama con revisión activa sin avisar.
- No incluir atribuciones a IA en la descripción, comentarios o revisión.
- Borrar la rama remota después del merge cuando ya no sea necesaria.

### Protección de `main`

El propietario del repositorio debe mantener activa una regla de protección sobre `main` que:

- Exija pull request antes de mergear.
- Exija al menos 1 aprobación de la cuenta contraria.
- Impida autoaprobaciones.
- Exija los checks de calidad aplicables.
- Restrinja force-push y eliminación de la rama.

Si la protección no está activa, no se debe asumir que el flujo está aplicado. La regla se documenta aquí y debe configurarse en la configuración de GitHub del repositorio.

### Estructura obligatoria del PR

La plantilla incluye:

- Banner del proyecto.
- Cuenta autora del PR.
- Resumen del cambio.
- Lista de archivos y clases modificadas con su ruta.
- Detalles técnicos.
- Pruebas ejecutadas.
- Impacto en variables de entorno, migraciones y contratos.
- Checklist de accesibilidad, seguridad y calidad.
- Rama de origen.
- Commits incluidos.

## 6. Verificación mínima

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
- No hacer merge con checks pendientes o fallidos.

## 7. Migraciones y datos

- Los cambios de esquema van con migración de Prisma.
- No editar migraciones ya aplicadas.
- Verificar `prisma migrate status` antes de un despliegue.
- En desarrollo, usar `npm run prisma:migrate:dev`.
- En despliegue, usar `npm run prisma:migrate`.
- El seed es solo para desarrollo/demostración.
- No borrar volúmenes de PostgreSQL ni ejecutar `prisma migrate reset` sin autorización; son operaciones destructivas.

## 8. Seguridad y secretos

- `.env` nunca se versiona.
- Mantener `.env.example` sin secretos reales.
- No incluir tokens, PINs, claves de AWS, credenciales de Google ni contraseñas en commits, logs, pruebas o documentación.
- No desactivar autenticación, rate limiting, bloqueos de cuenta, validaciones de subida o filtros globales para facilitar una prueba.
- Revisar que las respuestas de error no filtren detalles internos de proveedores o base de datos.
- Las credenciales de GitHub son personales. No se comparten entre `@Oskrtim2` y `@juansem08`.

## 9. Cierre de la tarea

Antes de finalizar:

1. Ejecutar la verificación correspondiente.
2. Revisar `git diff` y `git status`.
3. Confirmar que no se incluyeron secretos ni archivos ignorados.
4. Actualizar README, Swagger, `.env.example` o migraciones si aplica.
5. Dejar commits claros y la rama en un estado comprensible.
6. Abrir el PR con la plantilla obligatoria.
7. Informar commit, rama, pruebas ejecutadas y cualquier pendiente.
