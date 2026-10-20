import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { pushProfile } from '@/features/engine/boot';
import { CardEditor } from '@/features/profile/CardEditor';
import { Button, Header, Screen, Text } from '@/ui/components';

export default function CardScreen() {
  const { t } = useTranslation();
  return (
    <Screen
      footer={
        <Button
          label={t('common.save')}
          onPress={async () => {
            await pushProfile();
            router.back();
          }}
        />
      }>
      <Header title={t('card.title')} />
      <Text tone="muted">{t('onboarding.cardBody')}</Text>
      <CardEditor />
    </Screen>
  );
}
