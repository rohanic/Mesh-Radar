import { useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { toHijri } from '@/core/engine/hijri';
import { nextDate, text } from '@/core/packs/schema';
import { space } from '@/core/theme/tokens';
import { numbersFor, pick } from '@/features/numbers/numbers';
import { bundledPacks, installPack, packSizeKB } from '@/features/packs/packs';
import { cancelEventReminders, scheduleEventReminders } from '@/features/reminders/reminders';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { activeGroup, useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Button, Card, Header, ListRow, Notice, Row, Screen, Section, Text, Toggle } from '@/ui/components';
import { Icon } from '@/ui/icons/Icon';
import { useNow } from '@/ui/useNow';

/** Event pack detail (F2): meeting points, numbers, do's and don'ts, rituals, phrasebook, checklist. */
export default function PackDetail() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useSettings((s) => s.language);
  const installed = usePacks((s) => s.installed[id]);
  const checklist = usePacks(useShallow((s) => s.checklist[id] ?? []));
  const toggleItem = usePacks((s) => s.toggleItem);
  const remove = usePacks((s) => s.remove);
  const active = usePacks((s) => s.activeEventId === id && s.eventDay);
  const setPacks = usePacks((s) => s.set);
  const ent = useMesh((s) => s.entitlements.me);
  const groups = useMesh((s) => s.groups);
  const preferred = useSettings((s) => s.activeGroupId);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = useNow(60_000);
  const pack = installed ?? bundledPacks().find((p) => p.id === id);
  if (!pack) return null;
  const next = nextDate(pack, now);
  const hijri = next && pack.hijri ? toHijri(Date.parse(`${next.start}T12:00:00Z`)) : null;
  const flags = ent ?? { maxMembers: 6, maxActiveGroups: 1, allPacks: false, breadcrumbs: false, separationAlerts: false, memories: false, familyCircle: false, organiser: false };
  const group = activeGroup(groups, preferred);

  return (
    <Screen>
      <Header title={text(pack.title, lang)} />
      <Text tone="muted">{text(pack.summary, lang)}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        <Text variant="caption" tone={pack.verified ? 'success' : 'warning'} weight="bold">
          {pack.verified ? t('events.verifiedBadge') : t('events.unverifiedBadge')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('events.size', { n: packSizeKB(pack) })}, {t('events.offlineReady')}
        </Text>
      </Row>
      {next ? (
        <Card>
          <Row>
            <Icon name="calendar" />
            <Text weight="bold">
              {f.date(Date.parse(`${next.start}T00:00:00Z`))} - {f.date(Date.parse(`${next.end}T00:00:00Z`))}
            </Text>
          </Row>
          {hijri ? <Text tone="muted">{t('events.hijri', { d: f.digits(String(hijri.d)), month: t(`events.hijriMonths.m${hijri.m}`), y: f.digits(String(hijri.y)) })}</Text> : null}
          {next.approx ? <Text variant="caption" tone="muted">{t('events.approxDate')}</Text> : null}
        </Card>
      ) : null}

      {installed ? (
        <>
          <Card>
            <Toggle
              testID="event-day"
              label={t('power.eventDay')}
              hint={t('power.eventDayHint')}
              value={active}
              onChange={async (on) => {
                setPacks({ activeEventId: on ? id : null, eventDay: on, activeCountry: pack.countries[0] ?? null });
                await MeshEngine.setEventDay(on, id);
                if (on) {
                  await MeshEngine.setActiveEvent(id);
                  await scheduleEventReminders(pack, lang);
                  useSocial.setState((s) => ({ eventsAttended: s.eventsAttended.includes(id) ? s.eventsAttended : [...s.eventsAttended, id] }));
                } else await cancelEventReminders(id);
              }}
            />
            {active ? <Button variant="secondary" icon="activity" label={t('events.dashboard')} onPress={() => router.push('/event/day')} /> : null}
          </Card>
          <Button variant="ghost" icon="users" label={t('events.community')} onPress={() => router.push({ pathname: '/event/community', params: { id } })} />
        </>
      ) : (
        <>
          <Button
            testID="pack-download"
            icon="download"
            loading={busy}
            label={t('events.download')}
            onPress={async () => {
              setBusy(true);
              const r = await installPack(id, flags);
              setBusy(false);
              if (r === 'limit') setMsg(t('events.freeLimit'));
            }}
          />
          {msg ? (
            <>
              <Notice tone="warning" text={msg} />
              <Button variant="accent" label={t('common.upgrade')} onPress={() => router.push('/me/plans')} />
            </>
          ) : null}
        </>
      )}

      <Section title={t('events.numbers')}>
        {pack.countries.map((c) => {
          const n = numbersFor(c);
          if (!n) return null;
          return (
            <Card key={c}>
              <Text weight="bold">{pick(n.name, lang)}</Text>
              {n.numbers.map((x) => (
                <ListRow
                  key={x.id}
                  icon="phone"
                  title={`${t(`numbers.kinds.${x.kind}`)}: ${x.number}`}
                  subtitle={pick(x.label, lang)}
                  onPress={() => void Linking.openURL(`tel:${x.number}`)}
                />
              ))}
              {n.numbers.some((x) => !x.verified) ? <Text variant="caption" tone="warning">{t('numbers.unverified')}</Text> : null}
            </Card>
          );
        })}
      </Section>

      <Section title={t('events.meetingPoints')}>
        {pack.meetingPoints.map((m, i) => (
          <Card key={i}>
            <Text weight="bold">{text(m.name, lang)}</Text>
            <Text tone="muted">{text(m.detail, lang)}</Text>
          </Card>
        ))}
      </Section>

      <Section title={t('events.checklist')}>
        <Card>
          {pack.checklist.map((c, i) => (
            <Toggle key={i} label={text(c, lang)} value={checklist.includes(i)} onChange={() => toggleItem(id, i)} />
          ))}
        </Card>
      </Section>

      <Section title={t('events.dos')}>
        <Card>
          {pack.dos.map((d, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }}>
              <Icon name="check" size={18} />
              <Text style={{ flex: 1 }}>{text(d, lang)}</Text>
            </Row>
          ))}
        </Card>
      </Section>
      <Section title={t('events.donts')}>
        <Card>
          {pack.donts.map((d, i) => (
            <Row key={i} style={{ alignItems: 'flex-start' }}>
              <Icon name="x" size={18} />
              <Text style={{ flex: 1 }}>{text(d, lang)}</Text>
            </Row>
          ))}
        </Card>
      </Section>

      {pack.schedule.length ? (
        <Section title={t('events.schedule')}>
          {pack.schedule.map((s, i) => (
            <Card key={i}>
              <Text weight="bold">{text(s.title, lang)}</Text>
              <Text tone="muted">{text(s.detail, lang)}</Text>
            </Card>
          ))}
        </Section>
      ) : null}

      {pack.phrasebook.length ? (
        <Section title={t('events.phrasebook')}>
          <Card>
            {pack.phrasebook.map((p, i) => (
              <View key={i} style={{ gap: 2, paddingVertical: space.xs }}>
                <Text variant="bodySmall" tone="muted">
                  {text(p.meaning, lang)}
                </Text>
                <Text variant="title">{p.phrase}</Text>
                {p.transliteration ? <Text variant="bodySmall">{p.transliteration}</Text> : null}
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {installed && group ? (
        <Button variant="secondary" icon="share" label={t('events.sharePack')} onPress={() => void MeshEngine.sharePack(group.id, pack.id, JSON.stringify(pack))} />
      ) : null}
      {installed ? <Button variant="ghost" icon="trash" label={t('events.remove')} onPress={() => remove(id)} /> : null}
      {pack.sources.map((s) => (
        <Text key={s} variant="caption" tone="muted" onPress={() => void Linking.openURL(s)}>
          {s}
        </Text>
      ))}
    </Screen>
  );
}
