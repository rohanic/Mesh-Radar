import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QUICK_IM_OK } from '@/core/engine/quickReplies';
import { useTheme } from '@/core/theme/ThemeProvider';
import { space } from '@/core/theme/tokens';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { recordCheckin } from '@/state/social';
import { Button, Notice, Text } from '@/ui/components';

/** Elder mode (H3): larger text and three big buttons: Find family, Call for help, I'm OK. */
export default function ElderHome() {
  const { t } = useTranslation();
  const theme = useTheme();
  const groups = useMesh((s) => s.groups.filter((g) => !g.archived));
  const set = useSettings((s) => s.set);
  const [sent, setSent] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, padding: space.xl, gap: space.xl, justifyContent: 'center' }}>
      <Text variant="headline" align="center">
        {t('app.name')}
      </Text>
      <Button big testID="elder-find" icon="users" label={t('elder.findFamily')} style={{ minHeight: 96 }} onPress={() => router.push('/(tabs)')} />
      <Button big testID="elder-help" variant="sos" icon="siren" label={t('elder.callHelp')} style={{ minHeight: 96 }} onPress={() => router.push('/sos?fire=1')} />
      <Button
        big
        testID="elder-ok"
        variant="secondary"
        icon="check-circle"
        label={t('elder.imOk')}
        style={{ minHeight: 96 }}
        onPress={async () => {
          for (const g of groups) await MeshEngine.sendChat({ groupId: g.id, kind: 'quick', text: '', quickCode: QUICK_IM_OK }).catch(() => undefined);
          recordCheckin();
          setSent(true);
        }}
      />
      {sent ? <Notice tone="success" text={t('elder.sent')} /> : null}
      <View style={{ marginTop: space.xl }}>
        <Button variant="ghost" label={t('elder.exit')} onPress={() => set({ elderMode: false })} />
      </View>
    </SafeAreaView>
  );
}
