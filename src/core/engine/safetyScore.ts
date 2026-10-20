// Safety Ready score (G5): turns preparation into progress.

export interface ReadinessInput {
  hasName: boolean;
  hasAvatar: boolean;
  cardFilled: boolean;
  inGroup: boolean;
  packDownloaded: boolean;
  drillDone: boolean;
  permissionsGranted: boolean;
  tutorialDone: boolean;
}

export const READINESS_WEIGHTS: Record<keyof ReadinessInput, number> = {
  hasName: 10,
  hasAvatar: 5,
  cardFilled: 20,
  inGroup: 15,
  packDownloaded: 15,
  drillDone: 15,
  permissionsGranted: 10,
  tutorialDone: 10,
};

export interface Readiness {
  score: number;
  missing: (keyof ReadinessInput)[];
}

export function readiness(input: ReadinessInput): Readiness {
  let score = 0;
  const missing: (keyof ReadinessInput)[] = [];
  for (const key of Object.keys(READINESS_WEIGHTS) as (keyof ReadinessInput)[]) {
    if (input[key]) score += READINESS_WEIGHTS[key];
    else missing.push(key);
  }
  // Highest-value steps first.
  missing.sort((a, b) => READINESS_WEIGHTS[b] - READINESS_WEIGHTS[a]);
  return { score, missing };
}

/** The emergency card counts as filled with a contact and one medical field. */
export function cardFilled(card: { bloodGroup: string; conditions: string; medicines: string; contactPhone: string }): boolean {
  return card.contactPhone.trim().length > 0 && (card.bloodGroup.trim() + card.conditions.trim() + card.medicines.trim()).length > 0;
}
