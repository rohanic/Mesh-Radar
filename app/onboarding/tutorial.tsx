import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { destination } from '@/core/engine/geo';
import { space } from '@/core/theme/tokens';
import { RadarCanvas } from '@/features/radar/RadarCanvas';
import { track } from '@/features/telemetry/telemetry';
import { useSettings } from '@/state/settings';
import { Button, Card, Header, Notice, Screen, Text } from '@/ui/components';
import { SosButton } from '@/ui/components/SosButton';

const HERE = { lat: 21.4225, lon: 39.8262 };
const NOW = Date.now();
const DEMO = [
  { id: 'a', name: 'Ammi', colour: 1, avatarPreset: 11, position: destination(HERE, 40, 35), lastMs: NOW, accuracyM: 6 },
  { id: 'b', name: 'Sara', colour: 3, avatarPreset: 5, position: destination(HERE, 200, 18), lastMs: NOW, accuracyM: 4 },
  { id: 'c', name: 'Karim', colour: 4, avatarPreset: 2, position: destination(HERE, 300, 70), lastMs: NOW - 4 * 60_000, accuracyM: 12 },
];

/** A6: 60-second interactive tutorial ending with a practice SOS. Nothing is sent. */
export default function Tutorial() {
  const { t } = useTranslation();
  const set = useSettings((s) => s.set);
  const [step, setStep] = useState(0);
  const [practised, setPractised] = useState(false);
  const finish = () => {
    set({ onboarding: 'done', tutorialDone: practised || useSettings.getState().tutorialDone });
    track('onboarding_done', { result: practised ? 'practised' : 'skipped' });
    router.replace('/');
  };
  const steps = ['onboarding.tutorialStep1', 'onboarding.tutorialStep2', 'onboarding.tutorialStep3', 'onboarding.tutorialStep4'];
  return (
    <Screen
      footer={
        step < 3 ? (
          <>
            <Button testID="tutorial-next" label={t('common.continue')} onPress={() => setStep(step + 1)} />
            <Button variant="ghost" label={t('common.skip')} onPress={finish} />
          </>
        ) : (
          <Button testID="tutorial-finish" label={t('onboarding.tutorialFinish')} onPress={finish} />
        )
      }>
      <Header title={t('onboarding.tutorialTitle')} back={false} />
      <Card>
        <Text>{t(steps[step]!)}</Text>
      </Card>
      {step < 3 ? (
        <View style={{ alignItems: 'center' }}>
          <RadarCanvas own={HERE} heading={0} members={DEMO} pins={[]} crumbs={[]} size={300} demo />
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: space.lg, paddingVertical: space.xl }}>
          <SosButton
            testID="practice-sos"
            onFire={() => {
              setPractised(true);
              set({ tutorialDone: true });
            }}
          />
          {practised ? <Notice tone="success" text={t('onboarding.tutorialPracticeSent')} /> : <Text tone="muted">{t('sos.holdHint')}</Text>}
        </View>
      )}
    </Screen>
  );
}
