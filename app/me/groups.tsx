import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { useFormat } from '@/i18n/format';
import { useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { GroupShapeGlyph } from '@/ui/components/Avatar';
import { Button, Card, Header, ListRow, Screen } from '@/ui/components';

/** Groups manager (B5): several groups at once, each with its own colour and shape. */
export default function GroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const groups = useMesh((s) => s.groups);
  const active = useSettings((s) => s.activeGroupId);
  const set = useSettings((s) => s.set);
  return (
    <Screen>
      <Header title={t('groups.title')} />
      {groups.map((g) => {
        const c = theme.groupColour(g.colour);
        return (
          <Card key={g.id} tone={g.id === active ? 'accent' : undefined}>
            <ListRow
              title={g.archived ? `${g.name} (${t('groups.archived')})` : g.name}
              subtitle={t('groups.memberCount', { n: f.number(g.memberCount), max: f.number(g.maxMembers) })}
              right={<GroupShapeGlyph shape={c.shape} color={c.color} size={18} />}
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
            />
            {!g.archived && g.id !== active ? <Button variant="secondary" icon="radar" label={t('tabs.radar')} onPress={() => set({ activeGroupId: g.id })} /> : null}
          </Card>
        );
      })}
      <Button icon="plus" label={t('onboarding.createGroup')} onPress={() => router.push('/group/new')} />
      <Button variant="secondary" icon="qr-code" label={t('onboarding.joinGroup')} onPress={() => router.push('/group/join')} />
    </Screen>
  );
}
