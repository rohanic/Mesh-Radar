import { useRef, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/ThemeProvider';
import { space } from '@/core/theme/tokens';
import { handleScanned } from '@/features/groups/handleScan';
import { Button, Header, Notice, Text } from '@/ui/components';

/** QR scanner (section 6, global): group invites and lost-child cards. Camera asked on first scan. */
export default function ScanScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const [perm, requestPerm] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg, padding: space.lg, gap: space.md }}>
      <Header title={t('scan.title')} />
      <Text tone="muted">{t('scan.hint')}</Text>
      {!perm?.granted ? (
        <>
          <Notice tone="warning" text={t('errors.camera')} />
          <Button label={t('onboarding.permAllow')} onPress={() => void requestPerm()} />
        </>
      ) : (
        <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={async ({ data }) => {
              if (busy.current) return;
              busy.current = true;
              const err = await handleScanned(data, onboarding === '1');
              if (err) setError(t(err));
              setTimeout(() => (busy.current = false), 1500);
            }}
          />
        </View>
      )}
      {error ? <Notice tone="warning" text={error} /> : null}
    </SafeAreaView>
  );
}
