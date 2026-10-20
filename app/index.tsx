import { Redirect } from 'expo-router';

import { useSettings } from '@/state/settings';

export default function Index() {
  const step = useSettings((s) => s.onboarding);
  const elder = useSettings((s) => s.elderMode);
  if (step !== 'done') return <Redirect href={`/onboarding/${step}`} />;
  return <Redirect href={elder ? '/elder' : '/(tabs)'} />;
}
