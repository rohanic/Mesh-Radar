import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { weeklyStreak } from '@/core/engine/badges';
import { cardFilled, readiness } from '@/core/engine/safetyScore';
import { space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Avatar } from '@/ui/components/Avatar';
import { Card, Header, ListRow, Screen, Section, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Me tab (section 6). */
export default function MeTab() {
  const { t } = useTranslation();
  const f = useFormat();
  const p = useProfile();
  const groups = useMesh((s) => s.groups);
  const engine = useMesh((s) => s.engine);
  const packs = usePacks((s) => Object.keys(s.installed).length);
  const social = useSocial();
  const tutorialDone = useSettings((s) => s.tutorialDone);
  const perms = engine?.radios.permissions ?? {};
  const score = readiness({
    hasName: !!p.name.trim(),
    hasAvatar: p.avatarPreset > 0 || !!p.avatarPhoto,
    cardFilled: cardFilled(p.card),
    inGroup: groups.some((g) => !g.archived),
    packDownloaded: packs > 0,
    drillDone: social.drillsCompleted > 0,
    permissionsGranted: Object.keys(perms).length === 0 || Object.values(perms).every(Boolean),
    tutorialDone,
  });
  const now = useNow(60_000);
  const streak = weeklyStreak(social.checkins, now);
  return (
    <Screen>
      <Header title={t('me.title')} back={false} />
      <Card onPress={() => router.push('/me/profile')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar preset={p.avatarPreset} photo={p.avatarPhoto} colour={p.colour} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{p.name || t('me.profile')}</Text>
            <Text tone="muted">{t('readiness.score', { n: f.number(score.score) })}</Text>
            {streak > 0 ? <Text variant="caption" tone="accent">{t('me.streak', { count: streak })}</Text> : null}
          </View>
        </View>
      </Card>
      {score.missing.length ? (
        <Card tone="accent" onPress={() => router.push('/me/ready')}>
          <Text weight="bold">{t('me.safetyReady')}</Text>
          <Text tone="muted">{t(`readiness.${score.missing[0]}`)}</Text>
        </Card>
      ) : null}
      <Section>
        <Card>
          <ListRow icon="shield" title={t('me.card')} onPress={() => router.push('/me/card')} />
          <ListRow icon="users" title={t('me.groups')} onPress={() => router.push('/me/groups')} />
          <ListRow icon="phone" title={t('me.numbers')} onPress={() => router.push('/me/numbers')} />
          <ListRow icon="ticket" title={t('me.lostChild')} onPress={() => router.push('/me/lost-child')} />
          <ListRow icon="battery" title={t('me.power')} onPress={() => router.push('/me/power')} />
        </Card>
      </Section>
      <Section>
        <Card>
          <ListRow icon="award" title={t('me.badges')} onPress={() => router.push('/me/badges')} />
          <ListRow icon="footprints" title={t('me.memories')} onPress={() => router.push('/me/memories')} />
          <ListRow icon="trophy" title={t('me.drill')} onPress={() => router.push('/me/groups')} />
          <ListRow icon="share" title={t('me.invite')} onPress={() => router.push('/me/invite')} />
        </Card>
      </Section>
      <Section>
        <Card>
          <ListRow icon="languages" title={t('me.themeLanguage')} onPress={() => router.push('/me/settings')} />
          <ListRow icon="accessibility" title={t('me.elderMode')} onPress={() => router.push('/me/settings')} />
          <ListRow icon="smartphone" title={t('me.keepRunning')} onPress={() => router.push('/me/keep-running')} />
          <ListRow icon="lock" title={t('me.privacy')} onPress={() => router.push('/me/privacy')} />
          <ListRow icon="gift" title={t('me.subscription')} onPress={() => router.push('/me/plans')} />
        </Card>
      </Section>
      <Text variant="caption" tone="muted" align="center">
        {t('app.notEmergencyService')}
      </Text>
    </Screen>
  );
}
