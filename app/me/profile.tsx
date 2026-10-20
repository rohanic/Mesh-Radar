import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { pushProfile } from '@/features/engine/boot';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { Button, Header, Screen } from '@/ui/components';

export default function ProfileScreen() {
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
      <Header title={t('me.profile')} />
      <ProfileEditor />
    </Screen>
  );
}
