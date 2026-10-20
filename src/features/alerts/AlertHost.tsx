import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { bearingDeg, compass8, distanceM } from '@/core/engine/geo';
import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { useMesh, type Alert } from '@/state/mesh';
import { sosVibration } from '@/features/sound/sound';
import { Avatar } from '@/ui/components/Avatar';
import { Button, Text } from '@/ui/components';

/** Shows the most urgent alert: incoming SOS full-screen (section 6, global), others as a sheet. */
export function AlertHost() {
  const alerts = useMesh((s) => s.alerts);
  const sorted = [...alerts].sort((a, b) => rank(a) - rank(b));
  const top = sorted[0];
  useEffect(() => {
    sosVibration(top?.kind === 'sos');
    return () => sosVibration(false);
  }, [top?.kind, top?.id]);
  if (!top) return null;
  return top.kind === 'sos' ? <IncomingSos alert={top} /> : <AlertSheet alert={top} />;
}

function rank(a: Alert): number {
  return { sos: 0, lostChild: 1, crowd: 2, publicSos: 3, checkinMissed: 4, separation: 5, crumb: 6, lowBattery: 7, groupFull: 8, removed: 9 }[a.kind];
}

function IncomingSos({ alert }: { alert: Extract<Alert, { kind: 'sos' }> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const own = useMesh((s) => s.own);
  const group = useMesh((s) => s.groups.find((g) => g.id === alert.sos.groupId));
  const dismiss = useMesh((s) => s.dismissAlert);
  const sos = alert.sos;
  const p = sos.position;
  const hasPos = p && (p.lat !== 0 || p.lon !== 0);
  const where = own && hasPos ? t('sos.incomingWhere', { distance: f.distance(distanceM(own, p)), direction: t(`direction.${compass8(bearingDeg(own, p))}`) }) : '';
  const card = sos.card;
  return (
    <Modal visible animationType={theme.reduceMotion ? 'none' : 'fade'} onRequestClose={() => dismiss(alert.id)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.colors.sos, padding: space.xl, justifyContent: 'center', gap: space.lg }} accessibilityViewIsModal>
        <View style={{ alignItems: 'center', gap: space.md }}>
          {sos.member ? <Avatar preset={sos.member.avatarPreset} photo={sos.member.avatarPhoto} colour={sos.member.colour} size={96} /> : null}
          <Text variant="headline" tone="onSos" align="center" accessibilityRole="header">
            {t('sos.incomingTitle', { name: sos.member?.name ?? t('common.unknown') })}
          </Text>
          <Text variant="title" tone="onSos" align="center">
            {t(`sos.kinds.${sos.kind}`)}
          </Text>
          {where ? (
            <Text variant="distance" tone="onSos" align="center" tabular>
              {where}
            </Text>
          ) : null}
        </View>
        {card.bloodGroup || card.conditions || card.medicines ? (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: radius.card, padding: space.lg, gap: space.xs }}>
            {card.bloodGroup ? <Text>{`${t('card.bloodGroup')}: ${card.bloodGroup}`}</Text> : null}
            {card.conditions ? <Text>{`${t('card.conditions')}: ${card.conditions}`}</Text> : null}
            {card.medicines ? <Text>{`${t('card.medicines')}: ${card.medicines}`}</Text> : null}
          </View>
        ) : null}
        <Button
          big
          variant="secondary"
          icon="navigation"
          label={t('sos.goFind')}
          onPress={() => {
            dismiss(alert.id);
            router.push({ pathname: '/find', params: { group: sos.groupId, member: sos.memberId } });
          }}
        />
        {group?.isLeader ? (
          <Button
            variant="secondary"
            label={t('sos.markResolved')}
            onPress={() => {
              void MeshEngine.resolveSos(sos.sosId, 'found');
              dismiss(alert.id);
            }}
          />
        ) : null}
        <Button variant="ghost" label={t('alerts.dismiss')} onPress={() => dismiss(alert.id)} style={{ backgroundColor: theme.colors.surface }} />
      </View>
    </Modal>
  );
}

