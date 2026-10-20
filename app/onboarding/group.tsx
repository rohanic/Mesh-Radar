import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/state/settings';
import { Button, Header, Screen, Text } from '@/ui/components';

/** Flow 1, step 5: create a group (big QR) or join one. */
export default function GroupStep() {
  const { t } = useTranslation();
  const set = useSettings((s) => s.set);
  const skip = () => {
    set({ onboarding: 'tutorial' });
    router.replace('/onboarding/tutorial');
  };
  return (
    <Screen footer={<Button variant="ghost" label={t('common.skip')} onPress={skip} />}>
      <Header title={t('onboarding.groupTitle')} back={false} />
      <Text tone="muted">{t('onboarding.groupBody')}</Text>
      <Button big testID="onb-create" icon="plus" label={t('onboarding.createGroup')} onPress={() => router.push({ pathname: '/group/new', params: { onboarding: '1' } })} />
      <Button big testID="onb-join" variant="secondary" icon="qr-code" label={t('onboarding.joinGroup')} onPress={() => router.push({ pathname: '/group/join', params: { onboarding: '1' } })} />
    </Screen>
  );
}
