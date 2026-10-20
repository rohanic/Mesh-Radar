import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { space } from '@/core/theme/tokens';
import { MeshEngine } from 'mesh-engine';
import { activeGroup, useMesh } from '@/state/mesh';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { QRCode } from '@/ui/components/QRCode';
import { Button, Chip, Header, Notice, Row, Screen, Text } from '@/ui/components';

/** Lost-child card (E6): lock-screen wallpaper and printable card with the guardian's code. */
export default function LostChildCard() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ group?: string; member?: string }>();
  const groups = useMesh((s) => s.groups);
  const details = useMesh((s) => s.details);
  const preferred = useSettings((s) => s.activeGroupId);
  const guardian = useProfile((s) => s.name);
  const contact = useProfile((s) => s.card.contactPhone);
  const group = params.group ? groups.find((g) => g.id === params.group) : activeGroup(groups, preferred);
  const children = group ? (details[group.id]?.members ?? []).filter((m) => m.role === 'child' || m.id === params.member) : [];
  const [memberId, setMemberId] = useState(params.member ?? children[0]?.id ?? '');
  const [payload, setPayload] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const card = useRef<ComponentRef<typeof View>>(null);
  const child = children.find((m) => m.id === memberId);

  useEffect(() => {
    if (group && memberId) void MeshEngine.lostChildPayload(group.id, memberId).then(setPayload);
  }, [group, memberId]);

  if (!group) return <Notice text={t('radar.noGroupBody')} />;
  return (
    <Screen>
      <Header title={t('lostChild.title')} />
      <Text>{t('lostChild.body')}</Text>
      <Row style={{ flexWrap: 'wrap' }}>
        {children.map((m) => (
          <Chip key={m.id} label={m.name} selected={m.id === memberId} onPress={() => setMemberId(m.id)} />
        ))}
      </Row>
      {children.length === 0 ? <Notice text={t('member.setRole')} /> : null}
      {payload && child ? (
        <View ref={card} collapsable={false} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: space.xl, alignItems: 'center', gap: space.md }}>
          <Text variant="headline" style={{ color: '#000000' }}>
            {child.name}
          </Text>
          <QRCode value={payload} size={240} label={t('lostChild.scanToHelp')} />
          <Text align="center" style={{ color: '#000000' }}>
            {t('lostChild.scanToHelp')}
          </Text>
          <Text style={{ color: '#000000' }}>{`${t('lostChild.guardian')}: ${guardian}${contact ? `, ${contact}` : ''}`}</Text>
        </View>
      ) : null}
      {payload && child ? (
        <>
          <Button
            icon="printer"
            label={t('lostChild.print')}
            onPress={async () => {
              if (!card.current) return;
              const b64 = await captureRef(card.current, { format: 'png', result: 'base64' });
              await Print.printAsync({ html: `<html><body style="text-align:center"><img src="data:image/png;base64,${b64}" style="width:90%"/></body></html>` });
            }}
          />
          <Button
            variant="secondary"
            icon="wallpaper"
            label={t('lostChild.wallpaper')}
            onPress={async () => {
              if (!card.current) return;
              const uri = await captureRef(card.current, { format: 'png' });
              setMsg((await MeshEngine.setLockWallpaper(uri)) ? t('lostChild.wallpaperDone') : t('lostChild.wallpaperFailed'));
            }}
          />
        </>
      ) : null}
      {msg ? <Notice text={msg} /> : null}
    </Screen>
  );
}