function AlertSheet({ alert }: { alert: Exclude<Alert, { kind: 'sos' }> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const dismiss = useMesh((s) => s.dismissAlert);
  let title = '';
  let body = '';
  let action: { label: string; go: () => void } | null = null;
  let tone: 'sos' | 'warning' | 'primary' = 'warning';
  switch (alert.kind) {
    case 'publicSos':
      title = t('sos.publicTitle');
      body = `${t('sos.publicBody', { direction: alert.sos.direction ? t(`direction.${alert.sos.direction}`) : '?', within: alert.sos.withinM ?? '?' })} ${t('sos.publicNote')}`;
      tone = 'sos';
      break;
    case 'crumb':
      title = t('crumb.title', { name: alert.crumb.member?.name ?? t('common.unknown') });
      body = t('crumb.body', { time: f.time(alert.crumb.position.fixTimeMs || alert.crumb.receivedAtMs) });
      action = { label: t('alerts.seeOnRadar'), go: () => router.navigate('/') };
      break;
    case 'lostChild':
      title = t('lostChild.foundTitle', { name: alert.childName });
      body = alert.note || t('lostChild.foundBody');
      tone = 'primary';
      action = alert.position
        ? { label: t('sos.goFind'), go: () => router.push({ pathname: '/find', params: { lat: String(alert.position!.lat), lon: String(alert.position!.lon), label: alert.childName } }) }
        : null;
      break;
    case 'checkinMissed':
      title = alert.self ? t('checkin.missedSelf') : t('checkin.missedTitle', { name: alert.member?.name ?? t('common.unknown') });
      action = alert.self
        ? { label: t('checkin.checkInNow'), go: () => void MeshEngine.checkIn(alert.groupId, -1) }
        : { label: t('checkin.searchView'), go: () => router.push({ pathname: '/group/checkin', params: { id: alert.groupId } }) };
      break;
    case 'separation':
      title = t('separation.title', { name: alert.member.name, distance: f.distance(alert.distanceM) });
      body = t('separation.body', { threshold: f.distance(alert.thresholdM) });
      action = { label: t('member.find'), go: () => router.push({ pathname: '/find', params: { group: alert.groupId, member: alert.member.id } }) };
      break;
    case 'crowd':
      title = `${t('events.crowdVerified')}: ${t(`events.crowdKinds.${alert.alert.kind}`)}`;
      body = alert.alert.organiser ? `${alert.alert.label}. ${t('events.crowdOrganiser', { name: alert.alert.organiser })}` : alert.alert.label;
      tone = 'sos';
      break;
    case 'lowBattery':
      title = t('battery.lowTitle', { level: f.number(alert.level) });
      body = t('battery.lowBody');
      action = { label: t('battery.switch'), go: () => router.push('/battery') };
      break;
    case 'groupFull':
      title = t('groups.full', { name: alert.name });
      action = { label: t('common.upgrade'), go: () => router.push('/me/plans') };
      break;
    case 'removed':
      title = t('groups.removed', { name: alert.name });
      break;
  }
  const color = tone === 'sos' ? theme.colors.sos : tone === 'primary' ? theme.colors.primary : theme.colors.warning;
  return (
    <Modal transparent visible animationType={theme.reduceMotion ? 'none' : 'slide'} onRequestClose={() => dismiss(alert.id)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.colors.overlay }}>
        <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: space.xl, gap: space.md, borderTopWidth: 4, borderColor: color }} accessibilityViewIsModal>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {body ? <Text>{body}</Text> : null}
          {action ? (
            <Button
              label={action.label}
              onPress={() => {
                dismiss(alert.id);
                action!.go();
              }}
            />
          ) : null}
          <Button variant="secondary" label={t('alerts.dismiss')} onPress={() => dismiss(alert.id)} />
        </View>
      </View>
    </Modal>
  );
}
