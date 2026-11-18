import type { ReactNode } from 'react';

/**
 * El asistente responde en texto plano con marcas de énfasis (`**…**`) y la fuente entre `_( … )_`.
 * Se convierten en elementos reales para que nadie lea los asteriscos.
 */
function renderInline(text: string, key: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|_\((.+?)\)_/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const token = match[1] !== undefined ? match[1] : (match[2] ?? '').trim();
    parts.push(
      match[1] !== undefined ? (
        <strong key={`${key}-b${match.index}`}>{token}</strong>
      ) : (
        <em key={`${key}-i${match.index}`}>{token}</em>
      ),
    );
    cursor = pattern.lastIndex;
    match = pattern.exec(text);
  }

  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

/** Líneas en blanco separan bloques; cada línea con contenido es un párrafo. */
export function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={`br-${index}`} />;

        const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
        if (heading) {
          return (
            <p key={`p-${index}`}>
              <strong>{renderInline(heading[1] ?? '', `l${index}`)}</strong>
            </p>
          );
        }

        const bullet = trimmed.match(/^[-*]\s+(.*)$/);
        if (bullet) {
          return <p key={`p-${index}`}>• {renderInline(bullet[1] ?? '', `l${index}`)}</p>;
        }

        return <p key={`p-${index}`}>{renderInline(trimmed, `l${index}`)}</p>;
      })}
    </>
  );
}
