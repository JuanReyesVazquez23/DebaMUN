# DebaMun · Roadmap de 5 fases

> Modelo de Naciones Unidas · plataforma general y permanente
> Comisiones: **UNESCO** y **ECOSOC**.

## Principio rector

El delegado no necesita "otro chatbot". Necesita **llegar preparado a la sala**: entender el tema,
saber qué defiende su país, anticipar preguntas incómodas y practicar respuestas defendibles.
Cada función del producto responde a ese trabajo (ver `docs/ux/`).

---

## Fase 0 · MVP funcional (implementado)

**Objetivo:** que un delegado complete el flujo completo sin depender de servicios externos.

- Onboarding en 3 pasos: nombre → país → comisión.
- Personalización visual por país (paleta accesible, bandera, identidad).
- Dossier editorial de 37 países con postura UNESCO y ECOSOC, alianzas, tensiones, tips y fuentes.
- Datos del día rotativos por país: 10 por país, bloque de 4 en el panel y selección determinista por fecha.
- Briefing de comisión con subtemas, preguntas clave, glosario y fuentes.
- Asistente de investigación con recuperación local, citas y confianza declarada.
- Simulador de debate: preguntas combinatorias que no se repiten, modo relámpago y evaluación en
  **Diálogo, Argumentos, Coherencia y Resolución**.
- Persistencia PostgreSQL (compatible Neon) con fallback en memoria; Redis/BullMQ opcional.
- 37 países: Suiza, Escocia, Canadá, Japón, Corea del Sur, Colombia, Alemania, Singapur, España,
  Polonia, Estonia, China, El Salvador, Brasil, Francia, Suecia, Noruega, Finlandia, Irlanda,
  Islandia, Dinamarca, Reino Unido, Rusia, México, India, Sudáfrica, Australia, Argentina, Chile, Perú,
  Países Bajos, Bélgica, Portugal, Italia, Paraguay, República Dominicana y Luxemburgo.
- Accesibilidad WCAG AA, navegación por teclado, reduced motion y diseño responsive.
- Tests unitarios de scoring, generador de preguntas, conocimiento y utilidades.

**Criterio de salida:** `npm run test` pasa y el flujo onboarding → dashboard → debate → investigación
funciona en local con `npm run dev`.

---

## Fase 1 · Dossier vivo y evidencia verificable

**Objetivo:** sustituir el seed editorial por conocimiento actualizado, trazable y revisado.

- Actualización editorial de fuentes oficiales (UNESCO, OIT, Banco Mundial, OCDE, gobiernos) con
  revisión humana y fecha de vigencia.
- Ingesta incremental a PostgreSQL (`documents`, `chunks`, `embeddings`, `source_health`) + búsqueda
  híbrida (BM25 + embeddings) con ventana de frescura.
- Pipeline de sanitización reforzado: normalización Unicode, eliminación de HTML/scripts, control de
  inyección de prompts, PII, duplicados y contenido de baja calidad.
- Panel de revisión humana: aprobar/descartar fragmentos, marcar vigencia y país.
- Citas con fuente, fecha de captura, nivel de confianza y enlace original en cada respuesta.
- Alertas de fuente caída y *fallback* al último snapshot aprobado.

**Métrica:** ≥ 90 % de respuestas del asistente con al menos 2 citas verificables y < 5 % de
fragmentos descartados por calidad.

---

## Fase 2 · Entrenador adaptativo de debate

**Objetivo:** convertir la práctica en un plan personal de mejora.

- Rúbrica híbrida: heurística (siempre disponible) + LLM opcional con salida estructurada y
  validación de esquema; nunca una nota sin evidencia textual.
- Dificultad adaptativa por criterio: el motor sube el nivel en fortalezas y refuerza debilidades.
- Preguntas con rol: apertura, contraargumento, punto de información, crisis, moderado y resolución.
- Modo voz (Web Speech API) con medición de muletillas, ritmo y tiempo de respuesta.
- Redacción de discurso de apertura y proyecto de resolución con plantillas MUN.
- Historial, tendencias por criterio, insights semanales y "deberes" de investigación.
- Banco de preguntas con revisión docente y etiquetado por subtema/dificultad.

**Métrica:** mejora medible ≥ 10 puntos en el criterio más débil tras 5 rondas; 100 % de
evaluaciones con feedback accionable.

---

## Fase 3 · Simulación multidelegado en tiempo real

**Objetivo:** entrenar el debate colectivo, no solo el monólogo.

- Salas por comisión con WebSockets, lista de oradores, mociones, caucus moderado/no moderado.
- Mesa directiva: cronómetro, reconocimiento de puntos de información, registro de votos.
- Negociación: grafo de alianzas, borradores colaborativos de resolución y detección de bloques.
- Moderación y seguridad: reglas de convivencia, reportes, límites de contenido y auditoría.
- Modo "solo práctica" con delegados sintéticos para quienes no tienen compañeros disponibles.

**Métrica:** 20 delegados simultáneos por sala con latencia p95 < 250 ms y cero pérdida de votos.

---

## Fase 4 · Producto, confianza y escala

**Objetivo:** operar el modelo completo con bajo costo y alto cumplimiento.

- Autenticación (magic link/OAuth), roles (delegado, docente, mesa), multi-modelo y multi-edición.
- i18n español/inglés/portugués, PWA offline para consultar el dossier en la sala.
- Observabilidad: trazas, métricas de cola, costo por respuesta, tablero de calidad y evaluación
  continua del asistente (golden set + revisión humana).
- Controles de costo LLM: caché semántica, presupuestos, degradación elegante al motor local.
- Despliegue: Neon + Upstash Redis + API en Render/Fly.io + web en Vercel/Cloudflare.
- Auditoría de accesibilidad, política de datos de menores, términos y guía de uso responsable.

**Métrica:** disponibilidad 99,5 % durante la semana del modelo, p95 de respuesta < 4 s, costo LLM
por delegado dentro del presupuesto y 0 incidentes de datos personales.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Scraping bloqueado o frágil | Snapshot aprobado + múltiples fuentes + salud de fuentes |
| Alucinación del asistente | Recuperación con citas, umbral de confianza, frase "no encontrado" |
| Evaluación injusta | Rúbrica transparente, evidencia textual, apelación y revisión docente |
| Dependencia de una API LLM | Motor heurístico y de recuperación 100 % local |
| Datos de menores | Minimización, sin cuentas de menores obligatorias, sin venta de datos |
| Sesgo cultural/lingüístico | Corpus multilingüe, pruebas con nombres y textos diversos, revisión humana |
