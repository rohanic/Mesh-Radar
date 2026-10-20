import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useFormat } from '@/i18n/format';
import { startMesh } from '@/features/permissions/permissions';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Button, Card, Chip, Header, ListRow, Notice, Row, Screen, Section, Toggle } from '@/ui/components';

/** Mesh health sheet (section 6): phones in range, hops, last sync, radios. */
export default function HealthScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const health = useMesh((s) => s.health);
  const engine = useMesh((s) => s.engine);
  const running = !!engine?.running;
  const radios = engine?.radios;
  const ago = (ms: number) => (ms > 0 ? f.time(ms) : t('mesh.never'));
  return (
    <Screen>
      <Header title={t('mesh.title')} />
      <Card>
        <Toggle
          testID="mesh-toggle"
          label={t('mesh.startStop')}
          value={running}
          onChange={async (on) => {
            if (on) {
              if (!(await startMesh())) router.push('/onboarding/permissions');
            } else await MeshEngine.stop();
            useMesh.setState({ engine: await MeshEngine.state() });
          }}
        />
        <ListRow title={t('mesh.phonesInRange')} subtitle={f.number(health?.neighbours ?? 0)} icon="smartphone" />
        <ListRow title={t('mesh.maxHops')} subtitle={f.number(health?.maxHops ?? 0)} icon="route" />
        <ListRow title={t('mesh.lastSync')} subtitle={ago(health?.lastSyncMs ?? 0)} icon="refresh" />
        <ListRow title={t('mesh.queued')} subtitle={f.number(health?.stored ?? 0)} icon="layers" />
        <ListRow title={t('mesh.relayedForOthers')} subtitle={f.number(health?.relayedForOthers ?? 0)} icon="award" />
      </Card>
      <Card>
        <Toggle label={t('mesh.relay')} hint={t('mesh.relayHint')} value={health?.relayEnabled ?? true} onChange={(v) => void MeshEngine.setRelay(v).then(() => MeshEngine.health()).then((h) => useMesh.setState({ health: h }))} />
      </Card>
      {radios ? (
        <Section title={t('mesh.radios')}>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label={t('radar.bluetooth')} icon="bluetooth" selected={radios.bluetooth} onPress={() => void MeshEngine.openSettings('bluetooth')} />
            <Chip label={t('radar.wifi')} icon="wifi" selected={radios.wifi} onPress={() => void MeshEngine.openSettings('wifi')} />
            <Chip label={t('radar.locationService')} icon="locate" selected={radios.location} onPress={() => void MeshEngine.openSettings('location')} />
          </Row>
          {!radios.bleExtended ? <Notice text={t('mesh.bleUnsupported')} /> : null}
          {!radios.playServices ? <Notice tone="warning" text={t('mesh.noPlayServices')} /> : null}
        </Section>
      ) : null}
      <Button variant="secondary" icon="battery" label={t('power.title')} onPress={() => router.push('/me/power')} />
      <Button variant="ghost" label={t('oem.title')} onPress={() => router.push('/me/keep-running')} />
    </Screen>
  );
}
