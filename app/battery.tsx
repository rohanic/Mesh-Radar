import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { QUICK_LOW_BATTERY } from '@/core/engine/quickReplies';
import { hoursLeft } from '@/core/engine/power';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Button, Header, Screen, Text } from '@/ui/components';

/** Low-battery prompt (E4, flow 4): offer Ultra-saver and tell the group. */
export default function BatteryPrompt() {
  const { t } = useTranslation();
  const f = useFormat();
  const battery = useMesh((s) => s.battery);
  const groups = useMesh((s) => s.groups.filter((g) => !g.archived));
  const level = battery?.level ?? 15;
  return (
    <Screen>
      <Header title={t('battery.lowTitle', { level: f.number(level) })} />
      <Text>{t('battery.lowBody')}</Text>
      <Text tone="muted">{t('battery.hoursLeft', { count: hoursLeft(level, 'ultra_saver') })}</Text>
      <Button
        big
        icon="battery-low"
        label={t('battery.switch')}
        onPress={async () => {
          await MeshEngine.setPowerMode('ultra_saver');
          useMesh.setState({ health: await MeshEngine.health() });
          router.back();
        }}
      />
      <Button
        variant="secondary"
        icon="send"
        label={t('battery.tellGroup')}
        onPress={async () => {
          for (const g of groups) await MeshEngine.sendChat({ groupId: g.id, kind: 'quick', text: '', quickCode: QUICK_LOW_BATTERY }).catch(() => undefined);
        }}
      />
      <Button variant="ghost" label={t('battery.keep')} onPress={() => router.back()} />
    </Screen>
  );
}
