import { useEffect, useState } from 'react';
import { Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { text } from '@/core/packs/schema';
import { bundledPacks } from '@/features/packs/packs';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { refreshGroups, useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { Avatar } from '@/ui/components/Avatar';
import { Button, Card, Chip, Header, ListRow, Notice, Row, Screen, Section, Text, Toggle } from '@/ui/components';

const SEPARATION = [50, 100, 150, 250, 500];

/** Group manager (Me tab): members and roles, invite, separation alerts, archive, leave. */
export default function GroupManager() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useMesh((s) => s.details[id]);
  const ent = useMesh((s) => s.entitlements[id]);
  const lang = useSettings((s) => s.language);
  const [circle, setCircle] = useState(false);

  useEffect(() => {
    void MeshEngine.familyCircleGroups().then((g) => setCircle(g.includes(id)));
    void MeshEngine.groupDetail(id).then((d) => useMesh.setState((s) => ({ details: { ...s.details, [id]: d } }))).catch(() => undefined);
  }, [id]);

  if (!detail) return null;
  const pack = detail.eventId ? bundledPacks().find((p) => p.id === detail.eventId) : undefined;

  const exportRoster = () => {
    // Organiser roster export (section 10, v1.2): names, roles and last-heard times as CSV.
    const rows = [['name', 'role', 'last_heard'], ...detail.members.map((m) => [m.name, m.role, m.lastHeardMs ? new Date(m.lastHeardMs).toISOString() : ''])];
    void Share.share({ title: detail.name, message: rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n') });
  };

  return (
    <Screen>
      <Header title={detail.name} />
      <Text tone="muted">
        {[t('groups.memberCount', { n: f.number(detail.memberCount), max: f.number(detail.maxMembers) }), pack ? text(pack.title, lang) : null, t(`plans.${detail.tier === 'free' ? 'free' : detail.tier}`)].filter(Boolean).join(', ')}
      </Text>
      {detail.archived ? <Notice text={t('groups.archived')} /> : null}
      <Button icon="qr-code" label={t('groups.inviteTitle')} disabled={detail.archived} onPress={() => router.push({ pathname: '/group/invite', params: { id } })} />

      <Section title={t('groups.members')}>
        <Card>
          {detail.members.map((m) => (
            <ListRow
              key={m.id}
              title={m.isSelf ? `${m.name} (${t('common.you')})` : m.name}
              subtitle={t(`member.roles.${m.role}`)}
              right={<Avatar preset={m.avatarPreset} photo={m.avatarPhoto} colour={m.colour} size={40} />}
              onPress={m.isSelf ? undefined : () => router.push({ pathname: '/member', params: { group: id, member: m.id } })}
            />
          ))}
        </Card>
      </Section>

      {detail.isLeader ? (
        <Section title={t('groups.separation')}>
          <Text variant="caption" tone="muted">
            {t('groups.separationHint')}
          </Text>
          <Row style={{ flexWrap: 'wrap' }}>
            {SEPARATION.map((m) => (
              <Chip key={m} label={f.distance(m)} selected={detail.separationM === m} onPress={() => void MeshEngine.updateGroup(id, { separationM: m })} />
            ))}
          </Row>
        </Section>
      ) : null}

      <ListRow icon="timer" title={t('groups.checkin')} onPress={() => router.push({ pathname: '/group/checkin', params: { id } })} />
      <ListRow icon="trophy" title={t('groups.drill')} onPress={() => router.push({ pathname: '/group/drill', params: { id } })} />
      <ListRow icon="map-pin" title={t('pins.title')} onPress={() => router.push({ pathname: '/pins', params: { group: id } })} />
      {ent?.organiser && detail.isLeader ? <ListRow icon="share" title={t('groups.roster')} onPress={exportRoster} /> : null}

      <Card>
        <Toggle
          label={t('groups.familyCircle')}
          hint={t('groups.familyCircleHint')}
          value={circle}
          onChange={async (on) => {
            if (on && !ent?.familyCircle) {
              router.push('/me/plans');
              return;
            }
            await MeshEngine.setFamilyCircle(id, on);
            setCircle(on);
          }}
        />
      </Card>

      <Button
        variant="secondary"
        icon="archive"
        label={detail.archived ? t('groups.unarchive') : t('groups.archive')}
        onPress={async () => {
          try {
            await MeshEngine.setArchived(id, !detail.archived);
          } catch {
            router.push('/me/plans');
          }
          await refreshGroups();
        }}
      />
      <Button
        variant="ghost"
        icon="log-out"
        label={t('groups.leave')}
        onPress={() =>
          Alert.alert(t('groups.leave'), t('groups.leaveConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('groups.leave'),
              style: 'destructive',
              onPress: async () => {
                await MeshEngine.leaveGroup(id);
                await refreshGroups();
                router.replace('/me/groups');
              },
            },
          ])
        }
      />
    </Screen>
  );
}
