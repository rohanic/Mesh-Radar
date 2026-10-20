import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** A3: avatar under 4 KB when sent over the mesh. Shrinks until it fits. */
export const AVATAR_MAX_BYTES = 4 * 1024;

export function base64Bytes(b64: string): number {
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

export async function shrinkToLimit(uri: string, maxBytes: number, sizes = [96, 80, 64, 48], qualities = [0.6, 0.45, 0.3]): Promise<string | null> {
  for (const size of sizes) {
    for (const compress of qualities) {
      const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: size, height: size } }], {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (out.base64 && base64Bytes(out.base64) <= maxBytes) return out.base64;
    }
  }
  return null;
}

export async function pickAvatarPhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  return shrinkToLimit(res.assets[0].uri, AVATAR_MAX_BYTES);
}

/** D5: chat thumbnails under 8 KB; the full photo stays on the phone for nearby transfer (D6). */
export async function pickPhoto(): Promise<{ uri: string; thumb: string; size: number } | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const thumb = await shrinkToLimit(a.uri, 8 * 1024, [240, 200, 160, 120], [0.6, 0.45, 0.3]);
  if (!thumb) return null;
  return { uri: a.uri, thumb, size: a.fileSize ?? 0 };
}
