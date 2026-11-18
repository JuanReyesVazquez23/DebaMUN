# DebaMun · Arquitectura

> Documento vivo. Describe lo implementado en la Fase 0 y los puntos de extensión previstos.

## 1. Vista general

```
┌──────────────────────────────┐
│  Web · React 19 + Vite 8     │
│  Onboarding · Panel · Dossier│
│  Debate · Investigación      │
└──────────────┬───────────────┘
               │ JSON / HTTP (CORS)
┌──────────────▼───────────────┐        ┌────────────────────────────┐
│  API · NestJS 12             │        │  Research · FastAPI        │
│  ┌────────────────────────┐  │        │  ┌──────────────────────┐  │
│  │ Countries (corpus)     │  │        │  │ Sanitizer            │  │
│  │ Sessions / Dashboard   │  │  HTTP  │  │ Corpus + BM25        │  │
│  │ Debate (gen + scoring) │──┼───────▶│  │ Scrapy runner        │  │
│  │ Research (retrieval)   │  │        │  └──────────┬───────────┘  │
│  │ Jobs (cache + queues)  │  │        └─────────────┼──────────────┘
│  │ Database (PG/memory)   │  │                      │ spiders
│  └───────┬────────┬───────┘  │                      ▼
└──────────┼────────┼──────────┘        ┌────────────────────────────┐
           │        │                   │ Fuentes oficiales          │
           ▼        ▼                   │ (UNESCO, OIT, BM, OCDE…)   │
   ┌───────────┐ ┌──────────┐           └────────────────────────────┘
   │PostgreSQL │ │Redis     │
   │(Neon)     │ │BullMQ    │
   └───────────┘ └──────────┘
```

Tres procesos independientes, sin Docker obligatorio. Cada uno degrada solo:

| Dependencia ausente | Efecto | Señal |
| --- | --- | --- |
| PostgreSQL | Repositorio en memoria | `health.services.database = memory` |
| Redis | Caché en memoria, cola inline | `health.services.cache = memory`, `queue = inline` |
| Servicio Python | El asistente usa solo el corpus de la API | `health.services.scraper = down` |
| LLM | Recuperación local + rúbrica heurística | `health.services.llm = disabled` |

## 2. Backend NestJS

### 2.1 Módulos

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| `DatabaseModule` (global) | Pool PostgreSQL, esquema idempotente, repositorio con fallback. | — |
| `CountriesModule` | Carga `data/countries/*.json` y `data/topics.json`; expone países, comisiones y posturas. | — |
| `SessionsModule` | Onboarding, perfil, dashboard, dato del día, readiness. | Countries, Store |
| `DebateModule` | Sesiones de práctica, generación de preguntas, rúbrica, historial. | Countries, Store |
| `ResearchModule` | Knowledge base, ranking, citas, scraper, LLM opcional. | Countries, Jobs, Store |
| `JobsModule` | Caché Redis/memoria, cola BullMQ, estado. | — |
| `HealthController` | Estado real de cada servicio y tamaño del corpus. | Todos |

`DatabaseModule` es global para que el repositorio sea único y no haya pools duplicados.

### 2.2 Flujo de onboarding

```
POST /api/sessions {username, countryCode, committee}
  → valida DTO (nombre 2–40, país existente, comisión UNESCO|ECOSOC)
  → crea delegate (UUID)
  → devuelve perfil completo + dato del día + cuenta atrás
  → web guarda delegateId en localStorage
```

No hay login. El `delegateId` es la credencial de sesión del dispositivo; el backend no lo trata como
secreto fuerte y por eso no expone datos sensibles. Si el `delegateId` no existe, la web borra el
estado local y vuelve al onboarding.

### 2.3 Flujo de debate

```
POST /api/debate/sessions {delegateId}
  → sesión con askedIds=[] y questionCount=0

POST /api/debate/questions/next {sessionId}
  → CountriesService.requireCountry / requireCommittee
  → QuestionGenerator.next({committee, country, sessionId, questionCount, askedIds})
      · construye 2.336 candidatos con IDs hash
      · filtra los ya usados
      · elige con PRNG determinista (sessionId + questionCount)
  → Store.recordAskedQuestion (append atómico en jsonb)
  → devuelve pregunta + contador

POST /api/debate/turns {sessionId, questionId, question, kind, answer}
  → sanitiza la respuesta
  → ScoringService.evaluate(...)
  → Store.addTurn (scores + feedback completos)
  → devuelve evaluación, stats y siguiente paso
```

