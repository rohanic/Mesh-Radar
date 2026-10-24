import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { availableLanguages, language } from '@/i18n/languages';
import { useSettings, type ThemePref } from '@/state/settings';
import { Card, Chip, Header, Notice, Row, Screen, Section, Segmented, Toggle } from '@/ui/components';

/** Theme and language (H2, H3, section 11). */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const s = useSettings();
  const themes: ThemePref[] = ['system', 'light', 'dark', 'sunlight'];
  return (
    <Screen>
      <Header title={t('me.themeLanguage')} />
      <Section title={t('settings.language')}>
        <Row style={{ flexWrap: 'wrap' }}>
          {availableLanguages().map((l) => (
            <Chip
              key={l.code}
              label={l.native}
              selected={s.language === l.code}
              onPress={() => {
                const switching = language(s.language).rtl !== l.rtl;
                const apply = () => s.set({ language: l.code });
                if (switching) Alert.alert(l.native, t('settings.restartRtl'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.continue'), onPress: apply }]);
                else apply();
              }}
            />
          ))}
        </Row>
      </Section>
      <Section title={t('settings.theme')}>
        <Segmented value={s.theme} options={themes.map((v) => ({ value: v, label: t(`settings.themes.${v}`) }))} onChange={(theme) => s.set({ theme })} />
      </Section>
      <Section title={t('settings.units')}>
        <Segmented value={s.units} options={[{ value: 'metric', label: t('settings.metric') }, { value: 'imperial', label: t('settings.imperial') }]} onChange={(units) => s.set({ units })} />
      </Section>
      <Section title={t('settings.numerals')}>
        <Segmented value={s.numerals} options={[{ value: 'western', label: t('settings.western') }, { value: 'eastern_arabic', label: t('settings.eastern_arabic') }]} onChange={(numerals) => s.set({ numerals })} />
      </Section>
      <Card>
        <Toggle testID="elder-toggle" label={t('settings.elder')} hint={t('settings.elderHint')} value={s.elderMode} onChange={(elderMode) => s.set({ elderMode })} />
        <Toggle label={t('settings.sirenDefault')} value={s.sirenDefault} onChange={(sirenDefault) => s.set({ sirenDefault })} />
      </Card>
      {s.theme === 'sunlight' ? <Notice text={t('find.brightness')} /> : null}
    </Screen>
  );
}
