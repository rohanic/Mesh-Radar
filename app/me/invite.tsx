import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space } from '@/core/theme/tokens';
import { extra } from '@/features/engine/config';
import { QRCode } from '@/ui/components/QRCode';
import { Button, Card, Header, Screen, Text } from '@/ui/components';

const STORE = 'https://play.google.com/store/apps/details?id=com.rohanic.meshradar';

/** Offline invite (G8): Play Store Quick Share steps, plus a QR to the store page. */
export default function Invite() {
  const { t } = useTranslation();
  const url = extra.playStoreUrl || STORE;
  return (
    <Screen>
      <Header title={t('invite.title')} />
      <Text>{t('invite.body')}</Text>
      <Card>
        <Text weight="bold">{t('invite.quickShare')}</Text>
        <Text tone="muted">{t('invite.quickShareSteps')}</Text>
        <Button icon="share" label={t('invite.quickShare')} onPress={() => void Linking.openURL('market://details?id=com.rohanic.meshradar').catch(() => Linking.openURL(url))} />
      </Card>
      <Card>
        <Text weight="bold">{t('invite.storeQr')}</Text>
        <View style={{ alignItems: 'center', padding: space.md, backgroundColor: '#FFFFFF', borderRadius: 20 }}>
          <QRCode value={url} size={240} label={t('invite.storeQr')} />
        </View>
      </Card>
    </Screen>
  );
}
