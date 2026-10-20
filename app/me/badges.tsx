import { useTranslation } from 'react-i18next';

import { earnedBadges } from '@/core/engine/badges';
import { cardFilled, readiness } from '@/core/engine/safetyScore';
import { text } from '@/core/packs/schema';
import { bundledPacks } from '@/features/packs/packs';
import { useFormat } from '@/i18n/format';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Card, Header, Row, Screen, Text } from '@/ui/components';
import { Icon } from '@/ui/icons/Icon';

/** Badges (G3): Relay Hero and practice badges. Rewards leaving relay on, never time spent. */
export default function Badges() {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = useSettings((s) => s.language);
  const health = useMesh((s) => s.health);
  const social = useSocial();
  const p = useProfile();
  const packs = usePacks((s) => Object.keys(s.installed).length);
  const groups = useMesh((s) => s.groups.length);
  const score = readiness({ hasName: !!p.name, hasAvatar: true, cardFilled: cardFilled(p.card), inGroup: groups > 0, packDownloaded: packs > 0, drillDone: social.drillsCompleted > 0, permissionsGranted: true, tutorialDone: useSettings.getState().tutorialDone }).score;
  const badges = earnedBadges({
    relayedForOthers: health?.relayedForOthers ?? 0,
    relayedByEvent: health?.relayedByEvent ?? {},
    regroups: social.regroups,
    drillsCompleted: social.drillsCompleted,
    readinessScore: score,
    eventsAttended: social.eventsAttended.length,
  });
  const eventName = (id?: string) => (id ? text(bundledPacks().find((x) => x.id === id)?.title, lang) || id : '');
  return (
    <Screen>
      <Header title={t('badges.title')} />
      {badges.length === 0 ? <Text tone="muted">{t('badges.empty')}</Text> : null}
      {badges.map((b) => (
        <Card key={b.id} tone="accent">
          <Row>
            <Icon name="award" />
            <Text weight="bold" style={{ flex: 1 }}>
              {f.digits(t(b.key, { count: b.count ?? 0, event: eventName(b.eventId) }))}
            </Text>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
