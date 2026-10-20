import { z } from 'zod';

// Event pack format (F1, F2). Packs are JSON, under 2 MB each, verified at build time and bundled
// with the app so they work offline from the first launch; updates come signed from the Worker.

export const LANGS = ['en', 'ur', 'ar', 'hi', 'bn', 'id', 'ms', 'tr'] as const;
export type Lang = (typeof LANGS)[number];

export const LocalizedSchema = z
  .object({ en: z.string().min(1) })
  .catchall(z.string())
  .refine((o) => Object.keys(o).every((k) => (LANGS as readonly string[]).includes(k)), { message: 'unknown language key' });
export type Localized = z.infer<typeof LocalizedSchema>;

export const Category = z.enum(['pilgrimage', 'festival', 'sport', 'music', 'outdoors', 'emergency']);

export const PackDate = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: LocalizedSchema.optional(),
  /** Dates from a lunar or lunisolar calendar, or not yet announced by organisers. */
  approx: z.boolean(),
});

export const EventPackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  category: Category,
  colors: z.tuple([z.string().regex(/^#[0-9A-Fa-f]{6}$/), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]),
  icon: z.string(),
  countries: z.array(z.string().length(2)).min(1),
  languages: z.array(z.enum(LANGS)).min(1),
  title: LocalizedSchema,
  summary: LocalizedSchema,
  dates: z.array(PackDate),
  meetingPoints: z.array(z.object({ name: LocalizedSchema, detail: LocalizedSchema })).min(1),
  dos: z.array(LocalizedSchema).min(1),
  donts: z.array(LocalizedSchema).min(1),
  schedule: z.array(z.object({ title: LocalizedSchema, detail: LocalizedSchema })),
  phrasebook: z.array(z.object({ meaning: LocalizedSchema, phrase: z.string(), lang: z.string(), transliteration: z.string().optional() })),
  checklist: z.array(LocalizedSchema).min(1),
  sources: z.array(z.string().url()),
  verified: z.boolean(),
  /** Community-made packs (v1.2) carry their author and are never "verified". */
  community: z.object({ author: z.string(), createdAtMs: z.number() }).optional(),
});
export type EventPack = z.infer<typeof EventPackSchema>;

export const MAX_PACK_BYTES = 2 * 1024 * 1024;

/** The 12 launch packs (F1), in the order the Events tab lists them. */
export const LAUNCH_PACKS = [
  'hajj',
  'umrah',
  'arbaeen',
  'raiwind-ijtema',
  'muharram',
  'kumbh-magh-mela',
  'durga-puja',
  'rath-yatra',
  'stadium',
  'concerts',
  'trekking',
  'flood-blackout',
] as const;

export function text(l: Localized | undefined, lang: string | null | undefined): string {
  if (!l) return '';
  return (lang && (l as Record<string, string>)[lang]) || l.en;
}

/** Days until a date range starts: 0 while it runs, negative after it ends. */
export function countdownDays(start: string, end: string, nowMs: number): number {
  const day = 86_400_000;
  const today = Math.floor(nowMs / day);
  const s = Math.floor(Date.parse(`${start}T00:00:00Z`) / day);
  const e = Math.floor(Date.parse(`${end}T00:00:00Z`) / day);
  if (today < s) return s - today;
  if (today <= e) return 0;
  return -1;
}

/** The next date range that has not ended, if any. */
export function nextDate(p: Pick<EventPack, 'dates'>, nowMs: number) {
  return [...p.dates].sort((a, b) => a.start.localeCompare(b.start)).find((d) => countdownDays(d.start, d.end, nowMs) >= 0) ?? null;
}
