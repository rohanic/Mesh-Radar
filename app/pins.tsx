import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { distanceM } from '@/core/engine/geo';
import { errorKey } from '@/features/engine/boot';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Button, Card, Field, Header, IconButton, ListRow, Notice, Row, Screen, Text } from '@/ui/components';

/** Meeting-point editor (C6): the leader drops named pins; they sync over the mesh. */
export default function PinsScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const { group: groupId } = useLocalSearchParams<{ group: string }>();
  const detail = useMesh((s) => s.details[groupId]);
  const own = useMesh((s) => s.own);
  const [name, setName] = useState('');
  const [floor, setFloor] = useState('0');
  const [error, setError] = useState<string | null>(null);
  if (!detail) return null;
  return (
    <Screen>
      <Header title={t('pins.title')} />
      {detail.pins.length === 0 ? <Text tone="muted">{t('pins.empty')}</Text> : null}
      {detail.pins.map((p) => (
        <Card key={p.id}>
          <ListRow
            icon="map-pin"
            title={p.name}
            subtitle={own ? f.distance(distanceM(own, p)) : undefined}
            onPress={() => router.push({ pathname: '/find', params: { lat: String(p.lat), lon: String(p.lon), label: p.name } })}
            right={detail.isLeader ? <IconButton icon="trash" label={t('common.delete')} onPress={() => void MeshEngine.deletePin(groupId, p.id)} /> : undefined}
          />
        </Card>
      ))}
      {detail.isLeader ? (
        <Card>
          <Field label={t('pins.name')} placeholder={t('pins.namePlaceholder')} value={name} onChangeText={setName} maxLength={60} />
          <Field label={t('pins.floor')} value={floor} onChangeText={setFloor} keyboardType="numbers-and-punctuation" maxLength={3} />
          {!own ? <Notice text={t('pins.needFix')} /> : null}
          {error ? <Notice tone="warning" text={error} /> : null}
          <Row>
            <Button
              style={{ flex: 1 }}
              icon="map-pin"
              label={t('pins.add')}
              disabled={!own || !name.trim()}
              onPress={async () => {
                try {
                  await MeshEngine.setPin({ groupId, name: name.trim(), lat: own!.lat, lon: own!.lon, floor: Number(floor) || 0, icon: 0 });
                  setName('');
                } catch (e) {
                  setError(t(errorKey(e)));
                }
              }}
            />
          </Row>
        </Card>
      ) : (
        <Notice text={t('pins.leaderOnly')} />
      )}
    </Screen>
  );
}
