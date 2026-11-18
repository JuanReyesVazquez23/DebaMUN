/** Quita etiquetas HTML, caracteres de control y normaliza espacios. */
export function sanitizeUserText(input: string, maxLength = 6000): string {
  return input
    .normalize('NFC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Normaliza para comparar sin acentos ni mayúsculas. */
export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function wordCount(value: string): number {
  return (value.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

export function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

const STOP_WORDS = new Set(
  [
    'a','al','algo','algunas','algunos','ante','antes','como','con','contra','cual','cuando','de','del','desde','donde','dos','el','ella','ellas','ellos','en','entre','era','es','esa','ese','eso','esta','este','esto','fue','ha','hacia','hasta','hay','la','las','le','les','lo','los','más','me','mi','mis','mucho','muy','no','nos','o','otra','otro','para','pero','poco','por','porque','que','qué','quien','quién','se','ser','si','sí','sin','sobre','son','su','sus','también','tanto','te','tiene','todo','tu','un','una','uno','y','ya','debe','deben','puede','pueden','cómo','cuál','cuáles','este','esta','estos','estas',
  ].map(normalizeForMatch),
);

export function contentTokens(value: string): string[] {
  return (value.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(normalizeForMatch)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item));
}
