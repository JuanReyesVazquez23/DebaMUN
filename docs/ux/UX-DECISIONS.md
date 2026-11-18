# DebaMun · Decisiones de UX

> Principio: el delegado no quiere "un chatbot". Quiere **llegar a la sala sabiendo qué defiende y
> cómo responder cuando le pregunten lo incómodo**.

## 1. Usuario y contexto de uso

- **Quién:** estudiantes de secundaria que representan un país en la conferencia 2026, con 1–3 semanas de
  preparación y poco tiempo por sesión.
- **Dónde:** casa, biblioteca o aula, muchas veces en móvil y con conexión irregular.
- **Qué le preocupa:** no saber la postura de su país, no tener datos, quedarse sin argumentos y ser
  evaluado sin entender por qué.
- **Qué no necesita:** otro panel con veinte métricas ni un asistente que escriba el discurso por él.

## 2. Promesa de la interfaz

1. **Siempre sé qué hacer ahora.** El panel termina en una ruta de cuatro pasos, no en un gráfico.
2. **Toda afirmación tiene origen.** Las respuestas muestran fuente, dominio y confianza.
3. **La nota es explicable.** Cada criterio trae la frase que lo justifica y una acción concreta.
4. **Nada se repite.** Cada pregunta es nueva dentro de la sesión; el contador lo hace visible.

## 3. Flujos

### Onboarding (4 pantallas, una decisión por pantalla)

```
[Tu nombre] → [Tu grado] → [Tu país] → [Tu comisión] → [Panel]
```

- Una sola pregunta por pantalla, con el valor explicado al lado.
- El grado se elige por etapas (primaria 1.º–6.º, secundaria 1.º–6.º y universidad); el nivel de
  debate sugerido se resalta sin preseleccionar la dificultad.
- El país se elige con búsqueda y filtro por región; la tarjeta muestra bandera, región y una muestra
  de la paleta para anticipar el tema visual.
- Escocia lleva la nota "No es Estado miembro de la ONU" en la propia tarjeta, no escondida en el
  dossier.
- La comisión se elige con el tópico y la pregunta esencial a la vista, no solo con el nombre.
- **Ninguna comisión está preseleccionada** ni se etiqueta como recomendada: se listan en orden
  alfabético, comparten la misma rúbrica y reciben el mismo nivel de detalle y de fuentes.
- Si el delegado ya tiene sesión, `/bienvenida` redirige al panel: no se le obliga a repetir pasos.

### Panel

- Saludo + resumen del país en una frase: contexto inmediato.
- Datos del día en un panel con cuatro hechos y rotación al siguiente bloque: contexto útil, no relleno.
- La bandera del país vive en el topbar, junto al nombre: identidad permanente sin robar espacio al panel.
- Readiness con checks ponderados y explicación de qué falta.
- Progreso del debate con media, mejor y última intervención + historial corto.
- "Qué haría ahora": cuatro acciones ordenadas por impacto.
- Tópico de la comisión con subtemas y dos salidas: dossier o asistente.

### Dossier

- Cabecera con identidad, capital, lenguas y condición de miembro.
- Navegación sticky por secciones (postura, contexto, perfil ONU, tips, datos, fuentes).
- Postura primero: es lo que el delegado necesita para hablar.
- Vulnerabilidad y palanca en paralelo: reconocer debilidad y ofrecer valor.
- Líneas rojas con acento cálido: son límites, no sugerencias.
- Fuentes al final, siempre visibles y enlazadas.

### Debate

- La pregunta ocupa el centro; el tipo y la dificultad son visibles.
- La estructura sugerida está **antes** de escribir: reduce la página en blanco.
- Temporizador con pausa y reinicio: entrena el ritmo real, no presiona para enviar.
- La rúbrica está a la vista durante la respuesta: el delegado sabe qué se le pide.
- Después de enviar: puntaje total, cuatro criterios con evidencia y consejo, fortalezas y mejoras.
- "Siguiente pregunta" es la única acción primaria tras evaluar: no se mezcla con edición.

### Investigación

- La conversación empieza con un texto que explica qué puede y qué no puede hacer el asistente.
- Cada respuesta muestra confianza y proveedor; las fuentes van debajo, no escondidas.
- Preguntas sugeridas tras cada respuesta para mantener el ritmo.
- Panel lateral con prompts de alto valor y límites explícitos.
- Enter envía, Shift+Enter hace salto de línea; el botón queda deshabilitado con menos de 3 caracteres.

## 4. Sistema visual

