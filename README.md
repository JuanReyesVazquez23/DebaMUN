# DebaMun

> Plataforma general de investigación y entrenamiento para delegados de modelos de las Naciones Unidas.
> Dos comisiones: **UNESCO** (IA generativa en educación) y **ECOSOC** (futuro del empleo juvenil ante la IA).
> Ambas tienen el **mismo peso**: misma rúbrica, mismo dossier y mismo asistente.
> Ninguna está preseleccionada ni se presenta como recomendada; el orden de la lista no implica prioridad.

DebaMun no es "otro chatbot". Es una mesa de preparación: te asigna un país, te entrega un dossier
editorial con fuentes, responde preguntas con citas verificables y entrena tu debate con una rúbrica
transparente en **Diálogo, Argumentos, Coherencia y Resolución**.

---

## Qué incluye

| Módulo | Qué hace |
| --- | --- |
| Onboarding | Nombre → grado escolar (primaria 1.º–6.º, secundaria 1.º–6.º o universidad) → país → comisión, en cuatro pasos, sin correo ni contraseña. |
| Dossier | 35 delegaciones con postura en cada comisión, prioridades, vulnerabilidad, palanca, aliados, tensiones, líneas rojas, organizaciones de tecnología y cooperación (qué hacen y enlace oficial), tips, datos y fuentes. |
| Datos del día | 10 hechos por país; el panel muestra 4 y permite rotar al siguiente bloque. La selección es determinista por fecha y no repite datos dentro del día. |
| Asistente | Recuperación por intención y entidades (BM25 + sinónimos + frases) sobre corpus editorial + LLM opcional. Cada respuesta se adapta a la pregunta y trae fuentes, extractos y nivel de confianza. |
| Debate | 2.336 combinaciones por comisión, dificultad elegible (Básico, Intermedio, Avanzado), IDs estables y control de preguntas ya usadas por sesión. |
| Evaluación | Rúbrica contextual en cuatro criterios, con señales de estructura, mecanismo causal, viabilidad y rendición de cuentas; resolución solo cuando la pregunta la exige. |
| Persistencia | PostgreSQL (local o Neon) con fallback en memoria; Redis/BullMQ opcional con degradación elegante. Si el backend pierde el delegado, el navegador lo re-registra sin cerrar la sesión. |
| Marca y tema | Logo de podio con corbata, modo claro/oscuro persistente y preferencia del sistema como valor inicial. |
| Accesibilidad | Foco visible, navegación por teclado, `aria-live`, contraste AA, `prefers-reduced-motion` y layout responsive. |

## Stack

- **API:** NestJS 12 + TypeScript 7, PostgreSQL (`pg`), Redis (`ioredis`), BullMQ.
- **Web:** React 19.3 + Vite 8 + React Router 7 + Lucide.
- **Investigación:** recuperación léxica en la API + sanitizador propio (HTML, Unicode, prompt injection) + LLM opcional.
- **Datos:** JSON editorial versionado en `data/`.
- **Banderas:** SVG incluidos en `apps/web/src/assets/flags` (flagcdn, dominio público), sin depender de red.

---

## Arranque rápido

Requisitos: **Node 24+** y **PostgreSQL 16+** (probado con PostgreSQL 18).
No hace falta Docker.

```powershell
# 1. Dependencias
npm install
npm --prefix apps/api install
npm --prefix apps/web install

# 2. Entorno
Copy-Item .env.example apps/api/.env
# Edita DATABASE_URL si tu PostgreSQL usa otro usuario o puerto.

# 3. Base de datos (crea la base si falta y aplica db/schema.sql)
npm run db:setup

# 4. Todo a la vez: API :4000 y web :5173
npm run dev
```

Abre **http://localhost:5173**.

Si prefieres arrancar por separado:

```powershell
npm run dev:api        # http://localhost:4000/api
npm run dev:web        # http://localhost:5173
```

### Sin PostgreSQL, Redis ni clave LLM

DebaMun funciona igual, en modo degradado y explícito:

