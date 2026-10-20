// Quick replies (D2): coded phrases, so an Urdu "Wait for me" arrives as Indonesian on an
// Indonesian phone with no internet (section 11). Codes are part of the wire protocol: never reuse.

export interface QuickReply {
  code: number;
  key: string;
  icon: string;
  /** Needs a meeting point to complete ("Meet at [pin]"). */
  needsPin?: boolean;
  /** Safety-critical text: professionally translated before release (section 11). */
  safety: boolean;
}

export const QUICK_REPLIES: QuickReply[] = [
  { code: 1, key: 'quick.1', icon: 'check-circle', safety: true },
  { code: 2, key: 'quick.2', icon: 'hand', safety: true },
  { code: 3, key: 'quick.3', icon: 'navigation', safety: true },
  { code: 4, key: 'quick.4', icon: 'map-pin', needsPin: true, safety: true },
  { code: 5, key: 'quick.5', icon: 'droplet', safety: true },
  { code: 6, key: 'quick.6', icon: 'heart-pulse', safety: true },
  { code: 7, key: 'quick.7', icon: 'battery-low', safety: true },
];

export const QUICK_IM_OK = 1;
export const QUICK_LOW_BATTERY = 7;

export function quickReply(code: number): QuickReply | undefined {
  return QUICK_REPLIES.find((q) => q.code === code);
}
