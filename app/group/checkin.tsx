import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { distanceM } from '@/core/engine/geo';
import { freshness } from '@/core/engine/freshness';
import { errorKey } from '@/features/engine/boot';
import { useFormat } from '@/i18n/format';
import { MeshEngine, type CheckpointDef } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { recordCheckin } from '@/state/social';
import { Avatar } from '@/ui/components/Avatar';
import { Button, Card, Chip, Field, Header, ListRow, Notice, Row, Screen, Section, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

const HOURS = [1, 2, 4, 8];

/** Check-ins (E7, flow 5): personal timers, the leader's trek plan, and the search view. */
export default function Checkins() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useMesh((s) => s.details[id]);
  const own = useMesh((s) => s.own);
  const myId = useMesh((s) => s.myId);
  const [plan, setPlan] = useState<CheckpointDef[]>([]);
  const [cpName, setCpName] = useState('');
  const [planHours, setPlanHours] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  if (!detail) return null;
  const c = detail.checkin;
  const myTimer = c.timers[myId];
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(t(errorKey(e)));
    }
  };

  return (
    <Screen>
      <Header title={t('checkin.title')} />
      <Card>
        <Text variant="title">{t('checkin.timerTitle')}</Text>
        <Text tone="muted">{t('checkin.timerBody')}</Text>
        {myTimer ? (
          <>
            <Text weight="bold">{t('checkin.timerFor', { time: f.dateTime(myTimer) })}</Text>
            <Button variant="secondary" label={t('checkin.cancelTimer')} onPress={() => void run(() => MeshEngine.cancelCheckinTimer(id))} />
          </>
        ) : (
          <Row style={{ flexWrap: 'wrap' }}>
            {HOURS.map((h) => (
              <Chip key={h} label={t('checkin.inHours', { n: f.number(h) })} onPress={() => void run(() => MeshEngine.setCheckinTimer(id, now + h * 3_600_000))} />
            ))}
          </Row>
        )}
        <Button
          icon="check-circle"
          label={t('checkin.checkInNow')}
          onPress={() =>
            void run(async () => {
              await MeshEngine.checkIn(id, -1);
              recordCheckin();
            })
          }
        />
      </Card>

      {c.checkpoints.length ? (
        <Card>
          <Text variant="title">{t('checkin.planTitle')}</Text>
          {c.planDeadlineMs ? <Text tone="muted">{t('checkin.timerFor', { time: f.dateTime(c.planDeadlineMs) })}</Text> : null}
          {c.checkpoints.map((cp, i) => (
            <ListRow
              key={i}
              icon="flag"
              title={cp.name}
              subtitle={own ? f.distance(distanceM(own, cp)) : undefined}
              right={(c.progress[myId] ?? -1) >= i ? <Text tone="success">{t('checkin.checkedIn')}</Text> : <Chip label={t('checkin.checkInNow')} onPress={() => void run(() => MeshEngine.checkIn(id, i))} />}
            />
          ))}
        </Card>
      ) : null}

      {detail.isLeader ? (
        <Card>
          <Text variant="title">{t('checkin.planTitle')}</Text>
          <Text tone="muted">{t('checkin.planBody')}</Text>
          {plan.map((cp, i) => (
            <Text key={i}>
              {i + 1}. {cp.name}
            </Text>
          ))}
          <Field label={t('pins.name')} value={cpName} onChangeText={setCpName} maxLength={60} />
          <Button
            variant="secondary"
            icon="plus"
            label={t('checkin.addCheckpoint')}
            disabled={!own || !cpName.trim()}
            onPress={() => {
              setPlan([...plan, { name: cpName.trim(), lat: own!.lat, lon: own!.lon, radiusM: 80 }]);
              setCpName('');
            }}
          />
          <Text weight="bold">{t('checkin.deadline')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {[2, 4, 8, 12].map((h) => (
              <Chip key={h} label={t('checkin.inHours', { n: f.number(h) })} selected={planHours === h} onPress={() => setPlanHours(h)} />
            ))}
          </Row>
          <Button label={t('checkin.savePlan')} disabled={plan.length === 0} onPress={() => void run(() => MeshEngine.setCheckinPlan(id, plan, now + planHours * 3_600_000))} />
        </Card>
      ) : null}

      {error ? <Notice tone="warning" text={error} /> : null}

      <Section title={t('checkin.searchView')}>
        <Text variant="caption" tone="muted">
          {t('checkin.searchBody')}
        </Text>
        <Card>
          {detail.members.map((m) => {
            const fr = freshness(Math.max(m.lastHeardMs, m.position?.fixTimeMs ?? 0), now);
            const done = c.checkpoints.length ? t('checkin.progress', { n: (c.progress[m.id] ?? -1) + 1, total: c.checkpoints.length }) : null;
            return (
              <ListRow
                key={m.id}
                title={m.name}
                subtitle={[own && m.position ? f.distance(distanceM(own, m.position)) : t('member.noPosition'), fr.labelKey === 'freshness.now' ? t('freshness.now') : t(fr.labelKey, { count: fr.minutes }), done].filter(Boolean).join(', ')}
                right={<Avatar preset={m.avatarPreset} photo={m.avatarPhoto} colour={m.colour} size={36} dim={fr.state === 'lost'} />}
                onPress={m.position && !m.isSelf ? () => router.push({ pathname: '/find', params: { group: id, member: m.id } }) : undefined}
              />
            );
          })}
        </Card>
      </Section>
    </Screen>
  );
}
