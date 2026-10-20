import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useMesh } from '@/state/mesh';
import { GroupShapeGlyph } from '@/ui/components/Avatar';
import { Button, Card, Header, ListRow, Screen, Text } from '@/ui/components';
import { useTheme } from '@/core/theme/ThemeProvider';

/** Chat tab: group list (section 6). */
export default function ChatTab() {
  const { t } = useTranslation();
  const theme = useTheme();
  const groups = useMesh((s) => s.groups);
  const unread = useMesh((s) => s.unread);
  const messages = useMesh((s) => s.messages);
  return (
    <Screen>
      <Header title={t('chat.title')} back={false} />
      {groups.length === 0 ? (
        <Card>
          <Text>{t('radar.noGroupBody')}</Text>
          <Button label={t('onboarding.createGroup')} onPress={() => router.push('/group/new')} />
        </Card>
      ) : null}
      {groups.map((g) => {
        const last = messages[g.id]?.at(-1);
        const n = unread[g.id] ?? 0;
        const c = theme.groupColour(g.colour);
        return (
          <Card key={g.id}>
            <ListRow
              testID={`chat-${g.id}`}
              title={g.archived ? `${g.name} (${t('groups.archived')})` : g.name}
              subtitle={last ? (last.kind === 'quick' ? t(`quick.${last.quickCode}`) : last.text || t(`chat.${last.kind === 'image' ? 'photo' : 'moment'}`)) : t('chat.empty')}
              right={
                n > 0 ? (
                  <Text weight="bold" tone="primary">
                    {n}
                  </Text>
                ) : (
                  <GroupShapeGlyph shape={c.shape} color={c.color} size={16} />
                )
              }
              onPress={() => router.push({ pathname: '/chat/[groupId]', params: { groupId: g.id } })}
            />
          </Card>
        );
      })}
    </Screen>
  );
}
