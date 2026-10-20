import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space } from '@/core/theme/tokens';
import { useProfile } from '@/state/profile';
import { Field, Notice, Toggle } from '@/ui/components';
import type { EmergencyCard } from 'mesh-engine';

/** A4: emergency card. The lock-screen copy is opt-in with a clear notice (DEC-025). */
export function CardEditor() {
  const { t } = useTranslation();
  const card = useProfile((s) => s.card);
  const onLock = useProfile((s) => s.cardOnLockScreen);
  const set = useProfile((s) => s.set);
  const field = (key: keyof EmergencyCard, label: string, extra?: object) => (
    <Field label={label} value={card[key]} onChangeText={(v) => set({ card: { ...card, [key]: v } })} {...extra} />
  );
  return (
    <View style={{ gap: space.md }}>
      {field('name', t('card.name'))}
      {field('bloodGroup', t('card.bloodGroup'), { maxLength: 8, autoCapitalize: 'characters' })}
      {field('conditions', t('card.conditions'), { multiline: true, maxLength: 200 })}
      {field('medicines', t('card.medicines'), { multiline: true, maxLength: 200 })}
      {field('contactName', t('card.contactName'), { maxLength: 60 })}
      {field('contactPhone', t('card.contactPhone'), { keyboardType: 'phone-pad', maxLength: 30 })}
      {field('stay', t('card.stay'), { maxLength: 80 })}
      <Toggle testID="card-lockscreen" label={t('card.lockScreen')} hint={t('card.lockScreenHint')} value={onLock} onChange={(v) => set({ cardOnLockScreen: v })} />
      {onLock ? <Notice tone="warning" text={t('card.lockScreenHint')} /> : null}
    </View>
  );
}
