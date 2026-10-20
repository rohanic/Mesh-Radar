import { useTranslation } from 'react-i18next';

import { POWER_MODES, hoursLeft, type PowerMode } from '@/core/engine/power';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Card, Header, Row, Screen, Text } from '@/ui/components';
import { Icon } from '@/ui/icons/Icon';

/** Power modes (H1) with honest drain targets (principle 3, section 8). */
export default function PowerScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const health = useMesh((s) => s.health);
  const battery = useMesh((s) => s.battery);
  const current = health?.powerMode ?? 'balanced';
  const choose = async (mode: PowerMode) => {
    await MeshEngine.setPowerMode(mode);
    useMesh.setState({ health: await MeshEngine.health() });
  };
  return (
    <Screen>
      <Header title={t('power.title')} />
      {POWER_MODES.map((m) => (
        <Card key={m.mode} tone={m.mode === current ? 'accent' : undefined} onPress={() => void choose(m.mode)} accessibilityLabel={t(`power.${m.mode}`)}>
          <Row>
            <Text variant="title" style={{ flex: 1 }}>
              {t(`power.${m.mode}`)}
            </Text>
            {m.mode === current ? <Icon name="check-circle" /> : null}
          </Row>
          <Text tone="muted">{t(`power.${m.mode}Hint`)}</Text>
          <Text variant="caption" tone="muted">
            {t('power.target', { n: f.number(m.targetDrainPerHour) })}
          </Text>
          {battery ? (
            <Text variant="caption" weight="bold">
              {t('battery.hoursLeft', { count: hoursLeft(battery.level, m.mode) })}
            </Text>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
