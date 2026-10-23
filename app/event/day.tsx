import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { text } from '@/core/packs/schema';
import { errorKey } from '@/features/engine/boot';
import { bundledPacks } from '@/features/packs/packs';
import { useFormat } from '@/i18n/format';
import { MeshEngine, type CrowdKind } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { usePurchases } from '@/state/purchases';
import { useSettings } from '@/state/settings';
import { Button, Card, Chip, Field, Header, Notice, Row, Screen, Section, Text } from '@/ui/components';

const KINDS: CrowdKind[] = ['crush_risk', 'gate_closed', 'fire', 'medical', 'flood', 'other'];

/** Event day dashboard (F3) with the public event channel (F4) and crowd alerts (E8). */
export default function EventDay() {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useSettings((s) => s.language);
  const eventId = usePacks((s) => s.activeEventId);
  const installed = usePacks((s) => (eventId ? s.installed[eventId] : undefined));
  const pack = installed ?? bundledPacks().find((p) => p.id === eventId);
  const posts = useMesh(useShallow((s) => (eventId ? s.posts[eventId] ?? [] : [])));
  const crowd = useMesh(useShallow((s) => (eventId ? s.crowd[eventId] ?? [] : [])));
  const own = useMesh((s) => s.own);
  const cert = usePurchases((s) => (eventId ? s.organiserCerts[eventId] : undefined));
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<CrowdKind>('crush_risk');
  const [label, setLabel] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    const [p, c] = await Promise.all([MeshEngine.eventPosts(eventId), MeshEngine.crowdAlerts(eventId)]);
    useMesh.setState((s) => ({ posts: { ...s.posts, [eventId]: p }, crowd: { ...s.crowd, [eventId]: c } }));
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const id = setInterval(() => void refresh(), 10_000);
      return () => clearInterval(id);
    }, [refresh]),
  );

  if (!eventId || !pack) {
    return (
      <Screen>
        <Header title={t('events.dashboard')} />
        <Text tone="muted">{t('events.noPacks')}</Text>
      </Screen>
    );
  }
  const verified = crowd.filter((c) => c.verified);
  const unverified = crowd.filter((c) => !c.verified);

  return (
    <Screen>
      <Header title={text(pack.title, lang)} />
      <Section title={t('events.crowdTitle')}>
        <Text variant="caption" tone="muted">
          {t('events.crowdHint')}
        </Text>
        {verified.map((c) => (
          <Card key={c.clusterId} tone="sos">
            <Text weight="bold">
              {t('events.crowdVerified')}: {t(`events.crowdKinds.${c.kind}`)}
            </Text>
            <Text>{c.label}</Text>
            {c.organiser ? <Text tone="muted">{t('events.crowdOrganiser', { name: c.organiser })}</Text> : null}
            <Text variant="caption" tone="muted">
              {f.time(c.lastAtMs)}
            </Text>
            <Button variant="secondary" icon="navigation" label={t('alerts.seeOnRadar')} onPress={() => router.push({ pathname: '/find', params: { lat: String(c.lat), lon: String(c.lon), label: c.label } })} />
          </Card>
        ))}
        {unverified.map((c) => (
          <Card key={c.clusterId}>
            <Text>
              {t(`events.crowdKinds.${c.kind}`)}: {c.label}
            </Text>
            <Text variant="caption" tone="muted">
              {t('events.crowdUnverified', { n: c.reports })}
            </Text>
          </Card>
        ))}
        <Card>
          <Text weight="bold">{t('events.reportCrowd')}</Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {KINDS.map((k) => (
              <Chip key={k} label={t(`events.crowdKinds.${k}`)} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </Row>
          <Field label={t('events.crowdLabel')} value={label} onChangeText={setLabel} maxLength={60} />
          <Button
            variant="sos"
            icon="alert"
            label={t('events.reportCrowd')}
            disabled={!own || !label.trim()}
            onPress={async () => {
              try {
                await MeshEngine.reportCrowd({ eventId, kind, label: label.trim(), lat: own!.lat, lon: own!.lon, organiserCert: cert });
                setLabel('');
                await refresh();
              } catch (e) {
                setNote(t(errorKey(e)));
              }
            }}
          />
        </Card>
      </Section>

      <Section title={t('events.channel')}>
        <Text variant="caption" tone="muted">
          {t('events.channelHint')}
        </Text>
        <Field label={t('events.channel')} placeholder={t('events.channelPlaceholder')} value={draft} onChangeText={setDraft} maxLength={280} multiline />
        <Button
          icon="megaphone"
          label={t('common.send')}
          disabled={!draft.trim()}
          onPress={async () => {
            try {
              await MeshEngine.postEvent(eventId, draft.trim());
              setDraft('');
              await refresh();
            } catch (e) {
              setNote(t(errorKey(e) === 'errors.rate_limited' ? 'events.rateLimited' : errorKey(e)));
            }
          }}
        />
        {note ? <Notice tone="warning" text={note} /> : null}
        {[...posts].reverse().map((p) => (
          <Card key={p.msgId}>
            <Text>{p.text}</Text>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">
                {f.time(p.atMs)}
              </Text>
              {!p.mine ? (
                <Chip
                  label={t('events.report')}
                  onPress={async () => {
                    await MeshEngine.reportPost(p.msgId);
                    setNote(t('events.reported'));
                    await refresh();
                  }}
                />
              ) : null}
            </Row>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