- Sin `DATABASE_URL` → almacenamiento en memoria (se pierde al reiniciar).
- Sin `REDIS_URL` → caché en memoria y cola BullMQ en modo inline. Con `REDIS_URL` la caché pasa a ser compartida; la cola solo se activa con `JOBS_WORKER=1` (worker persistente, no en Vercel).
- Sin `LLM_*` → recuperación local + rúbrica heurística (comportamiento por defecto).

`GET /api/health` informa el modo real de cada servicio.

---

## Scripts

| Comando | Efecto |
| --- | --- |
| `npm run dev` | API + web con `concurrently`. |
| `npm run build` | Build de producción de API y web. |
| `npm test` | Vitest API y Vitest web. |
| `npm run lint` | oxlint en API y web. |
| `npm run db:setup` | Crea la base y aplica `db/schema.sql`. |
| `npm run deploy:prepare` | Copia el corpus a `apps/api/data` para la función serverless. |

---

## Estructura

```
DebOnu/
├─ apps/
│  ├─ api/                    NestJS
│  │  └─ src/
│  │     ├─ countries/        carga y expone corpus + briefing
│  │     ├─ sessions/         onboarding, dashboard, dato del día
│  │     ├─ debate/           generador de preguntas + scoring
│  │     ├─ research/         recuperación, conocimiento, LLM opcional
│  │     ├─ jobs/             caché Redis/memoria + BullMQ
│  │     └─ database/         PostgreSQL con fallback en memoria
│  └─ web/                    React + Vite
│     └─ src/
│        ├─ pages/            bienvenida, país, comisión, panel, dossier, debate, investigación
│        ├─ components/       shell, score ring, criterios, fuentes, estados
│        └─ lib/              api, sesión, tema por país, formato
├─ data/
│  ├─ countries/              35 dossieres en 4 JSON
│  ├─ knowledge/              guías editoriales de IA, empleo y debate
│  ├─ organizations.json      organizaciones por país: qué hacen y enlace oficial
│  └─ topics.json             briefing UNESCO/ECOSOC
├─ db/schema.sql              esquema PostgreSQL (incluye tablas de Fase 1)
├─ docs/                      arquitectura, UX, IA responsable, roadmap
└─ scripts/                   setup de base y preparación del deploy
```

---

## Despliegue en Vercel

La web y la API se despliegan como **dos proyectos de Vercel sobre el mismo repositorio**, con
PostgreSQL en **Neon**. No hay servicios adicionales: el asistente responde con el corpus editorial
incluido en la API.

| Pieza | Dónde | Notas |
| --- | --- | --- |
| Web React/Vite | Vercel (`apps/web`) | Estático + rewrite SPA para React Router. |
| API NestJS | Vercel (`apps/api`) | `src/main.ts` se detecta con el soporte zero-config de NestJS. |
| PostgreSQL | Neon | Cadena con `-pooler`, `DATABASE_SSL=true`, `DATABASE_POOL_MAX=3`. |
| Redis/BullMQ | Upstash (opcional) | Sin Redis, caché y cola viven en memoria por instancia; la cola necesita `JOBS_WORKER=1`. |

Orden recomendado: **Neon → API → copiar URL de la API → Web → copiar URL de la web → `WEB_ORIGIN` en la API → redeploy**.

Variables mínimas de la API:

```env
DATABASE_URL=postgresql://usuario:password@ep-xxx-pooler.us-east-2.aws.neon.tech/debamun?sslmode=require
DATABASE_SSL=true
DATABASE_POOL_MAX=3
WEB_ORIGIN=https://<tu-web>.vercel.app
NODE_ENV=production
```

Variable mínima de la web (Vite la incrusta en el build; cambiarla exige redeploy):

```env
VITE_API_URL=https://<tu-api>.vercel.app/api
```

Antes de desplegar, verifica en local que la API compila y que el corpus se empaqueta:

```powershell
npm run build
npm run deploy:prepare
```

