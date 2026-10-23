import { usePathname } from 'expo-router';

import { useSettings } from '@/state/settings';

/** Routes where the floating SOS button would get in the way. */
export const NO_FLOATING_SOS = ['/sos', '/alert', '/find', '/onboarding', '/elder', '/scan'];

/** Height the floating SOS button needs above a screen's footer buttons, so it never covers them. */
export const FLOATING_SOS_CLEARANCE = 80;

/** Whether the floating SOS button shows on the current screen (every screen after onboarding, E1). */
export function useFloatingSos(): boolean {
  const path = usePathname();
  const done = useSettings((s) => s.onboarding === 'done');
  return done && !NO_FLOATING_SOS.some((p) => path.startsWith(p));
}
