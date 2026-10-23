import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PRIVACY_URL, TERMS_URL } from '@/features/engine/config';
import { optOut } from '@/features/telemetry/telemetry';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { usePrompts } from '@/state/prompts';
import { useProfile } from '@/state/profile';
import { usePurchases } from '@/state/purchases';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Button, Card, Header, ListRow, Notice, Screen, Text, Toggle } from '@/ui/components';


/** Privacy (section 9): opt-in analytics and crashes, DND access, and Delete everything (H4). */
export default function PrivacyScreen() {
  const { t } = useTranslation();
  const s = useSettings();
  const engine = useMesh((st) => st.engine);
  return (
    <Screen>
      <Header title={t('privacy.title')} />
      <Text>{t('privacy.body')}</Text>
      <Card>
        <Toggle
          label={t('privacy.analytics')}
          hint={t('privacy.analyticsHint')}
          value={s.analyticsOptIn}
          onChange={(v) => {
            s.set({ analyticsOptIn: v });
            if (!v) optOut();
          }}
        />
        <Toggle label={t('privacy.crashes')} hint={t('privacy.crashesHint')} value={s.crashOptIn} onChange={(v) => s.set({ crashOptIn: v })} />
      </Card>
      <Card>
        <ListRow icon="bell" title={t('privacy.dnd')} subtitle={t('privacy.dndHint')} right={engine?.dndAccess ? <Text tone="success">{t('common.on')}</Text> : undefined} onPress={() => void MeshEngine.openSettings('dnd')} />
        <ListRow icon="siren" title={t('privacy.fullScreen')} onPress={() => void MeshEngine.openSettings('fullscreen')} />
        <ListRow icon="book-open" title={t('privacy.policy')} onPress={() => void Linking.openURL(PRIVACY_URL)} />
        <ListRow icon="landmark" title={t('privacy.terms')} onPress={() => void Linking.openURL(TERMS_URL)} />
      </Card>
      <Notice tone="warning" text={t('privacy.deleteAllBody')} />
      <Button
        variant="secondary"
        icon="trash"
        testID="delete-everything"
        label={t('privacy.deleteAll')}
        onPress={() =>
          Alert.alert(t('privacy.deleteAll'), t('privacy.deleteConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: async () => {
                // H4: works offline and is instant. Keys, groups and history are wiped by the engine.
                await MeshEngine.wipe();
                useProfile.getState().reset();
                usePacks.getState().reset();
                useSocial.getState().reset();
                usePrompts.getState().reset();
                usePurchases.getState().reset();
                optOut();
                useSettings.getState().reset();
                useMesh.setState({ groups: [], details: {}, messages: {}, alerts: [], crumbs: [], sos: { own: null, incoming: [], publicNearby: [] } });
                router.replace('/onboarding/language');
              },
            },
          ])
        }
      />
    </Screen>
  );
}
