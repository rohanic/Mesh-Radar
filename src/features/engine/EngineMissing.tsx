import { useTranslation } from 'react-i18next';

import { deviceCountry, dial, numbersFor, openLink, pick } from '@/features/numbers/numbers';
import { useSettings } from '@/state/settings';
import { Button, Card, ListRow, Notice, Screen, Text } from '@/ui/components';

import { PLAY_STORE_URL } from './config';

/**
 * A release build without the native engine (DEC-042). The in-memory fake engine would show a
 * radar and accept an SOS that never leaves the phone, so release builds show this instead. The
 * offline emergency numbers stay reachable (PRD section 10, rule 1).
 */
export function EngineMissing() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const country = numbersFor(deviceCountry());
  return (
    <Screen>
      <Text variant="headline" accessibilityRole="header">
        {t('engineMissing.title')}
      </Text>
      <Text>{t('engineMissing.body')}</Text>
      <Notice tone="sos" text={t('engineMissing.danger')} />
      {country ? (
        <Card>
          <Text variant="title">{t('numbers.title')}</Text>
          {country.numbers.map((n) => (
            <ListRow
              key={n.id}
              icon="phone"
              title={`${t(`numbers.kinds.${n.kind}`)}: ${n.number}`}
              subtitle={pick(n.label, lang)}
              onPress={() => dial(n.number, t('numbers.cannotCall'))}
            />
          ))}
        </Card>
      ) : (
        <Text variant="caption" tone="muted">
          {t('numbers.general112')}
        </Text>
      )}
      <Button icon="download" label={t('engineMissing.store')} onPress={() => openLink(PLAY_STORE_URL)} />
    </Screen>
  );
}
