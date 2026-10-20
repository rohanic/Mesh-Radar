import * as Network from 'expo-network';

import { EventPackSchema, MAX_PACK_BYTES, type EventPack } from '@/core/packs/schema';
import { canDownloadPack, type EntitlementFlags } from '@/core/engine/tiers';
import { extra } from '@/features/engine/config';
import { track } from '@/features/telemetry/telemetry';
import { MeshEngine } from 'mesh-engine';
import { usePacks } from '@/state/packs';
import bundled from './bundled.json';

/** The 12 launch packs ship inside the app, so they work offline from the first launch (F1). */
export function bundledPacks(): EventPack[] {
  return (bundled as unknown[]).map((p) => EventPackSchema.parse(p));
}

export function packSizeKB(p: EventPack): number {
  return Math.max(1, Math.round(JSON.stringify(p).length / 1024));
}

export type InstallResult = 'installed' | 'limit' | 'invalid';

/**
 * Install a pack: a newer signed copy from the Worker when online (F2: downloadable before the
 * event), otherwise the copy bundled with the app. Free users keep any 3 packs (section 10).
 */
export async function installPack(id: string, ent: EntitlementFlags): Promise<InstallResult> {
  const state = usePacks.getState();
  if (!canDownloadPack(Object.keys(state.installed), id, ent)) return 'limit';
  let pack = bundledPacks().find((p) => p.id === id) ?? null;
  const online = await Network.getNetworkStateAsync().then((s) => !!s.isInternetReachable).catch(() => false);
  if (online && extra.apiBaseUrl) {
    try {
      const base = extra.apiBaseUrl.replace(/\/$/, '');
      const [body, sig] = await Promise.all([
        fetch(`${base}/v1/packs/${id}.json`).then((r) => (r.ok ? r.text() : null)),
        fetch(`${base}/v1/packs/${id}.sig`).then((r) => (r.ok ? r.text() : null)),
      ]);
      if (body && sig && body.length <= MAX_PACK_BYTES && (await MeshEngine.verifySignature(body, sig.trim()))) {
        const remote = EventPackSchema.safeParse(JSON.parse(body));
        if (remote.success && (!pack || remote.data.version >= pack.version)) pack = remote.data;
      }
    } catch {
      // Offline or server error: keep the bundled copy.
    }
  }
  if (!pack) return 'invalid';
  state.install(pack);
  track('pack_downloaded', { packId: id });
  return 'installed';
}

/** Community-made packs (v1.2) arrive over the mesh; they are always marked unverified. */
export function installCommunityPack(json: string, author: string): EventPack | null {
  try {
    const parsed = EventPackSchema.safeParse({ ...JSON.parse(json), verified: false, community: { author, createdAtMs: Date.now() } });
    if (!parsed.success) return null;
    usePacks.getState().install(parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}
