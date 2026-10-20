import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/ThemeProvider';
import { radius, space } from '@/core/theme/tokens';
import { deviceCountry, numbersFor, pick } from '@/features/numbers/numbers';
import { usePacks } from '@/state/packs';
import { startSiren, stopSiren } from '@/features/sound/sound';
import { track } from '@/features/telemetry/telemetry';
import { useFormat } from '@/i18n/format';
import { MeshEngine, type SosKind } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { useProfile } from '@/state/profile';
import { useSettings } from '@/state/settings';
import { Button, Card, Row, Text, Toggle } from '@/ui/components';

const KINDS: SosKind[] = ['medical', 'lost', 'danger', 'general'];
const AUTO_SEND_SEC = 5;

/** SOS flow (E1, E2, flow 3): choose a type (auto-sends after 5 s), then the active SOS screen. */
export default function SosScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const theme = useTheme();
  const { fire, from } = useLocalSearchParams<{ fire?: string; from?: string }>();
  // The notification action counts as the 3-second hold (E1).
  const armed = fire === '1' || from === 'notification';
  const own = useMesh((s) => s.sos.own);
  const sirenDefault = useSettings((s) => s.sirenDefault);
  const [silent, setSilent] = useState(!sirenDefault);
  const [count, setCount] = useState(AUTO_SEND_SEC);
  const sent = useRef(false);

  const send = async (kind: SosKind) => {
    if (sent.current) return;
    sent.current = true;
    const res = await MeshEngine.startSos(kind, silent);
    useMesh.setState((s) => ({ sos: { ...s.sos, own: res } }));
    track('sos_sent', { mode: silent ? 'silent' : 'siren' });
  };

  useEffect(() => {
    if (own || !armed) return;
    const id = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [own, armed]);

  useEffect(() => {
    if (count <= 0 && !own && armed) void send('general');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, own]);

  if (own) return <ActiveSos silentDefault={own.silent} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.sos, padding: space.lg, gap: space.md }}>
      <Text variant="headline" tone="onSos" align="center" accessibilityRole="header">
        {t('sos.chooseTitle')}
      </Text>
      <Text tone="onSos" align="center" accessibilityLiveRegion="polite">
        {t('sos.autoSend', { n: Math.max(0, count) })}
      </Text>
      {KINDS.map((k) => (
        <Button key={k} big variant="secondary" testID={`sos-${k}`} label={t(`sos.kinds.${k}`)} onPress={() => void send(k)} />
      ))}
      <View style={{ backgroundColor: theme.colors.surface, borderRadius: radius.card, padding: space.md }}>
        <Toggle label={t('sos.silent')} hint={t('sos.silentHint')} value={silent} onChange={setSilent} />
      </View>
      <Button variant="ghost" label={t('common.cancel')} style={{ backgroundColor: theme.colors.surface }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </SafeAreaView>
  );
}

function ActiveSos({ silentDefault }: { silentDefault: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const f = useFormat();
  const own = useMesh((s) => s.sos.own);
  const health = useMesh((s) => s.health);
  const card = useProfile((s) => s.card);
  const lang = useSettings((s) => s.language);
  const country = usePacks((s) => s.activeCountry) ?? deviceCountry();
  const numbers = numbersFor(country);
  const [siren, setSiren] = useState(!silentDefault);
  const [strobe, setStrobe] = useState(!silentDefault && !theme.reduceMotion);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (siren) void startSiren();
    else stopSiren();
    return () => stopSiren();
  }, [siren]);

  useEffect(() => {
    if (!strobe) return;
    const id = setInterval(() => setFlash((v) => !v), 400);
    return () => clearInterval(id);
  }, [strobe]);

  useEffect(() => {
    const id = setInterval(async () => {
      const s = await MeshEngine.sosState();
      useMesh.setState((st) => ({ sos: { ...st.sos, own: s.own } }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (!own) return null;
  const bg = strobe && flash ? '#FFFFFF' : theme.colors.sos;
  const fg = strobe && flash ? '#000000' : theme.colors.onSos;
  const rows = (
    [
    [t('card.name'), card.name],
    [t('card.bloodGroup'), card.bloodGroup],
    [t('card.conditions'), card.conditions],
    [t('card.medicines'), card.medicines],
    [t('card.contactName'), card.contactName],
    [t('card.contactPhone'), card.contactPhone],
      [t('card.stay'), card.stay],
    ] as [string, string][]
  ).filter(([, v]) => v.trim());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Text variant="headline" align="center" style={{ color: fg }} accessibilityRole="header">
          {t('sos.activeTitle')}
        </Text>
        <Text align="center" style={{ color: fg }} accessibilityLiveRegion="polite">
          {t('sos.activeBody', { n: f.number(own.broadcasts) })}
        </Text>
        {(health?.neighbours ?? 0) === 0 ? <Text align="center" style={{ color: fg }}>{t('sos.notSentYet')}</Text> : null}
        <Card>
          <Text variant="title">{t('sos.showCard')}</Text>
          {rows.length ? (
            rows.map(([k, v]) => (
              <View key={k}>
                <Text variant="bodySmall" tone="muted">
                  {k}
                </Text>
                <Text variant="title">{v}</Text>
              </View>
            ))
          ) : (
            <Text tone="muted">{t('card.empty')}</Text>
          )}
        </Card>
        {numbers ? (
          <Card>
            <Text variant="title">{t('sos.callNumbers')}</Text>
            {numbers.numbers.map((n) => (
              <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={t('numbers.call', { number: n.number })} onPress={() => void Linking.openURL(`tel:${n.number}`)} style={{ minHeight: 56, justifyContent: 'center' }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ flex: 1 }}>{pick(n.label, lang)}</Text>
                  <Text variant="title" tone="sos" tabular>
                    {n.number}
                  </Text>
                </Row>
              </Pressable>
            ))}
          </Card>
        ) : null}
        <Card>
          <Toggle label={t('sos.siren')} value={siren} onChange={setSiren} />
          <Toggle label={t('sos.strobe')} value={strobe} onChange={setStrobe} />
        </Card>
        <Button
          big
          variant="secondary"
          testID="sos-resolve"
          icon="check-circle"
          label={t('sos.resolve')}
          onPress={() =>
            Alert.alert(t('sos.resolve'), t('sos.resolveConfirm'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.yes'),
                onPress: async () => {
                  await MeshEngine.resolveSos(own.sosId, 'safe');
                  stopSiren();
                  useMesh.setState((s) => ({ sos: { ...s.sos, own: null } }));
                  router.replace('/');
                },
              },
            ])
          }
        />
        <Text variant="caption" align="center" style={{ color: fg }}>
          {t('app.notEmergencyService')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
