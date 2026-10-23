// Emergency number kinds (E5). The app shows the kind in the reader's language
// (`numbers.kinds.*`); the label names the service.
export const NUMBER_KINDS = ['emergency', 'police', 'ambulance', 'fire', 'rescue', 'tourist', 'child', 'women', 'disaster', 'other'] as const;
export type NumberKind = (typeof NUMBER_KINDS)[number];

/**
 * One line for an emergency number: "Police, Motorway Police" would repeat itself, so the kind is
 * left out when the label already starts with the kind's first word ("Police", "Fire brigade").
 */
export function numberLine(kindLabel: string, label: string): string {
  const first = kindLabel.trim().split(/\s+/)[0]?.toLocaleLowerCase() ?? '';
  if (!label.trim()) return kindLabel;
  return first && label.toLocaleLowerCase().includes(first) ? label : `${kindLabel}, ${label}`;
}
