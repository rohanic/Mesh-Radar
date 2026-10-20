import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { cardName } from '@/core/engine/b64';
import { FOUND_PREFIX } from '@/features/groups/handleScan';
import { errorKey } from '@/features/engine/boot';
import { MeshEngine } from 'mesh-engine';
import { useMesh } from '@/state/mesh';
import { Button, Field, Header, Notice, Screen, Text } from '@/ui/components';

/** E6: a stranger scanned a lost-child card. Alerts the family over the mesh, no internet. */
export default function FoundChild() {
  const { t } = useTranslation();
  const { payload } = useLocalSearchParams<{ payload: string }>();
  const running = useMesh((s) => !!s.engine?.running);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  const name = cardName(payload ?? '');
  return (
    <Screen>
      <Header title={t('lostChild.reportTitle')} />
      {name ? <Text variant="headline">{name}</Text> : null}
      <Field label={t('lostChild.reportNote')} value={note} onChangeText={setNote} multiline maxLength={300} />
      {!running ? <Notice tone="warning" text={t('radar.engineOffBody')} /> : null}
      {state === 'sent' ? (
        <Notice tone="success" text={t('lostChild.reportSent')} />
      ) : (
        <Button
          big
          icon="megaphone"
          label={t('lostChild.reportSend')}
          onPress={async () => {
            try {
              if (!running) await MeshEngine.start();
              await MeshEngine.reportFoundChild(FOUND_PREFIX + payload, note.trim());
              setState('sent');
            } catch (e) {
              setErr(t(errorKey(e)));
              setState('error');
            }
          }}
        />
      )}
      {state === 'error' ? <Notice tone="warning" text={err} /> : null}
    </Screen>
  );
}
