// Power modes (H1) and battery guidance (E4, principle 3). Drain targets are the section 8
// hypotheses, to be replaced by week-2 measurements on the reference phones.

export type PowerMode = 'radar' | 'balanced' | 'standby' | 'ultra_saver';

export const POWER_MODES: { mode: PowerMode; updateSec: number; targetDrainPerHour: number; relay: boolean }[] = [
  { mode: 'radar', updateSec: 5, targetDrainPerHour: 6, relay: true },
  { mode: 'balanced', updateSec: 30, targetDrainPerHour: 3, relay: true },
  { mode: 'standby', updateSec: 300, targetDrainPerHour: 2, relay: true },
  { mode: 'ultra_saver', updateSec: 300, targetDrainPerHour: 1, relay: false },
];

/** Ultra-saver is offered automatically at 15 percent (E4). */
export const ULTRA_SAVER_OFFER_AT = 15;

export function shouldOfferUltraSaver(level: number, charging: boolean, mode: PowerMode): boolean {
  return !charging && level <= ULTRA_SAVER_OFFER_AT && mode !== 'ultra_saver';
}

/** Honest estimate of hours left in a mode at its target drain (principle 4: no fake precision). */
export function hoursLeft(level: number, mode: PowerMode): number {
  const m = POWER_MODES.find((p) => p.mode === mode)!;
  return Math.floor(Math.max(0, level) / m.targetDrainPerHour);
}
