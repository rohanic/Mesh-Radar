import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { pushProfile } from '@/features/engine/boot';
import { CardEditor } from '@/features/profile/CardEditor';
import { useSettings } from '@/state/settings';
import { Button, Header, Screen, Text } from '@/ui/components';

/** Can skip; nudged later (flow 1, step 3). */
export default function CardStep() {
  const { t } = useTranslation();
  const set = useSettings((s) => s.set);
  const next = async () => {
    await pushProfile().catch(() => undefined);
    set({ onboarding: 'permissions' });
    router.replace('/onboarding/permissions');
  };
  return (
    <Screen
      footer={
        <>
          <Button testID="card-next" label={t('common.continue')} onPress={next} />
          <Button variant="ghost" label={t('common.skip')} onPress={next} />
        </>
      }>
      <Header title={t('onboarding.cardTitle')} back={false} />
      <Text tone="muted">{t('onboarding.cardBody')}</Text>
      <CardEditor />
    </Screen>
  );
}
