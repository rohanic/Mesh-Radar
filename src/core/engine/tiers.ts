// Monetization (section 10). Relaying and every safety feature are free forever; people pay for
// bigger groups, longer trips and memories. Prices shown in the app come from Google Play in the
// local currency; these are the USD base prices for reference.

export type Tier = 'free' | 'event_pass' | 'family_plus' | 'organiser';

export interface Plan {
  tier: Tier;
  productId: string;
  kind: 'one_time' | 'subscription';
  usd: number;
  days: number;
}

/** Play product IDs. Create them in Play Console with exactly these IDs (docs/setup.md). */
export const PLANS: Plan[] = [
  { tier: 'event_pass', productId: 'event_pass_14d', kind: 'one_time', usd: 3.99, days: 14 },
  { tier: 'family_plus', productId: 'family_plus_yearly', kind: 'subscription', usd: 14.99, days: 365 },
];

/** Organiser (v1.2): $0.20 per member per event, $10 minimum, sold in roster sizes. */
export const ORGANISER_PRODUCTS = [
  { productId: 'organiser_50', members: 50, usd: 10 },
  { productId: 'organiser_100', members: 100, usd: 20 },
  { productId: 'organiser_250', members: 250, usd: 50 },
  { productId: 'organiser_500', members: 500, usd: 100 },
] as const;

export function organiserPriceUsd(members: number): number {
  return Math.max(10, Math.round(members * 0.2 * 100) / 100);
}

export const COSMETICS = [
  { productId: 'avatars_pilgrims', usd: 1.99 },
  { productId: 'radar_skin_night', usd: 0.99 },
  { productId: 'badge_frames_gold', usd: 0.99 },
] as const;

export const FREE_PACK_LIMIT = 3;

export type Feature =
  | 'big_group'
  | 'all_packs'
  | 'breadcrumbs'
  | 'separation_alerts'
  | 'memories'
  | 'family_circle'
  | 'multiple_groups'
  | 'organiser_tools'
  // Never gated (rule 1): listed so the UI can assert it.
  | 'sos'
  | 'last_crumb'
  | 'find_mode'
  | 'emergency_numbers'
  | 'relay';

// DEC-027: separation alerts protect Elders and Children, so they are free in every tier.
export const ALWAYS_FREE: Feature[] = ['sos', 'last_crumb', 'find_mode', 'emergency_numbers', 'relay', 'separation_alerts'];

export interface EntitlementFlags {
  maxMembers: number;
  maxActiveGroups: number;
  allPacks: boolean;
  breadcrumbs: boolean;
  separationAlerts: boolean;
  memories: boolean;
  familyCircle: boolean;
  organiser: boolean;
}

export function canUse(feature: Feature, e: EntitlementFlags): boolean {
  switch (feature) {
    case 'big_group':
      return e.maxMembers > 6;
    case 'all_packs':
      return e.allPacks;
    case 'breadcrumbs':
      return e.breadcrumbs;
    case 'memories':
      return e.memories;
    case 'family_circle':
      return e.familyCircle;
    case 'multiple_groups':
      return e.maxActiveGroups > 1;
    case 'organiser_tools':
      return e.organiser;
    default:
      return true;
  }
}

/** Free users keep any 3 packs; emergency numbers in every pack stay free (rule 1). */
export function canDownloadPack(downloadedIds: string[], packId: string, e: EntitlementFlags): boolean {
  if (e.allPacks || downloadedIds.includes(packId)) return true;
  return downloadedIds.length < FREE_PACK_LIMIT;
}

/** Rule 3: a free 14-day Event Pass for a first major pilgrimage. */
export const FIRST_PILGRIMAGE_EVENTS = ['hajj', 'umrah', 'arbaeen', 'kumbh-magh-mela'];
