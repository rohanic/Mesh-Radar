import { ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { QUICK_REPLIES, type QuickReply } from '@/core/engine/quickReplies';
import { space } from '@/core/theme/tokens';
import type { IconName } from '../icons/Icon';
import { Chip } from './Layout';

/** Quick-reply chips (D2, section 7): sendable in 2 taps. */
export function QuickReplyTray({ onPick }: { onPick: (q: QuickReply) => void }) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.xs }}>
      {QUICK_REPLIES.map((q) => (
        <Chip key={q.code} testID={`quick-${q.code}`} label={t(q.key)} icon={q.icon as IconName} onPress={() => onPick(q)} />
      ))}
    </ScrollView>
  );
}
