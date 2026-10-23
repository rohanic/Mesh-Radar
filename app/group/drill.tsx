import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DRILL_SECONDS, HIDE_SECONDS, nextHider, phase, results, secondsLeft, seekerFound } from '@/core/engine/drill';
import { distanceM } from '@/core/engine/geo';
import { noteReviewMoment } from '@/features/store/StorePrompts';
import { track } from '@/features/telemetry/telemetry';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { useSocial } from '@/state/social';
import { Button, Card, Chip, Header, Notice, Row, Screen, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Regroup Drill (G4): a 5-minute hide-and-seek on the radar, played with the real Find flow. */
export default function Drill() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useMesh((s) => s.details[id]);
  const drill = useMesh((s) => s.drills[id]);
  const own = useMesh((s) => s.own);
  const myId = useMesh((s) => s.myId);
  const lastHid = useSocial((s) => s.lastHid);
  const now = useNow(1_000);
  const [hider, setHider] = useState<string | null>(null);
  const reported = useRef(false);

  const ph = phase(drill ?? null, now);
  const hiderMember = detail?.members.find((m) => m.id === drill?.hiderId);
  const iAmHider = drill?.hiderId === myId;
  const d = own && hiderMember?.position ? distanceM(own, hiderMember.position) : null;

  // Seekers report "found" automatically when within 10 m of the hider.
  useEffect(() => {
    if (!drill || ph !== 'seeking' || iAmHider || reported.current || d == null || !seekerFound(d)) return;
    reported.current = true;
    void MeshEngine.sendDrill({ groupId: id, kind: 'found', drillId: drill.drillId, hiderId: drill.hiderId, durationSec: drill.durationSec });
    useMesh.setState((s) => ({ drills: { ...s.drills, [id]: { ...drill, found: { ...drill.found, [myId]: Date.now() - drill.startedAtMs } } } }));
  }, [drill, ph, iAmHider, d, id, myId]);

  useEffect(() => {
    if (ph === 'done' && drill && !drill.ended) {
      useSocial.setState((s) => ({ drillsCompleted: s.drillsCompleted + 1 }));
      noteReviewMoment('drillDone');
      useMesh.setState((s) => ({ drills: { ...s.drills, [id]: { ...drill, ended: true } } }));
      track('drill_done', { count: Object.keys(drill.found).length });
    }
  }, [ph, drill, id]);

  if (!detail) return null;
  const others = detail.members.filter((m) => !m.isSelf);
  if (detail.members.length < 2) {
    return (
      <Screen>
        <Header title={t('drill.title')} />
        <Notice text={t('drill.needGroup')} />
      </Screen>
    );
  }
  const suggested = hider ?? nextHider(detail.members.map((m) => m.id), lastHid);

  return (
    <Screen>
      <Header title={t('drill.title')} />
      <Text tone="muted">{t('drill.body')}</Text>
      {!drill || ph === 'done' ? (
        <Card>
          <Text weight="bold">{t('drill.hider')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {detail.members.map((m) => (
              <Chip key={m.id} label={m.isSelf ? t('common.you') : m.name} selected={suggested === m.id} onPress={() => setHider(m.id)} />
            ))}
          </Row>
          <Button
            icon="trophy"
            label={t('drill.start')}
            disabled={!suggested}
            onPress={async () => {
              reported.current = false;
              const drillId = await MeshEngine.sendDrill({ groupId: id, kind: 'start', hiderId: suggested!, durationSec: DRILL_SECONDS });
              useMesh.setState((s) => ({ drills: { ...s.drills, [id]: { drillId, hiderId: suggested!, startedAtMs: Date.now(), durationSec: DRILL_SECONDS, found: {}, ended: false } } }));
              useSocial.setState((s) => ({ lastHid: { ...s.lastHid, [suggested!]: Date.now() } }));
            }}
          />
        </Card>
      ) : null}
      {drill && ph === 'hiding' ? (
        <Card tone="accent">
          <Text variant="title">{iAmHider ? t('drill.youHide') : t('drill.hiding', { name: hiderMember?.name ?? '', n: f.number(Math.max(0, HIDE_SECONDS - Math.floor((now - drill.startedAtMs) / 1000))) })}</Text>
        </Card>
      ) : null}
      {drill && ph === 'seeking' ? (
        <Card tone="accent">
          <Text variant="title">{iAmHider ? t('drill.youHide') : t('drill.seeking', { name: hiderMember?.name ?? '', n: f.number(secondsLeft(drill, now)) })}</Text>
          {!iAmHider && hiderMember ? <Button icon="navigation" label={t('member.find')} onPress={() => router.push({ pathname: '/find', params: { group: id, member: hiderMember.id } })} /> : null}
          {d != null && !iAmHider ? <Text tabular>{f.distance(d)}</Text> : null}
        </Card>
      ) : null}
      {drill && Object.keys(drill.found).length ? (
        <Card>
          <Text weight="bold">{t('drill.results')}</Text>
          {results(drill).map((r) => (
            <Text key={r.memberId}>{t('drill.foundIn', { name: detail.members.find((m) => m.id === r.memberId)?.name ?? '', n: f.number(r.seconds) })}</Text>
          ))}
        </Card>
      ) : null}
      {drill && ph !== 'done' && detail.isLeader ? (
        <Button variant="secondary" label={t('drill.end')} onPress={() => void MeshEngine.sendDrill({ groupId: id, kind: 'end', drillId: drill.drillId, hiderId: drill.hiderId, durationSec: drill.durationSec }).then(() => useMesh.setState((s) => ({ drills: { ...s.drills, [id]: { ...drill, ended: true } } })))} />
      ) : null}
      {others.length === 0 ? <Notice text={t('drill.needGroup')} /> : null}
    </Screen>
  );
}
