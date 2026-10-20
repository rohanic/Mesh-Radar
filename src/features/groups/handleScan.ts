import { router } from 'expo-router';

import { MeshEngine } from 'mesh-engine';
import { refreshGroups } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { track } from '@/features/telemetry/telemetry';
import { errorKey } from '@/features/engine/boot';

export const INVITE_PREFIX = 'meshradar://join/';
export const FOUND_PREFIX = 'meshradar://found/';
export const PLAY_PREFIX = 'https://play.google.com/';

/** Route a scanned code: group invite (B1), lost-child card (E6), or nothing we know. */
export async function handleScanned(data: string, onboarding: boolean): Promise<string | null> {
  if (data.startsWith(INVITE_PREFIX)) {
    try {
      const g = await MeshEngine.joinByInvite(data);
      await refreshGroups();
      useSettings.getState().set({ activeGroupId: g.id });
      track('group_joined', { method: 'qr' });
      if (onboarding) {
        useSettings.getState().set({ onboarding: 'tutorial' });
        router.replace('/onboarding/tutorial');
      } else router.replace('/');
      return null;
    } catch (e) {
      return errorKey(e);
    }
  }
  if (data.startsWith(FOUND_PREFIX)) {
    router.replace({ pathname: '/found/[payload]', params: { payload: data.slice(FOUND_PREFIX.length) } });
    return null;
  }
  return 'groups.reasons.bad_invite';
}
