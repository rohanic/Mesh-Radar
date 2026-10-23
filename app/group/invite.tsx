import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { refreshGroups, useMesh } from '@/state/mesh';
import { Avatar } from '@/ui/components/Avatar';
import { QRCode } from '@/ui/components/QRCode';
import { Button, Card, Header, Notice, Row, Screen, Text } from '@/ui/components';

/** Invite (B1, B2): a big QR with the group key, or a 6-digit code while this phone is nearby. */
export default function Invite() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id, onboarding } = useLocalSearchParams<{ id: string; onboarding?: string }>();
  const group = useMesh((s) => s.groups.find((g) => g.id === id));
  const requests = useMesh(useShallow((s) => s.joinRequests.filter((r) => r.groupId === id)));
  const running = useMesh((s) => !!s.engine?.running);
  const [payload, setPayload] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    void MeshEngine.invitePayload(id).then(setPayload);
    return () => void MeshEngine.closeJoinWindow(id);
  }, [id]);

  if (!group) return null;
  const full = group.memberCount >= group.maxMembers;
  return (
    <Screen
      footer={
        <Button
          label={t('common.done')}
          onPress={() => (onboarding === '1' ? router.replace('/onboarding/tutorial') : router.canGoBack() ? router.back() : router.replace('/'))}
        />
      }>
      <Header title={t('groups.inviteTitle')} />
      <Text tone="muted">{t('groups.inviteBody')}</Text>
      <Text weight="bold">{t('groups.memberCount', { n: f.number(group.memberCount), max: f.number(group.maxMembers) })}</Text>
      {full ? (
        <Notice tone="warning" text={t('groups.full', { name: group.name })} />
      ) : payload ? (
        <View style={{ alignItems: 'center', padding: space.md, backgroundColor: '#FFFFFF', borderRadius: 20 }}>
          <QRCode value={payload} size={280} label={t('groups.inviteTitle')} />
        </View>
      ) : null}
      {!full ? (
        <Card>
          <Text weight="bold">{t('groups.code')}</Text>
          {code ? (
            <>
              <Text variant="findDistance" align="center" tabular accessibilityLabel={code.split('').join(' ')}>
                {f.digits(`${code.slice(0, 3)} ${code.slice(3)}`)}
              </Text>
              <Text tone="muted">{t('groups.codeBody', { code })}</Text>
            </>
          ) : (
            <Button variant="secondary" label={t('groups.getCode')} onPress={async () => setCode(await MeshEngine.openJoinWindow(id))} />
          )}
          {!running && code ? <Notice tone="warning" text={t('radar.engineOffBody')} /> : null}
        </Card>
      ) : null}
      {requests.map((r) => (
        <Card key={r.requestId} tone="accent">
          <Row>
            <Avatar preset={r.avatarPreset} colour={r.colour} size={48} />
            <Text style={{ flex: 1 }}>{t('groups.requestTitle', { name: r.name, group: group.name })}</Text>
          </Row>
          <Row>
            <Button
              style={{ flex: 1 }}
              label={t('common.accept')}
              onPress={async () => {
                await MeshEngine.answerJoin(r.requestId, true);
                useMesh.setState((s) => ({ joinRequests: s.joinRequests.filter((x) => x.requestId !== r.requestId) }));
                await refreshGroups();
              }}
            />
            <Button
              style={{ flex: 1 }}
              variant="secondary"
              label={t('common.decline')}
              onPress={async () => {
                await MeshEngine.answerJoin(r.requestId, false);
                useMesh.setState((s) => ({ joinRequests: s.joinRequests.filter((x) => x.requestId !== r.requestId) }));
              }}
            />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
