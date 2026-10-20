import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { floorsRelative } from '@/core/engine/floors';
import { freshness } from '@/core/engine/freshness';
import { bearingDeg, distanceM, relativeBearing, relativeDirection } from '@/core/engine/geo';
import { space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { MeshEngine, type Role } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Avatar } from '@/ui/components/Avatar';
import { Button, Card, Chip, Header, ListRow, Row, Screen, Section, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Member sheet (section 6, Radar tab). */
export default function MemberSheet() {
  const { t } = useTranslation();
  const f = useFormat();
  const { group: groupId, member: memberId } = useLocalSearchParams<{ group: string; member: string }>();
  const detail = useMesh((s) => s.details[groupId]);
  const own = useMesh((s) => s.own);
  const heading = useMesh((s) => s.heading);
  const myPa = useMesh((s) => s.pressurePa);
  const ent = useMesh((s) => s.entitlements[groupId]);
  const m = detail?.members.find((x) => x.id === memberId);
  const now = useNow();
  if (!detail || !m) {
    return (
      <Screen>
        <Header title={t('common.unknown')} />
      </Screen>
    );
  }
  const fr = freshness(Math.max(m.lastHeardMs, m.position?.fixTimeMs ?? 0), now);
  const d = own && m.position ? distanceM(own, m.position) : null;
  const dir = own && m.position ? relativeDirection(relativeBearing(bearingDeg(own, m.position), heading ?? 0)) : null;
  const floors = floorsRelative(m.position?.pressurePa, m.position?.fixTimeMs ?? 0, myPa, now);
  const freshText = fr.labelKey === 'freshness.now' ? t('freshness.now') : t(fr.labelKey, { count: fr.minutes });
  const roles: Exclude<Role, 'leader'>[] = ['member', 'elder', 'child'];
  return (
    <Screen>
      <Header title={m.name} />
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar preset={m.avatarPreset} photo={m.avatarPhoto} colour={m.colour} size={96} dim={fr.state === 'lost'} />
        <Text variant="distance" tabular>
          {d != null ? f.distance(d) : t('member.noPosition')}
        </Text>
        <Text tone="muted">{[dir ? t(`direction.${dir}`) : null, floors ? t(floors.key, { count: floors.floors }) : null, freshText].filter(Boolean).join(', ')}</Text>
      </View>
      <Row style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <Chip label={t(`member.roles.${m.role}`)} icon={m.role === 'leader' ? 'crown' : m.role === 'child' ? 'baby' : m.role === 'elder' ? 'accessibility' : 'user'} />
        {m.position?.battery != null ? <Chip label={t('member.battery', { level: f.number(m.position.battery) })} icon="battery" /> : null}
        {m.hops > 1 ? <Chip label={t('member.hops', { count: m.hops })} icon="route" /> : null}
        {m.via === 'internet' ? <Chip label={t('member.viaInternet')} icon="globe" /> : null}
        {m.via === 'ble' ? <Chip label={t('member.viaBle')} icon="bluetooth" /> : null}
      </Row>
      <Button big icon="navigation" label={t('member.find')} disabled={!m.position} onPress={() => router.push({ pathname: '/find', params: { group: groupId, member: m.id } })} />
      <Button variant="secondary" icon="message-circle" label={t('member.message')} onPress={() => router.push({ pathname: '/chat/[groupId]', params: { groupId, peer: m.id } })} />
      {ent?.breadcrumbs ? <ListRow icon="footprints" title={t('member.trail')} onPress={() => router.push({ pathname: '/group/trail', params: { id: groupId, member: m.id } })} /> : null}
      {m.role === 'child' ? <ListRow icon="ticket" title={t('member.lostCard')} onPress={() => router.push({ pathname: '/me/lost-child', params: { group: groupId, member: m.id } })} /> : null}
      {detail.isLeader && !m.isSelf ? (
        <Card>
          <Section title={t('member.setRole')}>
            <Row style={{ flexWrap: 'wrap' }}>
              {roles.map((r) => (
                <Chip key={r} label={t(`member.roles.${r}`)} selected={m.role === r} onPress={() => void MeshEngine.setRole(groupId, m.id, r)} />
              ))}
            </Row>
          </Section>
          <Button variant="secondary" icon="crown" label={t('member.makeLeader')} onPress={() => void MeshEngine.transferLeader(groupId, m.id)} />
          <Button
            variant="ghost"
            icon="x"
            label={t('member.remove')}
            onPress={async () => {
              await MeshEngine.removeMember(groupId, m.id);
              router.back();
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
