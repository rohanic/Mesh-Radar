import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { countdownDays, nextDate } from '@/core/packs/schema';
import { EventCard } from '@/features/packs/EventCard';
import { bundledPacks } from '@/features/packs/packs';
import { usePacks } from '@/state/packs';
import { Button, Card, Chip, Header, Notice, Row, Screen, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Events tab (section 6): event list and calendar, pack detail, downloads, event day. */
export default function EventsTab() {
  const { t } = useTranslation();
  const installed = usePacks((s) => s.installed);
  const active = usePacks((s) => s.activeEventId);
  const eventDay = usePacks((s) => s.eventDay);
  const [view, setView] = useState<'packs' | 'calendar' | 'downloaded'>('packs');
  const all = useMemo(() => {
    const bundled = bundledPacks();
    const community = Object.values(installed).filter((p) => !bundled.some((b) => b.id === p.id));
    return [...bundled, ...community];
  }, [installed]);
  const now = useNow();
  const list =
    view === 'downloaded'
      ? all.filter((p) => installed[p.id])
      : view === 'calendar'
        ? all
            .filter((p) => nextDate(p, now))
            .sort((a, b) => countdownDays(nextDate(a, now)!.start, nextDate(a, now)!.end, now) - countdownDays(nextDate(b, now)!.start, nextDate(b, now)!.end, now))
        : all;
  return (
    <Screen>
      <Header title={t('events.title')} back={false} />
      {active && eventDay ? (
        <Card tone="accent" onPress={() => router.push('/event/day')}>
          <Text weight="bold">{t('events.eventDayOn')}</Text>
          <Text tone="muted">{t('events.dashboard')}</Text>
        </Card>
      ) : null}
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label={t('events.packs')} selected={view === 'packs'} onPress={() => setView('packs')} />
        <Chip label={t('events.calendar')} icon="calendar" selected={view === 'calendar'} onPress={() => setView('calendar')} />
        <Chip label={t('events.downloaded')} icon="download" selected={view === 'downloaded'} onPress={() => setView('downloaded')} />
      </Row>
      {view === 'calendar' ? <Notice text={t('events.approxDate')} /> : null}
      {list.length === 0 ? <Text tone="muted">{t('events.noPacks')}</Text> : null}
      {list.map((p) => (
        <EventCard key={p.id} pack={p} installed={!!installed[p.id]} onPress={() => router.push({ pathname: '/event/[id]', params: { id: p.id } })} />
      ))}
      <Button variant="secondary" icon="pencil" label={t('events.createPack')} onPress={() => router.push('/event/create')} />
      <Text variant="caption" tone="muted">
        {t('events.freeLimit')}
      </Text>
    </Screen>
  );
}