- **Papel cálido** (`#f5f0e6`) y tinta casi negra: lectura larga sin fatiga, tono editorial y
  diplomático, no "dashboard SaaS".
- **Serif para títulos y citas**, sans para interfaz: jerarquía clara y sensación de documento.
- **Color del país** en acentos, bordes y marca; el comité aporta un segundo acento (azul UNESCO,
  verde ECOSOC).
- **Marca:** podio de tres niveles con corbata negra sobre placa crema; la silueta no cambia entre
  temas para conservar el contraste de la corbata.
- **Modo claro/oscuro:** preferencia del sistema como valor inicial, conmutador Sol/Luna en el
  topbar y en el onboarding, persistencia en `localStorage` y variables de país recalibradas para
  fondo oscuro (`themeVars`).
- **Tinta sobre color** se calcula por contraste WCAG (`readableOn`), no se fija a mano: cualquier
  paleta nueva sigue siendo legible.
- **Radios generosos y sombras suaves**: tarjetas que se pueden tocar, no cajas duras.
- **Reglas finas y etiquetas en versalitas**: estructura sin ruido.

## 5. Accesibilidad (WCAG 2.2 AA)

- Contraste mínimo 4.5:1 en texto y 3:1 en elementos gráficos; el acento del país se ajusta con
  `--country-deep` cuando se usa como texto.
- Foco visible con `:focus-visible` y anillo de 2 px; nunca se elimina el outline.
- Enlace "Saltar al contenido" como primer elemento del shell.
- Navegación completa por teclado; los `button` son botones reales, no divs.
- `aria-live="polite"` en evaluaciones y cambios de estado; `role="alert"` en errores.
- Etiquetas explícitas en campos; el contador de palabras no es la única señal de longitud.
- `prefers-reduced-motion` desactiva animaciones y scroll suave.
- Responsive real: barra inferior en móvil, sin menús que se solapen con el contenido.
- Objetivos táctiles ≥ 36 px en navegación y acciones principales.
- Idioma del documento en español (`lang="es"`) y fechas localizadas.

## 6. Microcopy

| Situación | Texto |
| --- | --- |
| Nombre vacío | "Necesito al menos dos caracteres para dirigirme a ti." |
| País no elegido | Botón deshabilitado: "Elige un país". |
| Respuesta muy corta | "Escribe al menos una oración completa (12 caracteres). La rúbrica necesita contenido real." |
| API caída | "No pude contactar con el servidor. Comprueba que la API está en marcha en el puerto 4000." |
| Sin evidencia | "No encontré evidencia suficiente… Para no inventar, te propongo verificar directamente en [fuente]." |
| Confianza baja | "Hay poca coincidencia con el corpus; contrasta antes de citar en la sala." |
| Tiempo agotado | "Tiempo agotado: en la sala te llamarían al orden." |

Reglas: segunda persona, frases cortas, verbos de acción, cero culpa. Los errores dicen qué pasó y
qué hacer, no "algo salió mal".

## 7. Estados

- **Cargando:** bloque con spinner y texto específico ("Preparando tu panel…"), no un spinner mudo.
- **Vacío:** explica qué falta y cuál es el siguiente paso.
- **Error:** mensaje + botón "Reintentar"; en onboarding se conserva lo escrito.
- **Éxito:** la evaluación se revela con scroll automático y `aria-live`, sin modal que tape el
  contexto.

## 8. Decisiones descartadas

| Idea | Por qué no |
| --- | --- |
| Login con correo | Fricción y datos personales innecesarios para una herramienta de un día. |
| Chat único que hace todo | Mezcla preparación, práctica y evaluación; el delegado no sabe dónde está. |
| Nota única sin desglose | No enseña nada y genera desconfianza. |
| Preguntas aleatorias sin control | Repiten y rompen la sensación de progreso. |
| Ocultar la rúbrica | Convierte la evaluación en caja negra y favorece el "escribir mucho". |
| Tour de bienvenida con overlays | El onboarding ya explica el producto haciendo, no leyendo. |

## 9. Métricas de experiencia (Fase 0)

- Tiempo hasta la primera intervención evaluada: objetivo < 4 minutos desde el nombre.
- % de delegados que completan los tres pasos: objetivo > 85 %.
- % de sesiones con ≥ 3 intervenciones: objetivo > 50 %.
- % de consultas al asistente con al menos 2 fuentes: objetivo > 90 %.
- Comprensión de la nota: prueba con 5 delegados — "¿por qué sacaste este puntaje?" debe responderse
  con la evidencia mostrada.
