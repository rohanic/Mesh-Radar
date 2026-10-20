import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { errorKey } from '@/features/engine/boot';
import { startMesh } from '@/features/permissions/permissions';
import { track } from '@/features/telemetry/telemetry';
import { MeshEngine } from 'mesh-engine';
import { refreshGroups, useMesh } from '@/state/mesh';
import { useSettings } from '@/state/settings';
import { Button, Card, Field, Header, Notice, Screen, Text } from '@/ui/components';

/** Join (B1): scan the QR, or type the 6-digit code while the creator's phone is in range (B2). */
export default function JoinGroup() {
  const { t } = useTranslation();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const set = useSettings((s) => s.set);
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const result = useMesh((s) => (requestId ? s.joinResults[requestId] : undefined));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result?.ok || !result.groupId) return;
    void refreshGroups();
    set({ activeGroupId: result.groupId, ...(onboarding === '1' ? { onboarding: 'tutorial' as const } : {}) });
    track('group_joined', { method: 'code' });
    router.replace(onboarding === '1' ? '/onboarding/tutorial' : '/');
  }, [result, onboarding, set]);
  const failed = result && !result.ok ? t(`groups.reasons.${result.reason ?? 'timeout'}`) : null;
  const waiting = !!requestId && !result;

  return (
    <Screen>
      <Header title={t('groups.joinTitle')} />
      <Button big icon="scan-line" label={t('groups.scan')} onPress={() => router.push({ pathname: '/scan', params: { onboarding } })} />
      <Card>
        <Text weight="bold">{t('groups.enterCode')}</Text>
        <Field testID="join-code" label={t('groups.codeLabel')} value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
        {waiting ? (
          <Notice text={t('groups.joining')} />
        ) : (
          <Button
            label={t('onboarding.joinGroup')}
            disabled={code.length !== 6}
            onPress={async () => {
              setError(null);
              try {
                if (!(await startMesh())) {
                  router.push('/onboarding/permissions');
                  return;
                }
                setRequestId(await MeshEngine.requestJoinByCode(code));
              } catch (e) {
                setError(t(errorKey(e)));
              }
            }}
          />
        )}
        {waiting ? <Button variant="ghost" label={t('common.cancel')} onPress={() => void MeshEngine.cancelJoin(requestId).then(() => setRequestId(null))} /> : null}
      </Card>
      {error || failed ? <Notice tone="warning" text={`${t('groups.joinFailed')}. ${failed ?? error}`} /> : null}
    </Screen>
  );
}
