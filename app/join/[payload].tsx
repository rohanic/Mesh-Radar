import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { INVITE_PREFIX, handleScanned } from '@/features/groups/handleScan';
import { useSettings } from '@/state/settings';
import { Header, Notice, Screen, Text } from '@/ui/components';

/** meshradar://join/... opened from another QR app (B1). */
export default function JoinLink() {
  const { t } = useTranslation();
  const { payload } = useLocalSearchParams<{ payload: string }>();
  const onboarding = useSettings((s) => s.onboarding !== 'done');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void handleScanned(INVITE_PREFIX + payload, onboarding).then((e) => e && setError(t(e)));
  }, [payload, onboarding, t]);
  return (
    <Screen>
      <Header title={t('groups.joinTitle')} />
      {error ? <Notice tone="warning" text={error} /> : <Text tone="muted">{t('common.loading')}</Text>}
    </Screen>
  );
}
