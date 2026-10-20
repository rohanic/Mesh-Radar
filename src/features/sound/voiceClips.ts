import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import type { LanguageCode } from '@/state/settings';

// Recorded voice clips for quick replies (section 11, DEC-032), for people who do not read.
// Clips are recorded by native speakers and none are invented. Add each one as
// `en: { 1: require('../../../assets/voice/en/1.m4a') }`; `npm run check:release` lists gaps.
export const VOICE_CLIPS: Partial<Record<LanguageCode, Partial<Record<number, number>>>> = {};

let player: AudioPlayer | null = null;

export function hasVoiceClip(lang: LanguageCode | null, code: number): boolean {
  return !!(lang && VOICE_CLIPS[lang]?.[code]);
}

export function playVoiceClip(lang: LanguageCode | null, code: number): boolean {
  const clip = lang ? VOICE_CLIPS[lang]?.[code] : undefined;
  if (!clip) return false;
  player?.remove();
  player = createAudioPlayer(clip);
  player.play();
  return true;
}
