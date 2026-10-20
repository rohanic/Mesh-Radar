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
  return (
    <View style={{ gap: space.lg }}>
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
              style={{ padding: 3, borderRadius: radius.pill, borderWidth: 2, borderColor: !p.avatarPhoto && p.avatarPreset === i ? theme.colors.primary : 'transparent' }}>
              <Avatar preset={i} colour={p.colour} size={52} />
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
              style={{ width: theme.touch, height: theme.touch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: p.colour === i ? theme.colors.text : theme.colors.border }}>
              <GroupShapeGlyph shape={g.shape} color={theme.dark ? g.dark : g.light} size={22} />
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
