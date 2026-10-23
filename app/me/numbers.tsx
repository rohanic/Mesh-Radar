import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { allCountries, deviceCountry, dial, pick } from '@/features/numbers/numbers';
import { usePacks } from '@/state/packs';
import { useSettings } from '@/state/settings';
import { Card, Chip, Header, ListRow, Notice, Row, Screen, Text } from '@/ui/components';

/** Offline emergency numbers by country and event (E5). Always free (rule 1). */
export default function Numbers() {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.language);
  const active = usePacks((s) => s.activeCountry);
  const countries = allCountries();
  const [code, setCode] = useState(active ?? deviceCountry() ?? countries[0]?.code ?? '');
  const c = countries.find((x) => x.code === code) ?? countries[0];
  return (
    <Screen>
      <Header title={t('numbers.title')} />
      <Notice text={t('numbers.worksOffline')} />
      <Row style={{ flexWrap: 'wrap' }}>
        {countries.map((x) => (
          <Chip key={x.code} label={pick(x.name, lang)} selected={x.code === c?.code} onPress={() => setCode(x.code)} />
        ))}
      </Row>
      {c ? (
        <Card>
          <Text variant="title">{pick(c.name, lang)}</Text>
          {c.numbers.map((n) => (
            <ListRow
              key={n.id}
              icon="phone"
              title={`${t(`numbers.kinds.${n.kind}`)}: ${n.number}`}
              subtitle={pick(n.label, lang)}
              onPress={() => dial(n.number, t('numbers.cannotCall'))}
            />
          ))}
          {c.note ? <Text variant="caption" tone="muted">{pick(c.note, lang)}</Text> : null}
          {c.numbers.some((n) => !n.verified) ? <Text variant="caption" tone="warning">{t('numbers.unverified')}</Text> : null}
        </Card>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('numbers.general112')}
      </Text>
    </Screen>
  );
}
