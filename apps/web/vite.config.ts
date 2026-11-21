import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Rutas públicas que pueden aparecer en Google. El resto es noindex. */
const INDEXABLE = ['/bienvenida']

/**
 * Genera `robots.txt` y `sitemap.xml` en el build e inyecta el token de
 * Google Search Console cuando existe `VITE_GOOGLE_SITE_VERIFICATION`.
 */
function seoPlugin(siteUrl: string, verification: string): Plugin {
  const base = siteUrl.replace(/\/+$/, '')
  const robots = [
    'User-agent: *',
    'Allow: /$',
    ...INDEXABLE.map((route) => `Allow: ${route}`),
    'Disallow: /app/',
    'Disallow: /pais',
    'Disallow: /grado',
    'Disallow: /comision',
    '',
    ...(base ? [`Sitemap: ${base}/sitemap.xml`, ''] : []),
  ].join('\n')

  const sitemap = base
    ? [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...INDEXABLE.map(
          (route) =>
            `  <url>\n    <loc>${base}${route}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`,
        ),
        '</urlset>',
        '',
      ].join('\n')
    : ''

  return {
    name: 'debamun-seo',
    transformIndexHtml(html) {
      const tags = []
      if (verification) {
        tags.push({
          tag: 'meta',
          attrs: { name: 'google-site-verification', content: verification },
          injectTo: 'head' as const,
        })
      }
      return { html, tags }
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      if (sitemap) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    env.SITE_URL ||
    env.VITE_SITE_URL ||
    ''
  ).trim()
  const verification = (
    process.env.GOOGLE_SITE_VERIFICATION ||
    process.env.VITE_GOOGLE_SITE_VERIFICATION ||
    env.GOOGLE_SITE_VERIFICATION ||
    env.VITE_GOOGLE_SITE_VERIFICATION ||
    ''
  ).trim()

  return {
    plugins: [react(), seoPlugin(siteUrl, verification)],
  }
})
