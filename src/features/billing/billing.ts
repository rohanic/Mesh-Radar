import { endConnection, getAvailablePurchases, initConnection, type Purchase } from 'expo-iap';

import { ORGANISER_PRODUCTS, PLANS } from '@/core/engine/tiers';
import { extra } from '@/features/engine/config';
import { track } from '@/features/telemetry/telemetry';
import { MeshEngine } from 'mesh-engine';
import { refreshEntitlements } from '@/state/mesh';
import { usePurchases } from '@/state/purchases';

// Play Billing through expo-iap (DEC-021). The Worker verifies each purchase with Google Play and
// returns a signed licence; the engine checks it offline and shares it with the group over the
// mesh (section 10, rule 2). The app never grants a tier on its own.

export const ONE_TIME_SKUS = [...PLANS.filter((p) => p.kind === 'one_time').map((p) => p.productId), ...ORGANISER_PRODUCTS.map((p) => p.productId)];
export const SUB_SKUS = PLANS.filter((p) => p.kind === 'subscription').map((p) => p.productId);

async function post<T>(path: string, body: unknown): Promise<T | null> {
  if (!extra.apiBaseUrl) return null;
  try {
    const r = await fetch(`${extra.apiBaseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Exchange a Play purchase for a licence and install it. Returns true when a licence arrived. */
export async function redeem(p: Purchase): Promise<boolean> {
  if (!p.purchaseToken) return false;
  const { signPk } = await MeshEngine.identity();
  const res = await post<{ licence: string }>('/v1/licence', {
    productId: p.productId,
    purchaseToken: p.purchaseToken,
    kind: SUB_SKUS.includes(p.productId) ? 'subs' : 'in-app',
    signPk,
  });
  if (!res?.licence) return false;
  await MeshEngine.importLicence(res.licence);
  usePurchases.getState().addToken(res.licence);
  await refreshEntitlements();
  track('purchase', { tier: p.productId });
  return true;
}

export async function restore(): Promise<number> {
  let n = 0;
  try {
    await initConnection();
    for (const p of (await getAvailablePurchases()) ?? []) if (await redeem(p)) n++;
  } catch {
    // Offline or Play unavailable.
  } finally {
    await endConnection().catch(() => undefined);
  }
  return n;
}

/** Rule 3: a free 14-day Event Pass for a first major pilgrimage, once per identity. */
export async function claimFirstPilgrimage(eventId: string): Promise<boolean> {
  const { signPk } = await MeshEngine.identity();
  const res = await post<{ licence: string }>('/v1/licence/first-pilgrimage', { signPk, eventId });
  if (!res?.licence) return false;
  await MeshEngine.importLicence(res.licence);
  usePurchases.getState().addToken(res.licence);
  usePurchases.getState().set({ firstPilgrimageClaimed: true });
  await refreshEntitlements();
  return true;
}

/** Organiser certificate for signed crowd alerts at one event (E8). */
export async function requestOrganiserCert(eventId: string, name: string): Promise<boolean> {
  const licence = usePurchases.getState().tokens.at(-1);
  if (!licence) return false;
  const eventPk = await MeshEngine.eventPublicKey(eventId);
  const res = await post<{ cert: string }>('/v1/organiser/cert', { licence, eventPk, eventId, name });
  if (!res?.cert) return false;
  const certs = usePurchases.getState().organiserCerts;
  usePurchases.getState().set({ organiserCerts: { ...certs, [eventId]: res.cert } });
  return true;
}
