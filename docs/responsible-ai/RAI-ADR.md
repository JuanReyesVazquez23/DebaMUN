# DebaMun · IA responsable (RAI-ADR)

> Formato ADR: contexto → decisión → consecuencias. Cada decisión se puede auditar en el código.
> Ámbito: asistente de investigación, evaluación de debate, scraping y datos de delegados.

## Contexto

DebaMun entrena a estudiantes para un modelo de Naciones Unidas. El riesgo no es solo "alucinar": es
que un delegado cite una cifra falsa en la sala, que una nota injusta lo desmotive o que se recojan
datos de menores sin necesidad. El producto debe seguir siendo útil **sin** LLM y sin conexión.

---

## ADR-001 · Recuperación antes que generación

**Decisión.** El asistente responde primero con recuperación léxica sobre un corpus curado (dossier,
briefing y guías editoriales). El LLM es opcional y solo redacta a partir del contexto recuperado.

**Consecuencias.**

- Sin clave LLM el producto funciona y cita fuentes reales.
- La respuesta local muestra extractos literales, no paráfrasis inventadas.
- El LLM recibe `[1]…[n]` y se le prohíbe usar conocimiento externo; si el contexto no alcanza, debe
  decirlo.
- Coste marginal cero en el modo por defecto.

**Verificación.** `ResearchService.ask`, `composeAnswer`, prompt del sistema en `research.service.ts`.

---

## ADR-002 · Toda respuesta declara confianza y origen

**Decisión.** Cada respuesta incluye `sources` (etiqueta, URL, tipo), `provider`
(`local | scraper | llm`) y `confidence` (`alta | media | baja`) calculada por cobertura de términos.

**Consecuencias.**

- El delegado puede contrastar antes de citar.
- La interfaz muestra "confianza baja" sin maquillarla.
- La ausencia de fuentes es visible, no un detalle técnico.

**Verificación.** `confidence()` y `toSources()` en `research.service.ts`; bloque de fuentes en
`ResearchPage.tsx`.

---

## ADR-003 · La nota siempre es explicable

**Decisión.** La evaluación usa una rúbrica heurística con cuatro criterios ponderados. Cada criterio
devuelve la frase que lo justifica (`evidence`) y una acción (`advice`). Nunca se emite una nota sin
texto.

**Consecuencias.**

- Un docente puede revisar por qué se puntuó así.
- El delegado aprende del desglose, no solo del número.
- La heurística es reproducible y no depende de un proveedor.
- Limitación reconocida: mide señales textuales, no verdad sustantiva. Por eso el veredicto invita a
  contrastar y la Fase 2 añade revisión humana.

**Verificación.** `ScoringService.evaluate`; tests `scoring.service.spec.ts`.

---

## ADR-004 · Resolución solo cuando corresponde

**Decisión.** El peso de "Resolución" sube al 25 % solo si la pregunta pide propuesta, crisis o
mecanismo; en preguntas de principio baja al 15 %.

**Consecuencias.**

- No se penaliza a quien responde una pregunta conceptual sin inventar un programa.
- El generador marca `resolutionExpected` y la interfaz lo explica antes de escribir.

**Verificación.** `resolutionExpected` en `question.generator.ts` y `scoring.service.ts`.

---

## ADR-005 · No repetir preguntas dentro de una sesión

**Decisión.** Cada pregunta tiene un ID hash estable; la sesión guarda `askedIds` y el servidor elige
solo entre las no usadas. El registro ocurre antes de devolver la pregunta.

**Consecuencias.**

- Dos pestañas no reciben la misma pregunta.
- El delegado percibe progreso real.
- Al agotar las 2.336 combinaciones entra un modo de profundización, también sin repetir texto.

**Verificación.** `question.generator.ts`, `store.service.ts#recordAskedQuestion`, test de 60
preguntas únicas.

---

## ADR-006 · Sanitizar antes de indexar y antes de responder

**Decisión.** El servicio Python elimina HTML/scripts, caracteres de control y de ancho cero,
normaliza Unicode, borra correos y teléfonos, y neutraliza patrones conocidos de inyección de prompt.
El pipeline de Scrapy descarta dominios no confiables y textos de baja calidad.

**Consecuencias.**

- El índice no almacena basura ni PII.
- Un texto malicioso no puede redefinir el comportamiento del asistente.
- Se conservan `flags` para auditar qué se limpió.

**Verificación.** `services/research/app/sanitizer.py`; 8 tests de sanitización.

---

## ADR-007 · Minimización de datos

