# DebaMun · Despliegue en Vercel

> Dos proyectos de Vercel sobre el mismo repositorio: **web** (estático) y **API** (función
> serverless). La base de datos va en **Neon**. No hay servicios adicionales que mantener.

## 1. Arquitectura desplegada

```
Vercel · proyecto web (apps/web)
  └─ dist/ estático + rewrites SPA
        │  VITE_API_URL=https://<api>.vercel.app/api
        ▼
Vercel · proyecto API (apps/api)
  └─ src/main.ts  →  NestJS zero-config  (una sola función)
        │
        ├─ Neon PostgreSQL (DATABASE_URL)
        └─ Upstash Redis (opcional, solo caché con REDIS_URL)
```

| Pieza | ¿Vercel? | Motivo |
| --- | --- | --- |
| Web React/Vite | Sí | Build estático + rewrites para React Router. |
| API NestJS | Sí, como función | Se compila con `tsc` y se carga una sola vez por instancia. |
| PostgreSQL | Neon | Serverless, con pooler y SSL. |
| Redis/BullMQ | Upstash (opcional) | Sin Redis, caché y cola quedan en memoria por instancia. En Vercel la cola BullMQ no corre: no hay worker persistente. |

El asistente responde con el corpus editorial incluido en la API: dossiers de país, base de
conocimiento y briefing de comisión.

---

## 2. Base de datos en Neon

