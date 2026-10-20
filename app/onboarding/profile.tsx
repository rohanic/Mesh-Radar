import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { pushProfile } from '@/features/engine/boot';
import { ProfileEditor } from '@/features/profile/ProfileEditor';
import { track } from '@/features/telemetry/telemetry';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { Button, Header, Screen } from '@/ui/components';

export default function ProfileStep() {
  const { t } = useTranslation();
  const name = useProfile((s) => s.name);
  const set = useSettings((s) => s.set);
  return (
    <Screen
      footer={
        <Button
          testID="profile-next"
          label={t('common.continue')}
          disabled={!name.trim()}
          onPress={async () => {
            await pushProfile().catch(() => undefined);
            set({ onboarding: 'card' });
            track('onboarding_step', { step: 'profile' });
            router.replace('/onboarding/card');
          }}
        />
      }>
      <Header title={t('onboarding.profileTitle')} back={false} />
      <ProfileEditor />
    </Screen>
  );
}
