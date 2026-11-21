# DebaMun · Google Search Console

Dominio de producción: **<https://debamun.vercel.app>**

La web es una SPA en Vercel. Google puede rastrearla, pero solo la **bienvenida** tiene contenido
público: el resto de rutas dependen de una sesión y se marcan como `noindex` a propósito.

## Lo que ya genera el build

| Pieza | Dónde | Comportamiento |
| --- | --- | --- |
| `robots.txt` | `apps/web/dist/robots.txt` | Permite `/` y `/bienvenida`; bloquea `/app/`, `/pais`, `/grado` y `/comision`. Incluye la línea `Sitemap`. |
| `sitemap.xml` | `apps/web/dist/sitemap.xml` | Contiene `/bienvenida`. Usa el dominio de `VITE_SITE_URL`. |
| Meta por ruta | `apps/web/src/lib/seo.ts` | Título, descripción, `robots` y `canonical` según la ruta, sin duplicar etiquetas. |
| Verificación | `apps/web/public/google46a80cbc3da94223.html` | Archivo de Search Console; se publica en la raíz del dominio al desplegar. |

El dominio ya está fijado en `apps/web/.env.production`:

```env
VITE_SITE_URL=https://debamun.vercel.app
```

Por eso `npm run build` genera `sitemap.xml` y los canonical sin configurar nada más. Si algún día
usas un dominio propio, define `VITE_SITE_URL` en Vercel: la variable del proyecto tiene prioridad
sobre el archivo.

## 1. Verificación: ya incluida

El archivo que entrega Search Console ya está en el repositorio:

```
apps/web/public/google46a80cbc3da94223.html
```

Vite lo copia a `dist/` y se publica en
<https://debamun.vercel.app/google46a80cbc3da94223.html>. No requiere variables de entorno: basta
con desplegar.

Si Google te entrega otro archivo en el futuro, guárdalo en `apps/web/public/` con el nombre exacto
que indique y vuelve a desplegar.

## 2. Añadir la propiedad en Search Console

1. Entra en <https://search.google.com/search-console>.
2. **Añadir propiedad → Prefijo de URL** y escribe `https://debamun.vercel.app/`.
3. Elige el método **Archivo HTML**. El archivo ya está en el repositorio
   (`apps/web/public/google46a80cbc3da94223.html`): despliega y confirma que responde en
   <https://debamun.vercel.app/google46a80cbc3da94223.html>.
4. Pulsa **Verificar**.

Alternativas válidas:

- **Etiqueta HTML:** define `VITE_GOOGLE_SITE_VERIFICATION=<valor de content>` en Vercel y
  redeploya; el build inyecta la etiqueta en el `<head>`.
- **Propiedad de dominio (DNS):** no sirve para `debamun.vercel.app` porque `vercel.app` es un
  dominio compartido. Solo aplica si algún día usas un dominio propio.

## 3. Enviar el sitemap

1. Confirma que estos dos responden con su contenido (no con el HTML de la SPA):
   - <https://debamun.vercel.app/robots.txt>
   - <https://debamun.vercel.app/sitemap.xml>
2. En Search Console: **Sitemaps → Añadir un sitemap** → `sitemap.xml` → **Enviar**.
3. En **Inspección de URL**, pega `https://debamun.vercel.app/bienvenida` y pulsa
   **Solicitar indexación**.

La primera indexación puede tardar de unos días a un par de semanas. No hace falta reenviar el
sitemap cada vez: Google vuelve a leerlo.

## 4. Qué esperar en los resultados

- Indexable: `/` (redirige a `/bienvenida`) y `/bienvenida`.
- Excluidas por `noindex`: `/grado`, `/pais`, `/comision`, `/app`, `/app/dossier`, `/app/debate`,
  `/app/investigacion` y la página 404.
- La API (`apps/api`) es otro proyecto de Vercel y no necesita Search Console: no tiene páginas
  públicas que indexar.

## Comprobación rápida

```powershell
Invoke-WebRequest https://debamun.vercel.app/robots.txt -UseBasicParsing | Select-Object -Expand Content
Invoke-WebRequest https://debamun.vercel.app/sitemap.xml -UseBasicParsing | Select-Object -Expand Content
(Invoke-WebRequest https://debamun.vercel.app/google46a80cbc3da94223.html -UseBasicParsing).Content

# Solo si verificas por etiqueta HTML en lugar del archivo:
(Invoke-WebRequest https://debamun.vercel.app/ -UseBasicParsing).Content | Select-String 'google-site-verification'
```

## Problemas frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `/robots.txt` o `/sitemap.xml` devuelven HTML | El deployment visible aún es el build anterior | Despliega los cambios actuales y vuelve a probar. |
| `/sitemap.xml` da 404 | Build sin `VITE_SITE_URL` | Comprueba `apps/web/.env.production` o defínela en Vercel. |
| Search Console no encuentra el archivo | El deployment no incluye `apps/web/public/` o aún no terminó | Abre la URL del archivo y comprueba que devuelve el texto `google-site-verification: …`. |
| Search Console no encuentra la etiqueta | Se verificó por etiqueta pero el token no estaba en el build | Define `VITE_GOOGLE_SITE_VERIFICATION`, **redeploya** y vuelve a verificar. |
