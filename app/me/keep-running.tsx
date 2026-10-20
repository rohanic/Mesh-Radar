import { useTranslation } from 'react-i18next';

import { currentBrand, openAppSettings, openBatterySettings } from '@/features/oem/oem';
import { useSettings } from '@/state/settings';
import { Button, Card, Header, Screen, Text } from '@/ui/components';

/** Per-brand "keep Mesh Radar running" guide (section 8, risk table). */
export default function KeepRunning() {
  const { t } = useTranslation();
  const brand = currentBrand();
  const set = useSettings((s) => s.set);
  return (
    <Screen>
      <Header title={t('oem.title')} />
      <Text>{t('onboarding.keepRunningBody')}</Text>
      <Card tone="accent">
        <Text weight="bold">{t(`oem.${brand}`)}</Text>
      </Card>
      {brand !== 'generic' ? (
        <Card>
          <Text tone="muted">{t('oem.generic')}</Text>
        </Card>
      ) : null}
      <Button icon="battery" label={t('oem.openBattery')} onPress={() => void openBatterySettings()} />
      <Button variant="secondary" icon="settings" label={t('oem.openApp')} onPress={() => void openAppSettings()} />
      <Text variant="caption" tone="muted">
        {t('oem.source')}
      </Text>
      <Button variant="ghost" label={t('common.done')} onPress={() => set({ oemGuideSeen: true })} />
    </Screen>
  );
}
