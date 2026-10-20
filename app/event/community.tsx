import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { text } from '@/core/packs/schema';
import { createPost, fetchPosts, reportPost, type CommunityPost } from '@/features/community/community';
import { bundledPacks } from '@/features/packs/packs';
import { useFormat } from '@/i18n/format';
import { MeshEngine } from 'mesh-engine';
import { usePacks } from '@/state/packs';
import { useSettings } from '@/state/settings';
import { Button, Card, Chip, Field, Header, Notice, Row, Screen, Text } from '@/ui/components';

/** Event community (G7): opt-in, online only, public posts with report and hide. */
export default function Community() {
  const { t } = useTranslation();
  const f = useFormat();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lang = useSettings((s) => s.language);
  const joined = usePacks((s) => s.communities.includes(id));
  const set = usePacks((s) => s.set);
  const communities = usePacks((s) => s.communities);
  const pack = usePacks((s) => s.installed[id]) ?? bundledPacks().find((p) => p.id === id);
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(async () => setPosts(await fetchPosts(id)), [id]);
  useFocusEffect(
    useCallback(() => {
      if (joined) void load();
    }, [joined, load]),
  );

  return (
    <Screen>
      <Header title={`${t('community.title')}: ${pack ? text(pack.title, lang) : id}`} />
      <Text tone="muted">{t('community.body')}</Text>
      <Notice text={t('community.rules')} />
      {!joined ? (
        <Button label={t('community.optIn')} onPress={() => set({ communities: [...communities, id] })} />
      ) : (
        <>
          {posts === null ? <Notice tone="warning" text={t('community.offline')} /> : null}
          <Card>
            <Field label={t('community.city')} value={city} onChangeText={setCity} maxLength={60} />
            <Field label={t('community.post')} placeholder={t('community.placeholder')} value={draft} onChangeText={setDraft} multiline maxLength={500} />
            <Button
              label={t('community.post')}
              disabled={!draft.trim()}
              onPress={async () => {
                const author = (await MeshEngine.eventPublicKey(id)).slice(0, 16);
                if (await createPost(id, author, draft.trim(), city.trim())) {
                  setDraft('');
                  await load();
                }
              }}
            />
          </Card>
          {(posts ?? [])
            .filter((p) => !hidden.includes(p.author))
            .map((p) => (
              <Card key={p.id}>
                <Text>{p.text}</Text>
                <Text variant="caption" tone="muted">
                  {[p.city, f.dateTime(p.atMs)].filter(Boolean).join(', ')}
                </Text>
                <Row>
                  <Chip
                    label={t('community.report')}
                    onPress={async () => {
                      const me = (await MeshEngine.eventPublicKey(id)).slice(0, 16);
                      await reportPost(id, p.id, me);
                      setHidden((h) => [...h, p.author]);
                    }}
                  />
                  <Chip label={t('community.block')} onPress={() => setHidden((h) => [...h, p.author])} />
                </Row>
              </Card>
            ))}
        </>
      )}
    </Screen>
  );
}
