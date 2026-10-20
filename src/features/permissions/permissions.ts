import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { MeshEngine } from 'mesh-engine';

// Guided permission flow (A5, section 9). Each group is asked with a one-line reason.
export type PermissionGroup = 'nearby' | 'location' | 'notifications';

const P = PermissionsAndroid.PERMISSIONS;

export function permissionsFor(group: PermissionGroup): Permission[] {
  const sdk = Platform.OS === 'android' ? (Platform.Version as number) : 0;
  switch (group) {
    case 'nearby':
      return sdk >= 31
        ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_ADVERTISE, P.BLUETOOTH_CONNECT, ...(sdk >= 33 ? [P.NEARBY_WIFI_DEVICES] : [])]
        : [];
    case 'location':
      return [P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION];
    case 'notifications':
      return sdk >= 33 ? [P.POST_NOTIFICATIONS] : [];
  }
}

export async function check(group: PermissionGroup): Promise<boolean> {
  const list = permissionsFor(group);
  if (Platform.OS !== 'android' || list.length === 0) return true;
  const results = await Promise.all(list.map((p) => PermissionsAndroid.check(p)));
  return results.every(Boolean);
}

export async function request(group: PermissionGroup): Promise<'granted' | 'denied' | 'blocked'> {
  const list = permissionsFor(group);
  if (Platform.OS !== 'android' || list.length === 0) return 'granted';
  const res = await PermissionsAndroid.requestMultiple(list);
  const values = Object.values(res);
  if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';
  if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) return 'blocked';
  return 'denied';
}

export async function allMeshPermissions(): Promise<boolean> {
  return (await check('nearby')) && (await check('location'));
}

/** UWB ranging is a runtime permission on Android 12+ (C8). */
export async function requestUwb(): Promise<boolean> {
  if (Platform.OS !== 'android' || (Platform.Version as number) < 31) return true;
  const r = await PermissionsAndroid.request('android.permission.UWB_RANGING' as Permission);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

/** Start the mesh service; only while the app is on screen (section 9). */
export async function startMesh(): Promise<boolean> {
  if (!(await allMeshPermissions())) return false;
  await MeshEngine.start();
  return true;
}
