// Pseudo-locale (section 11, tooling): accented, bracketed and about 40 percent longer, so clipped
// text and hard-coded strings (no brackets) stand out. Placeholders are kept intact.

const ACCENTS: Record<string, string> = {
  a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ç', n: 'ñ', y: 'ý',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', C: 'Ç', N: 'Ñ', Y: 'Ý',
};
const TOKEN = /(\{\{[^}]+\}\}|\{\w+\})/;

export function pseudo(text: string): string {
  if (!text) return text;
  const body = text
    .split(TOKEN)
    .map((part) => (TOKEN.test(part) ? part : part.replace(/[a-zA-Z]/g, (ch) => ACCENTS[ch] ?? ch)))
    .join('');
  const letters = text.replace(new RegExp(TOKEN, 'g'), '').length;
  return `[${body}${'~'.repeat(Math.ceil(letters * 0.4))}]`;
}

export function pseudoTree<T>(node: T): T {
  if (typeof node === 'string') return pseudo(node) as T;
  if (Array.isArray(node)) return node.map(pseudoTree) as T;
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, pseudoTree(v)])) as T;
  return node;
}
