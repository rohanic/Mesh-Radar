import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { cardFilled, readiness, type ReadinessInput } from '@/core/engine/safetyScore';
import { useFormat } from '@/i18n/format';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { useSocial } from '@/state/social';
import { Card, Header, ListRow, Screen, Text } from '@/ui/components';

const TARGET: Record<keyof ReadinessInput, string> = {
  hasName: '/me/profile',
  hasAvatar: '/me/profile',
  cardFilled: '/me/card',
  inGroup: '/me/groups',
  packDownloaded: '/(tabs)/events',
  drillDone: '/me/groups',
  permissionsGranted: '/onboarding/permissions',
  tutorialDone: '/onboarding/tutorial',
};

/** Safety Ready score (G5). */
export default function Ready() {
  const { t } = useTranslation();
  const f = useFormat();
  const p = useProfile();
  const groups = useMesh((s) => s.groups);
  const perms = useMesh((s) => s.engine?.radios.permissions ?? {});
  const packs = usePacks((s) => Object.keys(s.installed).length);
  const drills = useSocial((s) => s.drillsCompleted);
  const tutorialDone = useSettings((s) => s.tutorialDone);
  const input: ReadinessInput = {
    hasName: !!p.name.trim(),
    hasAvatar: p.avatarPreset > 0 || !!p.avatarPhoto,
    cardFilled: cardFilled(p.card),
    inGroup: groups.some((g) => !g.archived),
    packDownloaded: packs > 0,
    drillDone: drills > 0,
    permissionsGranted: Object.values(perms).every(Boolean),
    tutorialDone,
  };
  const r = readiness(input);
  return (
    <Screen>
      <Header title={t('readiness.title')} />
      <Text variant="distance" tabular>
        {t('readiness.score', { n: f.number(r.score) })}
      </Text>
      <Card>
        {(Object.keys(TARGET) as (keyof ReadinessInput)[]).map((k) => (
          <ListRow key={k} icon={input[k] ? 'check-circle' : 'info'} title={t(`readiness.${k}`)} onPress={input[k] ? undefined : () => router.push(TARGET[k] as never)} />
        ))}
      </Card>
    </Screen>
  );
}
