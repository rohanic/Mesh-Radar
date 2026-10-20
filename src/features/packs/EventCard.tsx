import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { countdownDays, nextDate, text, type EventPack } from '@/core/packs/schema';
import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import { useSettings } from '@/state/settings';
import { Card, Row, Text } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icons/Icon';
import { useNow } from '@/ui/useNow';

/** Event card (section 7): soft gradient per event with a countdown. */
export function EventCard({ pack, installed, onPress }: { pack: EventPack; installed: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const lang = useSettings((s) => s.language);
  const now = useNow(60_000);
  const next = nextDate(pack, now);
  const days = next ? countdownDays(next.start, next.end, now) : null;
  const countdown = days == null ? null : days === 0 ? t('events.now') : t('events.countdown', { count: days });
  return (
    <Card onPress={onPress} accessibilityLabel={`${text(pack.title, lang)}${countdown ? `, ${countdown}` : ''}`} style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ height: 72, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, overflow: 'hidden' }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={`g-${pack.id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={pack.colors[0]} />
              <Stop offset="1" stopColor={pack.colors[1]} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#g-${pack.id})`} />
        </Svg>
        <View style={{ position: 'absolute', left: space.lg, top: space.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={pack.icon as IconName} color={theme.colors.text} />
        </View>
      </View>
      <View style={{ padding: space.lg, gap: space.xs }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="title" style={{ flex: 1 }}>
            {text(pack.title, lang)}
          </Text>
          {installed ? <Icon name="check-circle" color={theme.colors.success} size={20} /> : null}
        </Row>
        <Text variant="bodySmall" tone="muted" numberOfLines={2}>
          {text(pack.summary, lang)}
        </Text>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="caption" tone="muted">
            {t(`events.categories.${pack.category}`)}
          </Text>
          {countdown ? (
            <Text variant="caption" weight="bold" tone="primary">
              {next?.approx ? `${countdown} (${t('common.approx')})` : countdown}
            </Text>
          ) : null}
        </Row>
        {next && days != null && days > 0 ? (
          <Text variant="caption" tone="muted">
            {f.date(Date.parse(`${next.start}T00:00:00Z`))}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
