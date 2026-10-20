import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { useFormat } from '@/i18n/format';
import type { Member, Message, Pin } from 'mesh-engine';
import { Text } from '@/ui/components';
import { Icon } from '@/ui/icons/Icon';

/** One message with its D3 delivery state ("Sending", "In the mesh", "Delivered", "Read"). */
export function MessageBubble({
  m,
  sender,
  pins,
  total,
  photoUri,
  onOpenLocation,
  onRequestPhoto,
}: {
  m: Message;
  sender: Member | undefined;
  pins: Pin[];
  total: number;
  photoUri?: string;
  onOpenLocation: (lat: number, lon: number, label: string) => void;
  onRequestPhoto: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const mine = m.outgoing;
  const pin = m.refId ? pins.find((p) => p.id === m.refId) : undefined;
  let body = m.text;
  if (m.kind === 'quick') body = m.quickCode === 4 && pin ? t('chat.meetAt', { pin: pin.name }) : t(`quick.${m.quickCode}`);
  if (m.kind === 'location') body = t('chat.sharedLocation');
  const state =
    mine && m.state !== 'received'
      ? m.read > 0 && total > 1
        ? t('chat.readCount', { n: m.read })
        : m.delivered > 0 && total > 1
          ? t('chat.deliveredCount', { n: m.delivered, total: total - 1 })
          : t(`chat.states.${m.state}`)
      : '';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }} accessible accessibilityLabel={`${mine ? t('common.you') : sender?.name ?? ''}: ${body}. ${state}`}>
      <View
        style={{
          maxWidth: '85%',
          backgroundColor: mine ? theme.colors.primary : theme.colors.surface,
          borderRadius: radius.card,
          padding: space.md,
          gap: space.xs,
          borderWidth: mine ? 0 : 1,
          borderColor: theme.colors.border,
        }}>
        {!mine ? (
          <Text variant="caption" weight="bold" tone="muted">
            {sender?.name ?? t('common.unknown')}
          </Text>
        ) : null}
        {m.image ? (
          <Pressable onPress={photoUri ? undefined : onRequestPhoto} accessibilityRole="imagebutton" accessibilityLabel={t('chat.photo')}>
            <Image source={{ uri: photoUri ?? `data:image/jpeg;base64,${m.image}` }} style={{ width: 200, height: 200, borderRadius: radius.chip }} resizeMode="cover" accessibilityIgnoresInvertColors />
            {!photoUri && m.fullSize > 0 && !mine ? (
              <Text variant="caption" style={{ color: mine ? theme.colors.onPrimary : theme.colors.textMuted }}>
                {t('chat.fullPhoto')}
              </Text>
            ) : null}
          </Pressable>
        ) : null}
        {m.kind === 'moment' ? (
          <Text variant="caption" weight="bold" style={{ color: mine ? theme.colors.onPrimary : theme.colors.accent }}>
            {t('chat.moment')}
          </Text>
        ) : null}
        {body ? (
          <Text weight={m.kind === 'quick' ? 'bold' : 'regular'} style={{ color: mine ? theme.colors.onPrimary : theme.colors.text }}>
            {body}
          </Text>
        ) : null}
        {(m.lat != null && m.lon != null) || pin ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => (pin ? onOpenLocation(pin.lat, pin.lon, pin.name) : onOpenLocation(m.lat!, m.lon!, sender?.name ?? ''))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Icon name="navigation" size={16} color={mine ? theme.colors.onPrimary : theme.colors.primary} />
            <Text variant="bodySmall" weight="bold" style={{ color: mine ? theme.colors.onPrimary : theme.colors.primary }}>
              {t('member.find')}
            </Text>
          </Pressable>
        ) : null}
        <Text variant="caption" style={{ color: mine ? theme.colors.onPrimary : theme.colors.textMuted }}>
          {[f.time(m.createdAtMs), state, !mine && m.hops > 1 ? t('member.hops', { count: m.hops }) : null].filter(Boolean).join(', ')}
        </Text>
      </View>
    </View>
  );
}
