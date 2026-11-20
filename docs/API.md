# DebaMun · API

Base: `http://localhost:4000/api`
Formato: JSON UTF-8. No hay autenticación en el MVP: el `delegateId` (UUID) identifica la sesión del
dispositivo.

## Errores

| Código | Significado | Cuerpo |
| --- | --- | --- |
| 400 | Validación | `{ "message": ["..."], "error": "Bad Request", "statusCode": 400 }` |
| 404 | Recurso inexistente | `{ "message": "Delegado no encontrado.", "statusCode": 404 }` |
| 429 | Rate limit | `{ "message": "Demasiadas solicitudes. Intenta de nuevo en N s.", "statusCode": 429 }` |
| 500 | Fallo inesperado | `{ "statusCode": 500, "message": "Internal server error" }` |

El frontend muestra el primer mensaje de validación y ofrece reintento en errores de red.

---

## Salud

### `GET /health`

```json
{
  "status": "ok",
  "service": "debamun-api",
  "version": "0.1.0",
  "corpus": { "countries": 35, "committees": ["UNESCO", "ECOSOC"] },
  "services": {
    "database": "up",
    "cache": "memory",
    "queue": "inline",
    "llm": "disabled"
  }
}
```

---

## Corpus

### `GET /countries`

```json
{
  "countries": [
    {
      "code": "CH",
      "slug": "suiza",
      "name": "Suiza",
      "officialName": "Confederación Suiza",
      "flag": "🇨🇭",
      "region": "Europa Occidental",
      "palette": { "primary": "#D52B1E", "secondary": "#FFFFFF", "accent": "#0B6FB8" },
      "summary": "…",
      "unMember": true
    }
  ]
}
```

### `GET /countries/:code`

Devuelve `{ "country": { …dossier completo… } }`. Incluye `unProfile`, `context`, `unesco`, `ecosoc`,
`tips`, `facts` y `sources`.

### `GET /topics`

`{ "conference": { … }, "committees": [ … ] }` con subtemas, preguntas clave, glosario, palancas,
tensiones, actores y fuentes.

### `GET /topics/:id`

`id` ∈ `UNESCO | ECOSOC`. Devuelve `{ "committee": { … } }`.

---

## Sesiones

### `POST /sessions`

```json
{
  "username": "Valentina Ríos",
  "grade": "secundaria-5",
  "countryCode": "CH",
  "committee": "UNESCO"
}
```

Reglas: `username` 2–40 caracteres (letras, números, espacios y `. _ - ’`), `countryCode` existente,
`committee` exacto y `grade` uno de `primaria-1`…`primaria-6`, `secundaria-1`…`secundaria-6` o
`universidad`.

Respuesta `201`:

```json
{
  "delegate": {
    "id": "2e2ee2b9-…",
    "username": "Valentina Ríos",
    "countryCode": "CH",
    "committee": "UNESCO",
    "grade": "secundaria-5",
    "createdAt": "2026-11-16T23:54:35.000Z"
  },
  "country": { "…": "dossier completo" },
  "committee": { "…": "briefing completo" },
  "factOfDay": { "text": "…", "index": 2, "total": 10, "date": "2026-11-16", "offset": 0 }
}
```

### `POST /sessions/restore`

Vuelve a registrar una sesión que ya existe en el navegador cuando el backend no la encuentra
(base efímera, reinicio sin PostgreSQL o instancia nueva). Es idempotente: si el delegado existe, no
se modifica nada y se devuelve su perfil real.

```json
{
  "delegateId": "2e2ee2b9-…",
  "username": "Valentina Ríos",
  "grade": "secundaria-5",
  "countryCode": "CH",
  "committee": "UNESCO"
}
```

Respuesta `200`: mismo cuerpo que `POST /sessions`, con el `id` original del delegado.

### `GET /sessions/:id`

Mismo cuerpo que la creación. Actualiza `last_seen_at`.

### `GET /sessions/:id/dashboard`

```json
{
  "delegate": { "…": "…" },
  "country": { "…": "…" },
  "committee": { "…": "…" },
  "factOfDay": { "…": "…" },
  "factsOfDay": [{ "text": "…", "index": 4, "total": 10, "date": "2026-11-16", "offset": 0 }],
  "conference": { "name": "DebaMun", "date": "" },
  "readiness": {
    "score": 45,
    "label": "En preparación",
    "checks": [
      { "id": "perfil", "label": "Perfil y comisión configurados", "done": true, "weight": 20 },
      { "id": "primera", "label": "Primera intervención evaluada", "done": false, "weight": 25 }
    ]
  },
  "debate": {
    "turns": 0, "average": 0, "best": 0, "last": null,
    "recent": []
  },
  "research": { "messages": 0 },
  "nextSteps": ["Completa tu primera intervención en la Arena de debate."]
}
```

### `GET /facts/today?countryCode=CH&offset=0`

`offset` ∈ [0, 50]. El índice es determinista por fecha, país y offset: cambiar `offset` rota el dato
del día sin salir de la lista.

### `GET /facts/day?countryCode=CH&offset=0`

