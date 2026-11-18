import { useMemo } from 'react';

/**
 * Banderas SVG incluidas en el bundle: funcionan sin red y se ven igual en todos los sistemas.
 * Windows no dibuja banderas como emoji, así que el par de letras del código no sirve aquí.
 */
const FLAGS = import.meta.glob('../assets/flags/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Escocia no es un código ISO 3166-1, pero flagcdn la publica como país del Reino Unido. */
const ALIASES: Record<string, string> = { SCT: 'gb-sct' };

interface CountryFlagProps {
  code: string;
  /** Si se indica, la bandera se anuncia con ese nombre a lectores de pantalla. */
  name?: string;
  className?: string;
}

export function CountryFlag({ code, name, className }: CountryFlagProps) {
  const source = useMemo(() => {
    const file = ALIASES[code.toUpperCase()] ?? code.toLowerCase();
    return FLAGS[`../assets/flags/${file}.svg`];
  }, [code]);

  const classes = className ? `country-flag ${className}` : 'country-flag';

  if (!source) {
    return (
      <span className={`${classes} country-flag--fallback`} aria-hidden="true">
        {code.toUpperCase()}
      </span>
    );
  }

  return (
    <span className={classes}>
      <img
        src={source}
        alt={name ? `Bandera de ${name}` : ''}
        aria-hidden={name ? undefined : true}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
