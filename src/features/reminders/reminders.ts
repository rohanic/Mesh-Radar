import * as Notifications from 'expo-notifications';

import { nextDate, text, type EventPack } from '@/core/packs/schema';
import i18n from '@/i18n';

// Event-day reminders (F3, section 9): the mesh does not auto-start after a reboot, so we remind
// the person to tap Start on event days. Local notifications only; nothing leaves the phone.

const PREFIX = 'event-day-';

export async function scheduleEventReminders(pack: EventPack, lang: string | null): Promise<number> {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return 0;
  await cancelEventReminders(pack.id);
  const next = nextDate(pack, Date.now());
  if (!next) return 0;
  const start = Date.parse(`${next.start}T00:00:00`);
  const end = Date.parse(`${next.end}T00:00:00`);
  let n = 0;
  for (let day = start; day <= end && n < 14; day += 86_400_000) {
    const at = new Date(day + 7 * 3_600_000);
    if (at.getTime() < Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${pack.id}-${n}`,
      content: { title: text(pack.title, lang), body: i18n.t('radar.engineOffBody'), data: { url: 'meshradar://radar' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    n++;
  }
  return n;
}

export async function cancelEventReminders(packId: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((r) => r.identifier.startsWith(`${PREFIX}${packId}-`)).map((r) => Notifications.cancelScheduledNotificationAsync(r.identifier)));
}
