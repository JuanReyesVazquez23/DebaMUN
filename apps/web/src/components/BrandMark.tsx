/**
 * Marca de DebaMun: un podio de tres niveles con una corbata negra encima.
 * El fondo crema y la silueta oscura se mantienen iguales en ambos temas para
 * que la corbata negra nunca pierda contraste.
 */
export function BrandMark({ className = 'brand__mark' }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 32 32" role="presentation" focusable="false">
        <path d="M13.1 2.4h5.8l-1 3.1h-3.8z" />
        <path d="M13.5 6.5h5l1.2 6.4L16 16.4l-3.7-3.5z" />
        <rect x="12.7" y="18.5" width="6.6" height="10.6" rx="1.4" />
        <rect x="4.2" y="23" width="6.6" height="6.1" rx="1.4" />
        <rect x="21.2" y="21.3" width="6.6" height="7.8" rx="1.4" />
      </svg>
    </span>
  );
}
