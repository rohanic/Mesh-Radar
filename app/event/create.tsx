import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';

import { EventPackSchema } from '@/core/packs/schema';
import { MeshEngine } from 'mesh-engine';
import { activeGroup, useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { Button, Chip, Field, Header, Notice, Row, Screen } from '@/ui/components';

const CATEGORIES = ['pilgrimage', 'gathering', 'festival', 'sport', 'music', 'outdoors', 'emergency'] as const;

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

/** Community-made packs (v1.2): written on the phone, shared with the group over the mesh. */
export default function CreatePack() {
  const { t } = useTranslation();
  const install = usePacks((s) => s.install);
  const name = useProfile((s) => s.name);
  const groups = useMesh((s) => s.groups);
  const preferred = useSettings((s) => s.activeGroupId);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('festival');
  const [points, setPoints] = useState('');
  const [dos, setDos] = useState('');
  const [donts, setDonts] = useState('');
  const [checklist, setChecklist] = useState('');
  const [error, setError] = useState<string | null>(null);

  const build = () =>
    EventPackSchema.safeParse({
      id: `community-${Crypto.randomUUID().slice(0, 8)}`,
      version: 1,
      category,
      colors: ['#EEF2F7', '#9A8CFF'],
      icon: 'flag',
      countries: [country.trim().toUpperCase() || 'XX'],
      languages: ['en'],
      title: { en: title.trim() },
      summary: { en: summary.trim() || title.trim() },
      dates: [],
      meetingPoints: lines(points).map((p) => ({ name: { en: p }, detail: { en: p } })),
      dos: lines(dos).map((d) => ({ en: d })),
      donts: lines(donts).map((d) => ({ en: d })),
      schedule: [],
      phrasebook: [],
      checklist: lines(checklist).map((c) => ({ en: c })),
      sources: [],
      verified: false,
      community: { author: name, createdAtMs: Date.now() },
    });

  return (
    <Screen>
      <Header title={t('events.createPack')} />
      <Field label={t('groups.name')} value={title} onChangeText={setTitle} maxLength={60} />
      <Field label={t('events.packs')} value={summary} onChangeText={setSummary} multiline maxLength={300} />
      <Field label={t('numbers.country')} value={country} onChangeText={setCountry} maxLength={2} autoCapitalize="characters" placeholder="PK" />
      <Row style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <Chip key={c} label={t(`events.categories.${c}`)} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </Row>
      <Field label={t('events.meetingPoints')} value={points} onChangeText={setPoints} multiline />
      <Field label={t('events.dos')} value={dos} onChangeText={setDos} multiline />
      <Field label={t('events.donts')} value={donts} onChangeText={setDonts} multiline />
      <Field label={t('events.checklist')} value={checklist} onChangeText={setChecklist} multiline />
      {error ? <Notice tone="warning" text={error} /> : null}
      <Button
        label={t('common.save')}
        onPress={async () => {
          const r = build();
          if (!r.success) {
            setError(t('errors.generic'));
            return;
          }
          install(r.data);
          const g = activeGroup(groups, preferred);
          if (g) await MeshEngine.sharePack(g.id, r.data.id, JSON.stringify(r.data)).catch(() => undefined);
          router.replace({ pathname: '/event/[id]', params: { id: r.data.id } });
        }}
      />
    </Screen>
  );
}
