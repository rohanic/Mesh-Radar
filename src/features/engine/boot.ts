import { MeshEngine } from 'mesh-engine';
import { installCommunityPack } from '@/features/packs/packs';
import { nativeStrings } from '@/i18n';
import { refreshAll, startMeshBridge } from '@/state/mesh';
import { useProfile } from '@/state/profile';
import { usePurchases } from '@/state/purchases';
import { PlayStore } from 'play-store';

import { extra } from './config';

export { extra } from './config';

/** Once per app start: configure the engine, hand it translated strings, wire events, load state. */
let packListener = false;

export async function bootEngine(): Promise<void> {
  startMeshBridge();
  if (!packListener) {
    packListener = true;
    // Community packs shared by group members (v1.2).
    MeshEngine.addListener('pack', ({ json, fromName }) => void installCommunityPack(json, fromName));
  }
  // Members announce their real build number in a 16-bit field (MemberBody.appVersion).
  const appVersion = Math.min(Math.max(Math.round(PlayStore.versionCode()), 1), 0xffff);
  await MeshEngine.configure(extra.licencePublicKey ?? '', extra.apiBaseUrl ?? '', appVersion);
  await MeshEngine.setStrings(JSON.stringify(nativeStrings()));
  const tokens = usePurchases.getState().tokens;
  if (tokens.length) await MeshEngine.restoreLicences(tokens);
  await pushProfile();
  await refreshAll();
}

/** The engine keeps its own copy of the profile so announcements work with the UI closed. */
export async function pushProfile(): Promise<void> {
  const p = useProfile.getState();
  await MeshEngine.setProfile({ name: p.name, colour: p.colour, avatarPreset: p.avatarPreset, avatarPhoto: p.avatarPhoto, card: p.card });
  await MeshEngine.setLockScreenCard(p.cardOnLockScreen);
}

export async function refreshStrings(): Promise<void> {
  await MeshEngine.setStrings(JSON.stringify(nativeStrings()));
}

/** Map engine error codes to translation keys. */
export function errorKey(e: unknown): string {
  const code = (e as { code?: string })?.code;
  const known = ['not_leader', 'rate_limited', 'text_too_long', 'needs_pass', 'no_group', 'uwb_unsupported', 'bad_card', 'bad_code'];
  if (code && known.includes(code)) return `errors.${code}`;
  if (code && ['declined', 'timeout', 'invalid', 'group_limit', 'group_expired', 'bad_invite', 'group_full'].includes(code)) return `groups.reasons.${code}`;
  return 'errors.generic';
}
