import { useMemo } from 'react';

import { formatDistance, toNumerals, type Numerals, type Units } from '@/core/engine/units';
import { useSettings, type LanguageCode } from '@/state/settings';

function group(n: number): string {
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export interface Formatter {
  number: (n: number) => string;
  distance: (m: number) => string;
  time: (ms: number) => string;
  date: (ms: number) => string;
  dateTime: (ms: number) => string;
  digits: (s: string) => string;
}

export function makeFormatter(lang: LanguageCode, units: Units, numerals: Numerals): Formatter {
  const tag = `${lang}-u-nu-latn`;
  const ext = lang === 'ur';
  const dt = (opts: Intl.DateTimeFormatOptions) => {
    let f: Intl.DateTimeFormat;
    try {
      f = new Intl.DateTimeFormat(tag, opts);
    } catch {
      f = new Intl.DateTimeFormat('en', opts);
    }
    const latin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    return (ms: number) => toNumerals(latin(f.format(new Date(ms))), numerals, ext);
  };
  return {
    number: (n) => toNumerals(group(n), numerals, ext),
    distance: (m) => formatDistance(m, units, numerals, ext),
    time: dt({ hour: 'numeric', minute: '2-digit' }),
    date: dt({ day: 'numeric', month: 'short', year: 'numeric' }),
    dateTime: dt({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    digits: (s) => toNumerals(s, numerals, ext),
  };
}

/** Numbers, distances and dates in the person's units and numeral system (section 11). */
export function useFormat(): Formatter {
  const lang = useSettings((s) => s.language) ?? 'en';
  const units = useSettings((s) => s.units);
  const numerals = useSettings((s) => s.numerals);
  return useMemo(() => makeFormatter(lang, units, numerals), [lang, units, numerals]);
}
