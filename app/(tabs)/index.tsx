import { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { shouldSuggestMeetingPoint, nearestPin } from '@/core/engine/find';
import { floorsRelative } from '@/core/engine/floors';
import { LIST_BY_DEFAULT_OVER, listRows } from '@/core/engine/list';
import { quickReply, type QuickReply } from '@/core/engine/quickReplies';
import { useTheme } from '@/core/theme/ThemeProvider';
import { space } from '@/core/theme/tokens';
import { errorKey } from '@/features/engine/boot';
import { startMesh } from '@/features/permissions/permissions';
import { RadarCanvas } from '@/features/radar/RadarCanvas';
import { useRadarData } from '@/features/radar/useRadar';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { recordCheckin } from '@/state/social';
import { cardFilled } from '@/core/engine/safetyScore';
import { Avatar, GroupShapeGlyph } from '@/ui/components/Avatar';
import { Button, Card, Chip, ListRow, Notice, Row, Text } from '@/ui/components';
import { MeshPill } from '@/ui/components/MeshPill';
import { QuickReplyTray } from '@/ui/components/QuickReplyTray';
import { useNow } from '@/ui/useNow';

export default function RadarTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const { width } = useWindowDimensions();
  const engine = useMesh((s) => s.engine);
  const health = useMesh((s) => s.health);
  const own = useMesh((s) => s.own);
  const heading = useMesh((s) => s.heading);
  const headingAccuracy = useMesh((s) => s.headingAccuracy);
  const myPressure = useMesh((s) => s.pressurePa);
  const groups = useMesh(useShallow((s) => s.groups.filter((g) => !g.archived)));
  const { group, members, pins, crumbs } = useRadarData();
  const view = useSettings((s) => s.radarView);
  const setSettings = useSettings((s) => s.set);
  const card = useProfile((s) => s.card);
  const lastNudgeDay = useSettings((s) => s.lastNudgeDay);
  const [status, setStatus] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void MeshEngine.setHeadingActive(true);
      return () => void MeshEngine.setHeadingActive(false);
    }, []),
  );

  const running = !!engine?.running;
  const radios = engine?.radios;
  const off = radios ? [!radios.bluetooth && t('radar.bluetooth'), !radios.wifi && t('radar.wifi'), !radios.location && t('radar.locationService')].filter(Boolean) : [];
  const size = Math.min(width - space.lg * 2, 420);
  const showList = view === 'list' || members.length > LIST_BY_DEFAULT_OVER;
  const today = new Date().toISOString().slice(0, 10);
  const nudge = !cardFilled(card) && lastNudgeDay !== today;

  // Flow 2, step 5: someone unreachable for 15 minutes; suggest the nearest meeting point.
  const now = useNow();
  const lostMember = members.find((m) => shouldSuggestMeetingPoint(m.lastMs, now));
  const pin = own && lostMember ? nearestPin(own, pins) : null;

  const sendQuick = async (q: QuickReply) => {
    if (!group) return;
    if (q.needsPin) {
      router.push({ pathname: '/chat/[groupId]', params: { groupId: group.id, pickPin: '1' } });
      return;
    }
    try {
      await MeshEngine.sendChat({ groupId: group.id, kind: 'quick', text: '', quickCode: q.code });
      if (q.code === 1) recordCheckin();
      setStatus(t('elder.sent'));
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus(t(errorKey(e)));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 180 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {group ? (
            <Chip
              testID="group-switch"
              label={group.name}
              onPress={() => {
                const i = groups.findIndex((g) => g.id === group.id);
                const next = groups[(i + 1) % groups.length];
                if (next && groups.length > 1) setSettings({ activeGroupId: next.id });
                else router.push('/me/groups');
              }}
            />
          ) : (
            <Text variant="headline">{t('radar.title')}</Text>
          )}
          <MeshPill running={running} neighbours={health?.neighbours ?? 0} hops={health?.maxHops ?? 0} onPress={() => router.push('/health')} />
        </Row>

        {nudge ? (
          <Card tone="warning" onPress={() => {
            setSettings({ lastNudgeDay: today });
            router.push('/me/card');
          }}>
            <Text>{t('onboarding.nudge')}</Text>
          </Card>
        ) : null}

        {!group ? (
          <Card>
            <Text variant="title">{t('radar.noGroup')}</Text>
            <Text tone="muted">{t('radar.noGroupBody')}</Text>
            <Button icon="plus" label={t('onboarding.createGroup')} onPress={() => router.push('/group/new')} />
            <Button variant="secondary" icon="qr-code" label={t('onboarding.joinGroup')} onPress={() => router.push('/group/join')} />
          </Card>
        ) : null}

        {!running ? (
          <Card tone="warning">
            <Text variant="title">{t('radar.engineOff')}</Text>
            <Text tone="muted">{t('radar.engineOffBody')}</Text>
            <Button
              testID="start-mesh"
              icon="power"
              label={t('radar.startMesh')}
              onPress={async () => {
                const ok = await startMesh();
                if (!ok) router.push('/onboarding/permissions');
              }}
            />
          </Card>
        ) : null}

        {running && off.length ? (
          <Card tone="warning">
            <Text>{t('radar.radiosOff', { radios: off.join(', ') })}</Text>
            <Row style={{ flexWrap: 'wrap' }}>
              {!radios?.bluetooth ? <Chip label={t('radar.bluetooth')} icon="bluetooth" onPress={() => void MeshEngine.openSettings('bluetooth')} /> : null}
              {!radios?.wifi ? <Chip label={t('radar.wifi')} icon="wifi" onPress={() => void MeshEngine.openSettings('wifi')} /> : null}
              {!radios?.location ? <Chip label={t('radar.locationService')} icon="locate" onPress={() => void MeshEngine.openSettings('location')} /> : null}
            </Row>
          </Card>
        ) : null}

        {group ? (
          <>
            <Row style={{ justifyContent: 'center' }}>
              <Chip label={t('radar.radarView')} icon="radar" selected={!showList} onPress={() => setSettings({ radarView: 'radar' })} />
              <Chip label={t('radar.listView')} icon="list" selected={showList} onPress={() => setSettings({ radarView: 'list' })} />
            </Row>
            {!showList ? (
              <View style={{ alignItems: 'center', gap: space.sm }}>
                {own ? (
                  <RadarCanvas
                    own={own}
                    heading={heading}
                    members={members}
                    pins={pins}
                    crumbs={crumbs}
                    size={size}
                    sweep={health?.powerMode !== 'ultra_saver'}
                    onSelect={(id) => router.push({ pathname: '/member', params: { group: group.id, member: id } })}
                  />
                ) : (
                  <Notice icon="locate" text={t('radar.noFix')} />
                )}
                {heading == null ? <Text variant="caption" tone="muted">{t('radar.noCompass')}</Text> : null}
                {heading != null && headingAccuracy <= 1 ? <Notice tone="warning" icon="compass" text={t('radar.calibrate')} /> : null}
              </View>
            ) : (
              <Card>
                {listRows(own, heading, group.members.filter((m) => !m.isSelf), now).map((row) => {
                  const m = row.member;
                  const floors = floorsRelative(m.position?.pressurePa, m.position?.fixTimeMs ?? 0, myPressure, now);
                  const parts = [
                    row.distanceM != null ? f.distance(row.distanceM) : t('member.noPosition'),
                    row.direction ? t(`direction.${row.direction}`) : null,
                    floors && floors.floors > 0 ? t(floors.key, { count: floors.floors }) : null,
                    row.freshness.labelKey === 'freshness.now' ? t('freshness.now') : t(row.freshness.labelKey, { count: row.freshness.minutes }),
                  ].filter(Boolean);
                  return (
                    <ListRow
                      key={m.id}
                      testID={`row-${m.id}`}
                      title={m.name}
                      subtitle={parts.join(', ')}
                      right={<Avatar preset={m.avatarPreset} photo={m.avatarPhoto} colour={m.colour} size={40} dim={row.freshness.state === 'lost'} />}
                      onPress={() => router.push({ pathname: '/member', params: { group: group.id, member: m.id } })}
                    />
                  );
                })}
              </Card>
            )}

            {lostMember && pin ? (
              <Card tone="accent" onPress={() => router.push({ pathname: '/find', params: { lat: String(pin.pin.lat), lon: String(pin.pin.lon), label: pin.pin.name } })}>
                <Text>{t('radar.suggestPin', { name: lostMember.name, pin: pin.pin.name })}</Text>
              </Card>
            ) : null}

            {pins.length ? (
              <Row style={{ flexWrap: 'wrap' }}>
                {pins.map((p) => (
                  <Chip
                    key={p.id}
                    icon="map-pin"
                    label={p.name}
                    onPress={() => router.push({ pathname: '/find', params: { lat: String(p.lat), lon: String(p.lon), label: p.name } })}
                  />
                ))}
              </Row>
            ) : null}

            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="bodySmall" weight="bold" tone="muted">
                {t('chat.quickTitle')}
              </Text>
              <Row>
                <GroupShapeGlyph shape={theme.groupColour(group.colour).shape} color={theme.groupColour(group.colour).color} />
                <Text variant="caption" tone="muted">
                  {group.name}
                </Text>
              </Row>
            </Row>
            <QuickReplyTray onPick={(q) => void sendQuick(quickReply(q.code)!)} />
            {status ? <Notice tone="success" text={status} /> : null}
            <ListRow icon="map-pin" title={t('pins.title')} onPress={() => router.push({ pathname: '/pins', params: { group: group.id } })} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