**Decisión.** No se pide correo, teléfono ni edad. Solo se guarda el nombre visible, el país, la
comisión, las respuestas y las consultas. El identificador es un UUID local.

**Consecuencias.**

- Menor superficie de riesgo y cumplimiento más simple.
- No hay recuperación de cuenta: si se borra el almacenamiento local, se pierde el historial.
- El historial es del dispositivo, no una cuenta global.

**Verificación.** `CreateSessionDto`, esquema `delegates`, `SessionProvider`.

---

## ADR-008 · Scraping ético y acotado

**Decisión.** `robots.txt` obligatorio, una petición concurrente por dominio, retraso aleatorio,
user-agent identificable, allowlist de dominios de organismos y timeout de 120 s por ingesta.

**Consecuencias.**

- Menos riesgo de bloqueo y de dañar la fuente.
- La ingesta no es un rastreador abierto: es una actualización de fuentes conocidas.
- Si una fuente cambia, se descarta por calidad en lugar de indexar ruido.

**Verificación.** `settings.py`, `pipelines.py`, `country_spider.py`.

---

## ADR-009 · Degradación visible, nunca silenciosa

**Decisión.** PostgreSQL, Redis, servicio Python y LLM son opcionales. `/api/health` declara el modo
real y la interfaz muestra el estado del asistente.

**Consecuencias.**

- Un fallo de infraestructura no rompe la preparación.
- El evaluador sabe si está en modo memoria y que el historial puede perderse.
- No se simula una capacidad que no existe.

**Verificación.** `DatabaseService`, `CacheService`, `JobsService`, `HealthController`.

---

## ADR-010 · El producto no sustituye al docente ni a la mesa

**Decisión.** DebaMun se presenta como entrenador. Los dossieres son material editorial orientativo y
la interfaz repite que las posturas deben contrastarse con fuentes oficiales.

**Consecuencias.**

- Se evita que un delegado lea el dossier como posición oficial del país.
- La evaluación es formativa; no certifica competencia.
- La Fase 2 incorpora revisión docente y apelación de notas.

**Verificación.** Aviso en README, nota de conferencia en `topics.json`, pie del sitio y microcopy.

---

## Registro de riesgos

| Riesgo | Prob. | Impacto | Mitigación implementada | Pendiente |
| --- | --- | --- | --- | --- |
| Cifra inventada citada en la sala | Media | Alto | Recuperación con extractos, confianza, "no encontrado" | Verificación de cifras con fuente primaria en Fase 1 |
| Nota injusta o desmotivadora | Media | Alto | Rúbrica visible, evidencia textual, consejo accionable | Apelación y revisión docente en Fase 2 |
| Sesgo cultural o lingüístico | Media | Medio | Corpus en español neutro, fuentes multilaterales, revisión humana | Golden set con nombres y textos diversos |
| Inyección de prompt vía fuente | Baja | Alto | Sanitizador + contexto delimitado + instrucción de sistema | Pruebas adversariales periódicas |
| Exposición de datos de menores | Baja | Alto | Minimización, sin correo, datos locales | Política de retención y borrado en Fase 4 |
| Dependencia de una fuente | Media | Medio | Allowlist múltiple, fallback a snapshot | Panel de salud de fuentes en Fase 1 |
| Coste LLM descontrolado | Baja | Medio | LLM opcional, caché 10 min, límite de tokens | Presupuesto por delegado en Fase 4 |
| Scraping bloqueado | Media | Bajo | Throttling, robots.txt, user-agent | Rotación de fuentes y alertas |

## Evaluación continua

1. **Golden set** de 40 preguntas por comisión con respuesta esperada y fuentes mínimas.
2. **Pruebas de recuperación:** toda respuesta debe citar ≥ 2 fuentes o declarar confianza baja.
3. **Pruebas de rúbrica:** respuestas fuertes > 70, débiles < 60, brevísimas = 12. Ya automatizadas.
4. **Pruebas adversariales:** HTML, Unicode, PII, "ignora las instrucciones", texto repetitivo.
5. **Revisión humana:** muestreo semanal de 20 respuestas y 20 evaluaciones durante la preparación.
6. **Feedback del delegado:** un botón "esto no es correcto" por respuesta (Fase 2) con trazabilidad.

## Lo que DebaMun no hace

- No predice el resultado de la conferencia.
- No escribe discursos completos por el delegado.
- No certifica competencias ni sustituye la evaluación de la mesa.
- No scrapea redes sociales ni datos personales.
- No usa el contenido de las fuentes como instrucciones.
- No inventa una respuesta cuando el corpus no alcanza: lo dice.