Devuelve `{ "date": "2026-11-16", "facts": [...] }` con hasta cuatro datos consecutivos. El punto de
partida rota a diario; usar `offset=4` entrega el bloque siguiente sin repetir el anterior. El último
bloque puede ser más corto para no dar la vuelta a la lista.

---

## Debate

### `POST /debate/sessions`

```json
{ "delegateId": "2e2ee2b9-…" }
```

```json
{ "session": { "id": "0e2a8f46-…", "committee": "UNESCO", "askedIds": [], "questionCount": 0 }, "delegate": { "id": "…", "committee": "UNESCO" } }
```

### `POST /debate/questions/next`

```json
{ "sessionId": "0e2a8f46-…" }
```

```json
{
  "question": {
    "id": "6e1936f84497dc39",
    "committee": "UNESCO",
    "kind": "datos",
    "difficulty": 2,
    "text": "Un informe de PNUD advierte sobre la vigilancia educativa. ¿Qué evidencia adicional necesita Suiza…?",
    "focus": "Formación y rol docente",
    "focusId": "docentes",
    "angle": "Evidencia · PNUD",
    "whyItMatters": "La formación docente debe ser continua, práctica y financiada…",
    "suggestedStructure": ["Fuente y límite del dato", "Verificación", "Ajuste de la propuesta"],
    "timeSeconds": 60,
    "resolutionExpected": false
  },
  "session": { "id": "…", "committee": "UNESCO", "questionCount": 1, "uniqueAsked": 1 }
}
```

Rate limit: 60 por minuto y delegado. La pregunta queda registrada antes de responder.

### `POST /debate/turns`

```json
{
  "sessionId": "0e2a8f46-…",
  "questionId": "6e1936f84497dc39",
  "question": "…texto exacto recibido…",
  "kind": "datos",
  "answer": "Honorable Presidencia, la delegación de Suiza…"
}
```

`answer` entre 12 y 6.000 caracteres. Respuesta `201`:

```json
{
  "evaluation": {
    "overall": 81,
    "level": "Destacado",
    "criteria": [
      {
        "key": "dialogo",
        "label": "Diálogo",
        "score": 76,
        "level": "Competente",
        "weight": 0.22,
        "evidence": ["Honorable Presidencia, la delegación de Suiza reconoce…"],
        "advice": "Tu registro diplomático es sólido…"
      }
    ],
    "strengths": ["Argumentos (82/100): destacado."],
    "improvements": ["…"],
    "verdict": "Intervención sólida…",
    "wordCount": 96,
    "resolutionExpected": false
  },
  "turn": { "id": "…", "createdAt": "2026-11-16T23:58:00.000Z", "overall": 81 },
  "stats": { "count": 1, "average": 81, "best": 81, "last": 81 },
  "nextStep": "Buen nivel. Sube la dificultad pidiendo una pregunta de crisis o resolución."
}
```

Errores habituales: `400` si `answer` es demasiado corto o `kind` no es válido; `429` tras 30 envíos
por minuto.

### `GET /debate/history/:delegateId?limit=20`

`limit` se recorta a [1, 50]. Devuelve turnos con `scores`, `feedback`, `overall` y `stats`.

---

## Investigación

### `POST /research/ask`

```json
{ "delegateId": "2e2ee2b9-…", "question": "¿Qué evidencia hay sobre IA y formación docente?" }
```

`question` 3–600 caracteres. Rate limit: 20 por minuto.

```json
{
  "answer": "Esto es lo más relevante para la delegación de Suiza en UNESCO:…",
  "sources": [
    {
      "label": "UNESCO · IA y educación",
      "url": "https://www.unesco.org/en/digital-education/artificial-intelligence",
      "kind": "multilateral",
      "title": "UNESCO · Formación y rol docente",
      "snippet": "…"
    }
  ],
  "confidence": "alta",
  "provider": "local",
  "passages": [
    { "title": "…", "text": "…", "source": "UNESCO", "url": "https://…", "score": 4.19 }
  ],
  "suggestedQuestions": ["¿Qué evidencia sostiene la postura de Suiza…?"],
  "cached": false
}
```

- `provider`: `local` (corpus de la API) o `llm` (redacción con modelo configurado).
- `confidence`: `alta` ≥ 50 % de cobertura de términos; `media` ≥ 25 %; `baja` por debajo.
- `cached`: indica si vino de la caché de 10 minutos.

### `GET /research/sources?countryCode=CH&committee=UNESCO`

Fuentes del país, de la comisión y base editorial.

### `GET /research/history/:delegateId`

Últimos 40 mensajes con rol (`user | assistant`), contenido y fuentes.

---

## Jobs

### `GET /jobs/status`

```json
{ "mode": "inline", "counts": { "waiting": 0, "active": 0, "completed": 0, "failed": 0 }, "note": "…" }
```

Con Redis: `mode: "bullmq"` y conteos reales.

### `POST /jobs/research-refresh`

```json
{ "countryCode": "CH", "committee": "UNESCO", "reason": "manual" }
```

Encola `research-refresh` (3 intentos, backoff exponencial) o devuelve un job inline si no hay Redis.
