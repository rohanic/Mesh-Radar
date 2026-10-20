// Emergency number kinds (E5). The app shows the kind in the reader's language
// (`numbers.kinds.*`); the label names the service.
export const NUMBER_KINDS = ['emergency', 'police', 'ambulance', 'fire', 'rescue', 'tourist', 'child', 'women', 'disaster', 'other'] as const;
export type NumberKind = (typeof NUMBER_KINDS)[number];
