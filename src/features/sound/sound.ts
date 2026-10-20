import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

// Siren (E2) and the soft arrival chime (flow 2, step 4). Generated tones bundled with the app.
let siren: AudioPlayer | null = null;
let chime: AudioPlayer | null = null;

async function mode() {
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
}

export async function startSiren() {
  await mode();
  siren ??= createAudioPlayer(require('../../../assets/sounds/siren.wav'));
  siren.loop = true;
  siren.volume = 1;
  siren.play();
}

export function stopSiren() {
  siren?.pause();
}

export async function playChime() {
  await mode();
  chime ??= createAudioPlayer(require('../../../assets/sounds/chime.wav'));
  await chime.seekTo(0);
  chime.play();
}

/** Long repeating pattern for an incoming SOS (section 7, haptics). */
export function sosVibration(on: boolean) {
  if (on) Vibration.vibrate([0, 800, 300, 800, 300, 800, 300, 1600], true);
  else Vibration.cancel();
}

export function newMessageHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).then(() =>
    setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 120),
  );
}
