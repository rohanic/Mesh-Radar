import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { groupColours, radius, space } from '@/core/theme/tokens';
import { useProfile } from '@/state/profile';
import { AVATAR_PRESETS, Avatar, GroupShapeGlyph } from '@/ui/components/Avatar';
import { Button, Field, Section, Text } from '@/ui/components';
import { pickAvatarPhoto } from './avatarPhoto';

/** A3: display name, avatar (preset illustration or photo under 4 KB) and colour. */
export function ProfileEditor() {
  const { t } = useTranslation();
  const theme = useTheme();
  const p = useProfile();
  // Even columns at any width: 4 across on phones, 6 on tablets and unfolded foldables.
  const [width, setWidth] = useState(0);
  const cols = width >= 520 ? 6 : 4;
  const cell = width > 0 ? Math.floor((width - space.sm * (cols - 1)) / cols) : 64;
  return (
    <View style={{ gap: space.lg }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ alignItems: 'center' }}>
        <Avatar preset={p.avatarPreset} photo={p.avatarPhoto} colour={p.colour} size={112} />
      </View>
      <Field testID="name-field" label={t('onboarding.nameLabel')} placeholder={t('onboarding.namePlaceholder')} value={p.name} maxLength={40} onChangeText={(name) => p.set({ name })} />
      <Section title={t('onboarding.pickAvatar')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {Array.from({ length: AVATAR_PRESETS }, (_, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={t('avatar.label', { n: i + 1 })}
              accessibilityState={{ selected: !p.avatarPhoto && p.avatarPreset === i }}
              onPress={() => p.set({ avatarPreset: i, avatarPhoto: null })}
              style={{ width: cell, alignItems: 'center' }}>
              <View style={{ padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: !p.avatarPhoto && p.avatarPreset === i ? theme.colors.primary : 'transparent' }}>
                <Avatar preset={i} colour={p.colour} size={Math.min(cell - 10, 88)} />
              </View>
            </Pressable>
          ))}
        </View>
        <Button
          variant="secondary"
          icon="image"
          label={t('onboarding.usePhoto')}
          onPress={async () => {
            const photo = await pickAvatarPhoto();
            if (photo) p.set({ avatarPhoto: photo });
          }}
        />
      </Section>
      <Section title={t('onboarding.pickColour')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {groupColours.map((g, i) => (
            <Pressable
              key={g.name}
              accessibilityRole="button"
              accessibilityLabel={g.name}
              accessibilityState={{ selected: p.colour === i }}
              onPress={() => p.set({ colour: i })}
              style={{ width: cell, alignItems: 'center' }}>
              <View style={{ width: theme.touch + 8, height: theme.touch + 8, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: p.colour === i ? theme.colors.text : theme.colors.border, backgroundColor: p.colour === i ? theme.colors.surface : 'transparent' }}>
                <GroupShapeGlyph shape={g.shape} color={theme.dark ? g.dark : g.light} size={24} />
              </View>
            </Pressable>
          ))}
        </View>
      </Section>
      <Text variant="caption" tone="muted">
        {t('onboarding.profileBody')}
      </Text>
    </View>
  );
}
