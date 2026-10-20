import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { space } from '@/core/theme/tokens';
import { check, request, type PermissionGroup } from '@/features/permissions/permissions';
import { track } from '@/features/telemetry/telemetry';
import { useSettings } from '@/state/settings';
import { Button, Card, Header, Notice, Row, Screen, Text } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons/Icon';

const ITEMS: { group: PermissionGroup; icon: IconName; title: string; why: string }[] = [
  { group: 'nearby', icon: 'bluetooth', title: 'onboarding.permNearby', why: 'onboarding.permNearbyWhy' },
  { group: 'location', icon: 'locate', title: 'onboarding.permLocation', why: 'onboarding.permLocationWhy' },
  { group: 'notifications', icon: 'bell', title: 'onboarding.permNotifications', why: 'onboarding.permNotificationsWhy' },
];

/** A5: guided permissions, each with a one-line reason (flow 1, step 4). */
export default function PermissionsStep() {
  const { t } = useTranslation();
  const set = useSettings((s) => s.set);
  const [state, setState] = useState<Record<PermissionGroup, 'granted' | 'denied' | 'blocked' | 'unknown'>>({ nearby: 'unknown', location: 'unknown', notifications: 'unknown' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const granted = await Promise.all(ITEMS.map((i) => check(i.group)));
      if (alive) setState((s) => ({ ...s, ...Object.fromEntries(ITEMS.filter((_, k) => granted[k]).map((i) => [i.group, 'granted'])) }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allGranted = ITEMS.every((i) => state[i.group] === 'granted');
  const next = () => {
    track('onboarding_step', { step: 'permissions', result: allGranted ? 'all' : 'some' });
    set({ onboarding: 'group' });
    router.replace('/onboarding/group');
  };

  return (
    <Screen footer={<Button testID="perm-next" label={t('common.continue')} onPress={next} />}>
      <Header title={t('onboarding.permissionsTitle')} back={false} />
      <Text tone="muted">{t('onboarding.permissionsBody')}</Text>
      {ITEMS.map((i) => (
        <Card key={i.group}>
          <Row>
            <Icon name={i.icon} />
            <Text variant="title" style={{ flex: 1 }}>
              {t(i.title)}
            </Text>
            {state[i.group] === 'granted' ? <Icon name="check-circle" /> : null}
          </Row>
          <Text tone="muted">{t(i.why)}</Text>
          {state[i.group] === 'granted' ? (
            <Text tone="success" weight="bold">
              {t('onboarding.permGranted')}
            </Text>
          ) : (
            <View style={{ gap: space.sm }}>
              <Button
                testID={`perm-${i.group}`}
                label={t('onboarding.permAllow')}
                onPress={async () => {
                  const result = await request(i.group);
                  setState((s) => ({ ...s, [i.group]: result }));
                }}
              />
              {state[i.group] === 'blocked' || state[i.group] === 'denied' ? (
                <>
                  <Notice tone="warning" text={t('onboarding.permDenied')} />
                  <Button variant="secondary" label={t('onboarding.openSettings')} onPress={() => void Linking.openSettings()} />
                </>
              ) : null}
            </View>
          )}
        </Card>
      ))}
      <Button variant="ghost" label={t('onboarding.keepRunningTitle')} onPress={() => router.push('/me/keep-running')} />
    </Screen>
  );
}
