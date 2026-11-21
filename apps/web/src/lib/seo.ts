/**
 * Metadatos por ruta. Solo la bienvenida es indexable: el resto de la aplicación
 * depende de una sesión y no aporta contenido público a los buscadores.
 */
export interface PageMeta {
  title: string;
  description: string;
  index: boolean;
}

const DESCRIPTION =
  'DebaMun es una mesa de preparación para modelos de las Naciones Unidas: elige tu país y comisión, recibe un dossier con fuentes, practica el debate y evalúa tu discurso.';

const WELCOME_META: PageMeta = {
  title: 'DebaMun · Preparación para modelos de las Naciones Unidas',
  description: DESCRIPTION,
  index: true,
};

const PAGES: Record<string, PageMeta> = {
  // `/` redirige a `/bienvenida`: comparte metadatos y canonical para no dividir señales.
  '/': WELCOME_META,
  '/bienvenida': WELCOME_META,
  '/grado': {
    title: 'Elige tu grado · DebaMun',
    description: DESCRIPTION,
    index: false,
  },
  '/pais': {
    title: 'Elige tu delegación · DebaMun',
    description: DESCRIPTION,
    index: false,
  },
  '/comision': {
    title: 'Elige tu comisión · DebaMun',
    description: DESCRIPTION,
    index: false,
  },
};

const APP_META: PageMeta = {
  title: 'Tu mesa de preparación · DebaMun',
  description: DESCRIPTION,
  index: false,
};

const NOT_FOUND_META: PageMeta = {
  title: 'Esta sala no existe · DebaMun',
  description: DESCRIPTION,
  index: false,
};

/** Dominio público sin barra final. Vacío si aún no se configuró `VITE_SITE_URL`. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');

export function metaForPath(pathname: string): PageMeta {
  const route = pathname.replace(/\/+$/, '') || '/';
  return PAGES[route] ?? (route.startsWith('/app') ? APP_META : NOT_FOUND_META);
}

export function canonicalForPath(pathname: string): string | null {
  if (!SITE_URL) return null;
  const route = pathname === '/' ? '/bienvenida' : pathname.replace(/\/+$/, '');
  return `${SITE_URL}${route}`;
}

function upsertMeta(name: string, content: string): void {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const element = existing ?? document.createElement('meta');
  if (!existing) {
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Actualiza las etiquetas del `<head>` en el sitio, sin duplicarlas: el HTML
 * inicial ya trae `index.html` y Google puede leer la versión estática.
 */
export function applyPageMeta(meta: PageMeta, canonical: string | null): void {
  document.title = meta.title;
  upsertMeta('description', meta.description);
  upsertMeta('robots', meta.index ? 'index,follow' : 'noindex,nofollow');

  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    existing?.remove();
    return;
  }

  const link = existing ?? document.createElement('link');
  if (!existing) {
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonical);
}