Guía completa, verificación posterior y problemas frecuentes en
**[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

---

## Cómo se evalúa una intervención

Cuatro criterios, cada uno de 0 a 100, con pesos que se adaptan a la pregunta:

| Criterio | Qué mide | Peso si exige resolución | Peso si no |
| --- | --- | --- | --- |
| Diálogo | Cortesía, mención del país, concesión táctica, invitación al consenso | 20 % | 22 % |
| Argumentos | Evidencia, fuente, mecanismo causal, ejemplo, contraargumento | 30 % | 33 % |
| Coherencia | Estructura, conectores, respuesta exacta, cierre | 25 % | 30 % |
| Resolución | Responsable, financiamiento, plazo, indicador, rendición de cuentas | 25 % | 15 % |

Reglas de calibración:

- Menos de 12 palabras → feedback mínimo y `overall = 12` (no se premia una frase vacía).
- Una intervención con evidencia, estructura y propuesta verificable supera 70.
- Una respuesta genérica sin fuente queda por debajo de 60.
- Cada criterio devuelve **evidencia textual** (la frase que lo justifica) y **una acción concreta**.
- La evaluación nunca inventa una nota sin texto: si no hay evidencia, lo dice.

## Cómo se generan las preguntas

Cada comisión tiene 8 subtemas, 8 tensiones, 10 palancas de política y 7 actores. Las plantillas se
combinan con slots (alternativas, riesgos, contextos, fuentes) y producen **2.336 preguntas por
comisión**. Cada pregunta tiene un ID hash estable; la sesión guarda `askedIds` y el generador elige
siempre entre las no usadas. Si se agota el banco, entra un modo de profundización que tampoco repite
el mismo texto.

## API

Referencia completa en [`docs/API.md`](docs/API.md).

```
GET  /api/health
GET  /api/countries
GET  /api/countries/:code
GET  /api/topics
POST /api/sessions
GET  /api/sessions/:id
GET  /api/sessions/:id/dashboard
GET  /api/facts/today?countryCode=CH&offset=0
GET  /api/facts/day?countryCode=CH&offset=4
POST /api/debate/sessions
POST /api/debate/questions/next
POST /api/debate/turns
GET  /api/debate/history/:delegateId
POST /api/research/ask
GET  /api/research/sources?countryCode=CH&committee=UNESCO
GET  /api/research/history/:delegateId
```

---

## Datos y límites editoriales

- Los dossieres son **material de preparación**, no posiciones oficiales. Las posturas son
  orientativas y deben contrastarse con las fuentes antes de citarlas en la sala.
- **Escocia** aparece con `unMember: false` y una nota de modelo: no es Estado miembro de la ONU y su
  política exterior corresponde al Reino Unido.
- El asistente no inventa cifras: si el corpus no alcanza, responde que no encontró evidencia
  suficiente y sugiere qué verificar.
- No se recogen correos, teléfonos ni datos de menores. El nombre se guarda solo para dirigirse al
  delegado.

Más detalle en [`docs/responsible-ai/RAI-ADR.md`](docs/responsible-ai/RAI-ADR.md).

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — componentes, flujos, modelo de datos y decisiones.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — despliegue en Vercel, Neon y variables de entorno.
- [`docs/API.md`](docs/API.md) — endpoints, cuerpos y errores.
- [`docs/ux/UX-DECISIONS.md`](docs/ux/UX-DECISIONS.md) — flujo, accesibilidad y microcopy.
- [`docs/responsible-ai/RAI-ADR.md`](docs/responsible-ai/RAI-ADR.md) — decisiones de IA responsable.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — las cinco fases.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `No pude contactar con el servidor` | API apagada | `npm run dev:api` |
| `database: memory` en `/api/health` | `DATABASE_URL` ausente o inválida | Revisa `apps/api/.env` y ejecuta `npm run db:setup` |
| Error de CORS | Origen distinto de `localhost:5173` | Añade el origen a `WEB_ORIGIN` |
| Preguntas repetidas | Sesión de debate nueva | Es esperado: la no repetición es por sesión, no global |
| 404 al recargar `/app/...` en Vercel | Falta el rewrite SPA | Revisa [`apps/web/vercel.json`](apps/web/vercel.json) |
| `No se encontró el corpus` en Vercel | Build sin copiar `data/` | Verifica que el Build Command ejecute `prepare-api-deploy.mjs` |
| La web desplegada llama a `localhost:4000` | `VITE_API_URL` ausente en el build | Defínela en Vercel y redeploya la web |