El cliente **no puede** elegir la pregunta: solo recibe la que el generador seleccionó. El servidor
registra el ID antes de responder, de modo que dos pestañas no reciben la misma pregunta.

### 2.4 Flujo de investigación

```
ask(delegateId, question)
  → rate limit por delegado (20/min)
  → caché por hash(normalize(pregunta) + país + comisión), TTL 10 min
  → docs = KnowledgeService.buildDocs(country, committee)   [local, 100–200 fragmentos]
         + fetchScraper(question, country, committee)        [opcional, timeout 2.5 s]
  → rank(): BM25 simplificado + peso por ámbito + bonus de título + penalización por longitud
  → top 4 → fuentes deduplicadas + pasajes
  → si LLM configurado: respuesta con citas [1]..[n] y contexto delimitado
    si no: composeAnswer() con extractos literales y guía de uso en el debate
  → guarda mensajes user/assistant en el historial
```

El texto recuperado se trata como **datos**: el prompt del sistema prohíbe seguirlo como
instrucciones. El sanitizador del servicio Python elimina intentos conocidos de inyección antes de
que lleguen al índice.

## 3. Modelo de datos

Implementado en `apps/api/src/database/database.service.ts` y `db/schema.sql`:

```
delegates ──┬── debate_sessions ── debate_turns
            └── chat_messages

research_cache (clave → payload, expires_at)
```

Campos relevantes:

- `delegates.username` — nombre visible, sin correo.
- `debate_sessions.asked_ids jsonb` — garantía de no repetición.
- `debate_turns.scores jsonb` — los cuatro criterios con evidencia y consejo.
- `debate_turns.feedback jsonb` — veredicto, fortalezas, mejoras y nivel.
- `chat_messages.sources jsonb` — citas exactas mostradas al delegado.

Tablas de Fase 1 ya creadas pero sin uso en el MVP: `documents`, `document_chunks`, `source_health`.
La columna `embedding` solo se añade si la extensión `vector` está disponible, para que el esquema
funcione en PostgreSQL estándar y en Neon con pgvector.

Índices: por delegado y fecha en turnos y mensajes; por país en delegados; por expiración en caché.

## 4. Frontend

### 4.1 Rutas

| Ruta | Pantalla | Guarda |
| --- | --- | --- |
| `/` | Redirección según sesión | — |
| `/bienvenida` | Nombre | Redirige a `/app` si ya hay perfil |
| `/pais` | Selección de país con búsqueda y filtro por región | Requiere nombre |
| `/comision` | Selección de comisión y creación de sesión | Requiere país |
| `/app` | Panel: readiness, dato del día, stats, ruta de hoy | Requiere perfil |
| `/app/dossier` | Dossier completo con navegación por secciones | Requiere perfil |
| `/app/debate` | Arena: pregunta, temporizador, rúbrica, resultados | Requiere perfil |
| `/app/investigacion` | Asistente conversacional con fuentes | Requiere perfil |
| `*` | 404 con salida al inicio | — |

### 4.2 Estado

- `SessionProvider` mantiene `status` (`loading | anonymous | ready`), `profile` y el borrador del
  onboarding (`username`, `country`).
- Persistencia: `localStorage` (`debamun.delegate.v1`, `debamun.draft.v1`).
- **Sin comisión por defecto:** hasta que el delegado elige, el tema usa un acento neutro. `themeVars`
  exige la comisión y no cae a ninguna de las dos. Ambas comparten pesos de rúbrica y profundidad de
  dossier; los tests de humo recorren UNESCO y ECOSOC con el mismo conjunto de garantías.
- Tema: `themeVars(palette, committee)` produce variables CSS (`--country*`, `--committee*`). La tinta
  sobre el color del país se elige con contraste WCAG, no a ojo.
- No hay estado global adicional: cada pantalla carga sus datos y maneja `loading | ready | error`
  con reintento explícito.

### 4.3 Decisiones de UI

- Onboarding en tres pantallas, una pregunta por pantalla.Reduce el abandono y permite explicar el
  valor de cada dato.
