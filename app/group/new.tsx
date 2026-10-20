import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { text } from '@/core/packs/schema';
import { useTheme } from '@/core/theme/ThemeProvider';
import { groupColours, radius, space } from '@/core/theme/tokens';
import { errorKey } from '@/features/engine/boot';
import { bundledPacks } from '@/features/packs/packs';
import { track } from '@/features/telemetry/telemetry';
import { MeshEngine } from 'mesh-engine';
import { refreshGroups } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { GroupShapeGlyph } from '@/ui/components/Avatar';
import { Button, Chip, Field, Header, Notice, Row, Screen, Section, Toggle } from '@/ui/components';
import { useNow } from '@/ui/useNow';

/** Create a group (B1): name, optional event (auto-archive after it, B6) and colour (B5). */
export default function NewGroup() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const lang = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const [name, setName] = useState('');
  const [eventId, setEventId] = useState('');
  const [archive, setArchive] = useState(true);
  const [colour, setColour] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const packs = bundledPacks();
  const pack = packs.find((p) => p.id === eventId);
  const now = useNow(60_000);
  const end = pack?.dates.map((d) => Date.parse(`${d.end}T23:59:59Z`)).filter((ms) => ms > now).sort()[0];

  return (
    <Screen
      footer={
        <Button
          testID="group-create"
          label={t('groups.create')}
          disabled={!name.trim()}
          onPress={async () => {
            try {
              const g = await MeshEngine.createGroup({ name: name.trim(), eventId, expiresAtMs: archive && end ? end + 86_400_000 : 0, colour });
              await refreshGroups();
              set({ activeGroupId: g.id, ...(onboarding === '1' ? { onboarding: 'tutorial' as const } : {}) });
              track('group_created', { method: eventId ? 'event' : 'plain' });
              router.replace({ pathname: '/group/invite', params: { id: g.id, onboarding } });
            } catch (e) {
              setError(t(errorKey(e)));
            }
          }}
        />
      }>
      <Header title={t('groups.createTitle')} />
      <Field testID="group-name" label={t('groups.name')} placeholder={t('groups.namePlaceholder')} value={name} onChangeText={setName} maxLength={40} />
      <Section title={t('groups.event')}>
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label={t('groups.noEvent')} selected={!eventId} onPress={() => setEventId('')} />
          {packs.map((p) => (
            <Chip key={p.id} label={text(p.title, lang)} selected={eventId === p.id} onPress={() => setEventId(p.id)} />
          ))}
        </Row>
        {eventId && end ? <Toggle label={t('groups.expires')} value={archive} onChange={setArchive} /> : null}
      </Section>
      <Section title={t('groups.colour')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {groupColours.map((g, i) => (
            <Pressable
              key={g.name}
              accessibilityRole="button"
              accessibilityLabel={g.name}
              accessibilityState={{ selected: colour === i }}
              onPress={() => setColour(i)}
              style={{ width: theme.touch, height: theme.touch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colour === i ? theme.colors.text : theme.colors.border }}>
              <GroupShapeGlyph shape={g.shape} color={theme.dark ? g.dark : g.light} size={22} />
            </Pressable>
          ))}
        </View>
      </Section>
      {error ? (
        <>
          <Notice tone="warning" text={error} />
          <Button variant="accent" label={t('common.upgrade')} onPress={() => router.push('/me/plans')} />
        </>
      ) : null}
    </Screen>
  );
}