1. Crea un proyecto en [Neon](https://neon.tech) y una base `debamun`.
2. Copia la cadena **con pooler** (host con `-pooler`) y añade `?sslmode=require`.
3. Aplica el esquema desde tu máquina:

```powershell
$env:DATABASE_URL = "postgresql://usuario:password@ep-xxx-pooler.us-east-2.aws.neon.tech/debamun?sslmode=require"
$env:DATABASE_SSL = "true"
node scripts/setup-db.mjs
Remove-Item Env:DATABASE_URL, Env:DATABASE_SSL
```

Debe terminar con `Esquema aplicado: 10 tablas en public.`

---

## 3. Proyecto API en Vercel

1. **Add New → Project** e importa este repositorio.
2. **Root Directory:** `apps/api`.
3. Framework Preset: **NestJS**. `apps/api/vercel.json` lo fuerza con `"framework": "nestjs"`:
   sin eso, Vercel detecta Vite (está en `devDependencies` por Vitest) y el build falla.
4. Build Command y Output: los toma de `apps/api/vercel.json`:
   - `npm run build && node ../../scripts/prepare-api-deploy.mjs`
   - sin salida estática (solo funciones).
5. Variables de entorno (Production):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Cadena de Neon con `?sslmode=require` |
| `DATABASE_SSL` | `true` |
| `DATABASE_POOL_MAX` | `3` (pocas conexiones por instancia) |
| `WEB_ORIGIN` | `https://<tu-web>.vercel.app` (varios orígenes separados por coma) |
| `NODE_ENV` | `production` |
| `REDIS_URL` | Vacío, o la URL `rediss://...` de Upstash (solo caché compartida) |
| `JOBS_WORKER` | Vacío en Vercel: BullMQ necesita un worker persistente |
| `DATA_DIR` | Vacío (el corpus se copia a `apps/api/data`) |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | Opcionales |

6. Deploy. Si cambias o añades variables de entorno después, lanza un **nuevo deployment**:
   Vercel no aplica variables nuevas a un deployment ya creado. Comprueba:

```powershell
Invoke-RestMethod https://<api>.vercel.app/api/health
```

Respuesta esperada sin Redis:

```json
{
  "status": "ok",
  "corpus": { "countries": 35, "committees": ["ECOSOC", "UNESCO"] },
  "services": {
    "database": "up",
    "cache": "memory",
    "queue": "inline",
    "llm": "disabled"
  }
}
```

Si `database` dice `memory`, la API arrancó sin `DATABASE_URL` válida.

### Qué hace la configuración

- `src/main.ts` es el punto de entrada detectado por Vercel: NestJS se empaqueta como una sola
  función y Express recibe todas las rutas `/api/*`. Debe importar `@nestjs/core` directamente:
  el detector de Vercel busca ese import para reconocer la app.
- Vercel compila con TypeScript y conserva `design:paramtypes`; la inyección de dependencias
  funciona igual que en local.
- La app Nest se construye una vez por instancia y se reutiliza entre invocaciones.
- `scripts/prepare-api-deploy.mjs` copia `data/{topics.json,organizations.json,countries,knowledge}` a
  `apps/api/data` en cada build (esa carpeta está ignorada por git).
- El empaquetador de funciones (Node File Trace) incluye `apps/api/data/**` en la función.
  `functions[...].includeFiles` **no** sirve aquí: Vercel solo admite esa clave para funciones
  dentro de `api/`, no para el entrypoint generado por el preset NestJS.
- `rewrites` manda `/` a `/api/health` para que la raíz del proyecto API no devuelva 404.

> Si el deploy falla con “No se encontró el corpus”, revisa que el Build Command haya ejecutado
> `prepare-api-deploy.mjs` y que `apps/api/data` exista antes del empaquetado.

> `vercel dev` no sirve para esta API: compila con tsx/esbuild, que no emite metadatos de
> decoradores, y Nest no puede resolver dependencias. Para desarrollo usa `npm run start:dev`.

---

## 4. Proyecto web en Vercel

1. **Add New → Project** con el mismo repositorio.
2. **Root Directory:** `apps/web`.
3. Framework Preset: **Vite** (build `npm run build`, output `dist`).
4. Variable de entorno (Production y Preview):

```env
VITE_API_URL=https://<api>.vercel.app/api
```

Incluye `/api` al final. Vite la incrusta en el build: si la cambias, hay que **redeployar**.

5. Deploy. `apps/web/vercel.json` ya aporta:
   - Rewrite de SPA (`/* → /index.html`) para que `/app/debate` no devuelva 404 al recargar.
   - Caché inmutable para `/assets/*`.
   - Cabeceras `nosniff`, `Referrer-Policy`, `X-Frame-Options` y `Permissions-Policy`.

6. Vuelve al proyecto API y actualiza `WEB_ORIGIN` con el dominio final de la web. Los cambios de
   variables de entorno en Vercel requieren **Redeploy** para aplicarse.

### Orden recomendado

```
Neon → API → copiar URL de API → Web → copiar URL de Web → WEB_ORIGIN en API → redeploy API
```

---

## 5. Verificación posterior

1. `GET https://<api>.vercel.app/api/health` → `database: up`, 35 países.
2. Abre la web y completa nombre → país → comisión.
3. Recarga en `/app/debate`: debe seguir funcionando (rewrite SPA).
4. Envía una intervención y comprueba que se guarda (dashboard con `turns > 0`).
5. Haz una pregunta al asistente: debe citar fuentes del corpus local.
6. Prueba las dos comisiones: **UNESCO** y **ECOSOC**.

---

## 6. Límites y decisiones

- **Cold start:** la primera petición tras inactividad puede tardar 1–3 s (Nest + pool + corpus).
- **Rate limit y caché en memoria:** son por instancia, no globales. Para un evento pequeño es
  suficiente; con Redis de Upstash pasan a ser compartidos.
- **Corpus editorial estático:** el asistente cita dossiers y guías incluidas en el repositorio; para
  actualizar un dato se edita `data/` y se redeploya.
- **Pool de Neon:** mantén `DATABASE_POOL_MAX=3` y usa la cadena con `-pooler`.
- **Datos de menores:** no se recogen correos ni teléfonos; el `delegateId` vive en `localStorage`.

## 7. Problemas frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| 404 al recargar `/app/...` | Falta el rewrite SPA | Comprueba `apps/web/vercel.json` y que el root sea `apps/web`. |
| `database: memory` | `DATABASE_URL` ausente o inválida | Cárgala en Vercel y redeploya. |
| Error CORS en el navegador | `WEB_ORIGIN` no incluye el dominio web | Añádelo (sin barra final) y redeploya la API. |
| `No se encontró el corpus` | Build sin copiar `data/` | Revisa que el Build Command ejecute `prepare-api-deploy.mjs`. |
| Timeout 504 | Cold start o consulta pesada | Reintenta; sube el timeout en **Settings → Functions** del proyecto API. |
| La web llama a `localhost:4000` | `VITE_API_URL` no definida en el build | Defínela y redeploya la web. |

## 8. Alternativa: API fuera de Vercel

Si prefieres procesos persistentes (Redis/BullMQ reales y caché compartida), despliega `apps/api` en
Render, Railway o Fly con Docker o buildpack. En ese caso:

- Web sigue en Vercel con `VITE_API_URL=https://<api>/api`.
- API usa las mismas variables (`DATABASE_URL`, `DATABASE_SSL`, `WEB_ORIGIN`).
- Con `REDIS_URL` definido, activa `JOBS_WORKER=1` para el worker de BullMQ.
- El esquema de Neon no cambia.

El corpus viaja con la API (`scripts/prepare-api-deploy.mjs` o `DATA_DIR`), así que el asistente no
necesita ningún servicio extra.
