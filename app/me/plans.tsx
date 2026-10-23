import { useEffect, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';
import { useIAP } from 'expo-iap';
import { useTranslation } from 'react-i18next';

import { FIRST_PILGRIMAGE_EVENTS, ORGANISER_PRODUCTS } from '@/core/engine/tiers';
import { claimFirstPilgrimage, ONE_TIME_SKUS, redeem, restore, SUB_SKUS } from '@/features/billing/billing';
import { useFormat } from '@/i18n/format';
import { useMesh } from '@/state/mesh';
import { usePacks } from '@/state/packs';
import { usePurchases } from '@/state/purchases';
import { Button, Card, Header, Notice, Screen, Text } from '@/ui/components';

/** Google Play Billing is present only in the Android build, not in Expo Go or tests. */
const HAS_BILLING = requireOptionalNativeModule('ExpoIap') != null;

/** Plans (section 10). Safety features are free forever; one payer unlocks the whole group. */
export default function Plans() {
  return HAS_BILLING ? <StorePlans /> : <NoBilling />;
}

function NoBilling() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Header title={t('plans.title')} />
      <Text>{t('plans.body')}</Text>
      <Card tone="accent">
        <Text variant="title">{t('plans.free')}</Text>
        <Text tone="muted">{t('plans.freeBody')}</Text>
      </Card>
      <Notice text={t('plans.storeOnly')} />
    </Screen>
  );
}

function StorePlans() {
  const { t } = useTranslation();
  const f = useFormat();
  const ent = useMesh((s) => s.entitlements.me);
  const eventId = usePacks((s) => s.activeEventId);
  const claimed = usePurchases((s) => s.firstPilgrimageClaimed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { connected, products, subscriptions, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: async (p) => {
      const ok = await redeem(p);
      if (ok) await finishTransaction({ purchase: p, isConsumable: !SUB_SKUS.includes(p.productId) });
      setBusy(false);
      setMsg(ok ? t('plans.purchased') : t('plans.error'));
    },
    onPurchaseError: () => {
      setBusy(false);
      setMsg(t('plans.error'));
    },
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: ONE_TIME_SKUS, type: 'in-app' });
    void fetchProducts({ skus: SUB_SKUS, type: 'subs' });
  }, [connected, fetchProducts]);

  const price = (sku: string) => products.find((p) => p.id === sku)?.displayPrice ?? subscriptions.find((p) => p.id === sku)?.displayPrice;

  const buy = async (sku: string, subs: boolean) => {
    setBusy(true);
    setMsg(null);
    const sub = subscriptions.find((s) => s.id === sku);
    const offer = sub?.subscriptionOffers?.[0];
    await requestPurchase(
      subs
        ? { type: 'subs', request: { google: { skus: [sku], subscriptionOffers: offer?.offerTokenAndroid ? [{ sku, offerToken: offer.offerTokenAndroid }] : [] } } }
        : { type: 'in-app', request: { google: { skus: [sku] } } },
    ).catch(() => {
      setBusy(false);
      setMsg(t('plans.error'));
    });
  };

  const tier = ent?.myTier ?? 'free';
  return (
    <Screen>
      <Header title={t('plans.title')} />
      <Text>{t('plans.body')}</Text>
      <Notice text={t('plans.current', { tier: t(`plans.${tier}`) })} />
      <Card tone={tier === 'free' ? 'accent' : undefined}>
        <Text variant="title">{t('plans.free')}</Text>
        <Text tone="muted">{t('plans.freeBody')}</Text>
      </Card>
      <Card>
        <Text variant="title">{t('plans.event_pass')}</Text>
        <Text tone="muted">{t('plans.event_passBody')}</Text>
        <Button testID="buy-event-pass" label={t('plans.buy', { price: price('event_pass_14d') ?? '' })} loading={busy} disabled={!connected} onPress={() => void buy('event_pass_14d', false)} />
      </Card>
      <Card>
        <Text variant="title">{t('plans.family_plus')}</Text>
        <Text tone="muted">{t('plans.family_plusBody')}</Text>
        <Button label={t('plans.buy', { price: price('family_plus_yearly') ?? '' })} loading={busy} disabled={!connected} onPress={() => void buy('family_plus_yearly', true)} />
      </Card>
      <Card>
        <Text variant="title">{t('plans.organiser')}</Text>
        <Text tone="muted">{t('plans.organiserBody')}</Text>
        {ORGANISER_PRODUCTS.map((p) => (
          <Button key={p.productId} variant="secondary" label={`${f.number(p.members)}: ${t('plans.buy', { price: price(p.productId) ?? '' })}`} disabled={!connected || busy} onPress={() => void buy(p.productId, false)} />
        ))}
      </Card>
      {eventId && FIRST_PILGRIMAGE_EVENTS.includes(eventId) && !claimed && tier === 'free' ? (
        <Card tone="accent">
          <Text weight="bold">{t('plans.firstPilgrimage')}</Text>
          <Button
            variant="accent"
            label={t('plans.claim')}
            onPress={async () => {
              setMsg((await claimFirstPilgrimage(eventId)) ? t('plans.purchased') : t('plans.error'));
            }}
          />
        </Card>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('plans.offline')}
      </Text>
      {msg ? <Notice text={msg} /> : null}
      <Button
        variant="ghost"
        label={t('plans.restore')}
        onPress={async () => {
          setBusy(true);
          const n = await restore();
          setBusy(false);
          setMsg(n > 0 ? t('plans.purchased') : t('plans.error'));
        }}
      />
    </Screen>
  );
}
