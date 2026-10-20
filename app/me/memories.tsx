import { useRef, useState, type ComponentRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { buildMemory } from '@/core/engine/memories';
import { errorKey } from '@/features/engine/boot';
import { MemoryCard } from '@/features/profile/MemoryCard';
import { pickPhoto } from '@/features/profile/avatarPhoto';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { useSocial } from '@/state/social';
import { Button, Card, Field, Header, Notice, Screen, Section, Text } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Trip memories (G1) and moments (G2). */
export default function Memories() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const memories = useSocial((s) => s.memories);
  const groups = useMesh((s) => s.groups);
  const details = useMesh((s) => s.details);
  const myId = useMesh((s) => s.myId);
  const own = useMesh((s) => s.own);
  const ent = useMesh((s) => s.entitlements);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const cards = useRef<Record<string, ComponentRef<typeof View> | null>>({});
  const now = useNow(60_000);

  const make = async (groupId: string) => {
    setMsg(null);
    const d = details[groupId];
    if (!d) return;
    try {
      const track = await MeshEngine.breadcrumbs(groupId, myId, now - 2 * 3_600_000);
      const moments = await MeshEngine.moments(groupId);
      const pts = track.map((p) => ({ lat: p.lat, lon: p.lon, atMs: p.atMs }));
      const memory = buildMemory({
        groupName: d.name,
        eventId: d.eventId,
        startMs: pts[0]?.atMs ?? d.createdAtMs,
        endMs: pts.at(-1)?.atMs ?? now,
        track: pts,
        places: d.pins.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon })),
        members: d.members.map((m) => ({ id: m.id, name: m.name })),
        moments: moments.map((m) => ({ text: m.text, image: m.image, createdAtMs: m.createdAtMs })),
      });
      useSocial.setState((s) => ({ memories: [memory, ...s.memories.filter((x) => x.id !== memory.id)].slice(0, 50) }));
    } catch (e) {
      setMsg(t(errorKey(e)));
    }
  };

  const share = async (id: string) => {
    const v = cards.current[id];
    if (!v) return;
    const uri = await captureRef(v, { format: 'jpg', quality: 0.9 });
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg' });
  };

  const active = groups.filter((g) => !g.archived)[0];
  return (
    <Screen>
      <Header title={t('memories.title')} />
      {active ? (
        <Section title={t('memories.addMoment')}>
          <Card>
            <Field label={t('memories.addMoment')} placeholder={t('memories.momentPlaceholder')} value={note} onChangeText={setNote} multiline maxLength={500} />
            <Button
              variant="secondary"
              icon="image"
              label={t('chat.photo')}
              onPress={async () => {
                const p = await pickPhoto();
                await MeshEngine.sendMoment({ groupId: active.id, note: note.trim(), lat: own?.lat ?? null, lon: own?.lon ?? null, thumbnail: p?.thumb ?? '' });
                setNote('');
              }}
            />
            <Button
              icon="send"
              label={t('common.send')}
              disabled={!note.trim()}
              onPress={async () => {
                await MeshEngine.sendMoment({ groupId: active.id, note: note.trim(), lat: own?.lat ?? null, lon: own?.lon ?? null, thumbnail: '' });
                setNote('');
              }}
            />
          </Card>
        </Section>
      ) : null}
      {groups.map((g) =>
        ent[g.id]?.memories ? (
          <Button key={g.id} variant="secondary" icon="sparkles" label={`${t('memories.make')}: ${g.name}`} onPress={() => void make(g.id)} />
        ) : null,
      )}
      {groups.length && !groups.some((g) => ent[g.id]?.memories) ? (
        <>
          <Notice text={t('memories.locked')} />
          <Button variant="accent" label={t('common.upgrade')} onPress={() => router.push('/me/plans')} />
        </>
      ) : null}
      {msg ? <Notice tone="warning" text={msg} /> : null}
      {memories.length === 0 ? <Text tone="muted">{t('memories.empty')}</Text> : null}
      {memories.map((m) => (
        <View key={m.id} style={{ gap: 8 }}>
          <MemoryCard ref={(v) => void (cards.current[m.id] = v)} memory={m} size={width - 64} />
          <Button variant="secondary" icon="share" label={t('memories.share')} onPress={() => void share(m.id)} />
        </View>
      ))}
    </Screen>
  );
}
