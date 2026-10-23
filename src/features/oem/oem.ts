import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';

import { ANDROID_PACKAGE } from '@/features/engine/config';

// Per-brand "keep Mesh Radar running" guide (section 8). Steps are written as text because OEM
// settings screens move between versions; buttons open only standard Android settings screens.
export type Brand = 'samsung' | 'xiaomi' | 'oppo' | 'vivo' | 'realme' | 'huawei' | 'tecno' | 'generic';

export function brandOf(manufacturer: string | null | undefined): Brand {
  const m = (manufacturer ?? '').toLowerCase();
  if (m.includes('samsung')) return 'samsung';
  if (m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) return 'xiaomi';
  if (m.includes('oppo') || m.includes('oneplus')) return 'oppo';
  if (m.includes('vivo') || m.includes('iqoo')) return 'vivo';
  if (m.includes('realme')) return 'realme';
  if (m.includes('huawei') || m.includes('honor')) return 'huawei';
  if (m.includes('tecno') || m.includes('infinix') || m.includes('itel') || m.includes('transsion')) return 'tecno';
  return 'generic';
}

export function currentBrand(): Brand {
  return brandOf(Device.manufacturer);
}


/** The battery optimisation list (we never request the exemption permission itself, section 9). */
export async function openBatterySettings() {
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    await openAppSettings();
  }
}

export async function openAppSettings() {
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, { data: `package:${ANDROID_PACKAGE}` });
}