- El panel responde "qué hago ahora", no "cuántas métricas tengo": readiness con checks ponderados y
  una ruta de cuatro pasos.
- El debate muestra la estructura sugerida **antes** de escribir y la evidencia **después** de
  enviar. La rúbrica es visible, no una caja negra.
- La investigación separa respuesta, fuentes y nivel de confianza. Si la confianza es baja, lo dice.

## 5. Servicio Python

```
FastAPI (:8000)
├─ GET  /health          estado + tamaño del corpus
├─ GET  /research        búsqueda con país/comisión y snippet
├─ GET  /sources         fuentes por país + globales + dominios permitidos
├─ POST /sanitize        limpieza y control de calidad
└─ POST /ingest          ejecuta Scrapy y recarga el corpus

Scrapy
├─ settings.py           robots.txt, throttling, user-agent identificable
├─ pipelines.py          dominios de confianza → sanitizar → calidad → deduplicar → JSONL
└─ spiders/
   ├─ country_spider.py  fuentes del dossier por país
   └─ source_spider.py   fuentes globales por comisión
```

El runner lanza Scrapy en un subproceso: un reactor por proceso, sin fugas y con timeout de 120 s.
La ingesta escribe `data/scraped/passages.jsonl`; el corpus recarga cuando cambia el `mtime`.

## 6. Seguridad y robustez

- **Validación:** DTOs con `class-validator` y `whitelist`; límites de longitud en todos los textos.
- **Sanitización:** HTML, Unicode, caracteres de control, correos y teléfonos; normalización NFC.
- **Inyección de prompt:** patrones en el sanitizador + instrucción de sistema que delimita el
  contexto como datos.
- **Rate limiting:** ventana fija en memoria (60 next/min, 30 turnos/min, 20 research/min).
  En producción se sustituye por Redis para varios procesos.
- **CORS:** lista explícita de orígenes (`WEB_ORIGIN`).
- **SQL:** consultas parametrizadas; nunca interpolación de texto.
- **Scraping ético:** `robots.txt`, concurrencia 1 por dominio, delay aleatorio, user-agent con
  propósito educativo y allowlist de dominios.
- **Fallos parciales:** cada integración tiene timeout y *fallback*; una caída no bloquea el flujo
  principal.

## 7. Rendimiento

- Ranking en memoria sobre ~500 documentos: milisegundos, sin dependencia externa.
- Caché de respuestas de investigación (10 min) y de documentos de conocimiento por país+comisión.
- Preguntas generadas bajo demanda: no se materializan 2.336 objetos por sesión.
- Pool PostgreSQL de 8 conexiones por defecto; sin ORM para evitar sobrecarga.
- Build web: ~324 kB JS (100 kB gzip) y 33 kB CSS (7 kB gzip).

## 8. Puntos de extensión

| Necesidad | Dónde |
| --- | --- |
| Nuevo país | Añadir objeto en `data/countries/*.json`; se valida al arrancar. |
| Nuevo subtema o tensión | `data/topics.json`; el generador produce más combinaciones automáticamente. |
| Nueva fuente scrapeada | `data/sources.json` o `sources` del dossier; pipeline valida dominio. |
| Cambiar pesos de la rúbrica | `ScoringService.evaluate` (objeto `weights`). |
| Activar LLM | Variables `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. |
| Varios procesos API | Redis para rate limit + BullMQ + caché compartida. |
| Dossier vivo | Tablas `documents`/`document_chunks` + panel de revisión humana (Fase 1). |

## 9. Riesgos técnicos conocidos

- **Scraping frágil:** los selectores de texto son genéricos; un rediseño de la fuente puede degradar
  la calidad. Mitigación: allowlist, calidad mínima, snapshot y alertas de fuente.
- **Heurística de evaluación:** buena para entrenar, no sustituye a un docente. Mitigación: evidencia
  textual, rúbrica pública y revisión humana en Fase 2.
- **Memoria en fallback:** sin PostgreSQL se pierde el historial al reiniciar. Es intencional y
  visible en `/health`.
- **Python 3.15:** el entorno se probó con 3.15.2 y Scrapy 2.20; si una dependencia falla, usar 3.13
  (LTS) y reinstalar el `.venv`.
