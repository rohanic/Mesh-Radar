import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme/ThemeProvider';
import type { GroupShape as Shape } from '@/core/theme/tokens';

// Preset avatars (A3). Placeholder flat illustrations until the commissioned set exists
// (section 14 open question; DEC-030): hijab, turban, cap, ihram, dupatta, elders, a child,
// kufi and beard, long hair, wheelchair user.
export const AVATAR_PRESETS = 12;
const SKIN = ['#8D5524', '#C68642', '#E0AC69', '#F1C27D', '#6B4423', '#D4A373'];
const HAIR = '#2B1D14';

function Face({ skin, child }: { skin: string; child?: boolean }) {
  const r = child ? 15 : 17;
  return (
    <G>
      <Ellipse cx={50} cy={92} rx={30} ry={22} fill={skin} opacity={0.35} />
      <Circle cx={50} cy={48} r={r} fill={skin} />
      <Circle cx={44} cy={46} r={child ? 2.4 : 1.8} fill="#1B1B1B" />
      <Circle cx={56} cy={46} r={child ? 2.4 : 1.8} fill="#1B1B1B" />
      <Path d={child ? 'M44 55 Q50 60 56 55' : 'M45 55 Q50 58 55 55'} stroke="#1B1B1B" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Preset({ index }: { index: number }) {
  const skin = SKIN[index % SKIN.length]!;
  switch (index % AVATAR_PRESETS) {
    case 1: // hijab
      return (
        <G>
          <Path d="M24 60 Q22 24 50 22 Q78 24 76 60 L80 96 L20 96 Z" fill="#3E7CB1" />
          <Face skin={skin} />
        </G>
      );
    case 2: // turban
      return (
        <G>
          <Face skin={skin} />
          <Path d="M30 42 Q30 20 50 18 Q70 20 70 42 Q60 34 50 36 Q40 34 30 42 Z" fill="#E07A1F" />
        </G>
      );
    case 3: // cap
      return (
        <G>
          <Face skin={skin} />
          <Path d="M32 40 Q34 24 50 24 Q66 24 68 40 Z" fill="#2D6A4F" />
          <Rect x={50} y={36} width={24} height={5} rx={2} fill="#2D6A4F" />
        </G>
      );
    case 4: // ihram
      return (
        <G>
          <Path d="M20 96 L26 70 Q50 60 74 70 L80 96 Z" fill="#F4F4F4" stroke="#C9C9C9" />
          <Path d="M26 70 L74 96" stroke="#C9C9C9" strokeWidth={2} />
          <Face skin={skin} />
          <Path d="M34 40 Q36 30 50 30 Q64 30 66 40" fill="none" stroke={HAIR} strokeWidth={3} />
        </G>
      );
    case 5: // dupatta
      return (
        <G>
          <Path d="M28 50 Q28 22 50 22 Q72 22 72 50 L76 96 L24 96 Z" fill="#C2185B" />
          <Path d="M30 46 Q32 30 50 28 Q68 30 70 46 Q60 38 50 40 Q40 38 30 46 Z" fill={HAIR} />
          <Face skin={skin} />
        </G>
      );
    case 6: // elder with glasses
      return (
        <G>
          <Face skin={skin} />
          <Path d="M32 44 Q32 26 50 26 Q68 26 68 44 Q62 34 50 34 Q38 34 32 44 Z" fill="#CFCFCF" />
          <Circle cx={44} cy={46} r={5} fill="none" stroke="#333" strokeWidth={1.5} />
          <Circle cx={56} cy={46} r={5} fill="none" stroke="#333" strokeWidth={1.5} />
          <Path d="M49 46 L51 46" stroke="#333" strokeWidth={1.5} />
        </G>
      );
    case 7: // child
      return (
        <G>
          <Face skin={skin} child />
          <Path d="M36 42 Q38 30 50 30 Q62 30 64 42 Q56 36 50 38 Q44 36 36 42 Z" fill={HAIR} />
        </G>
      );
    case 8: // kufi and beard
      return (
        <G>
          <Face skin={skin} />
          <Path d="M34 52 Q36 70 50 70 Q64 70 66 52 Q60 62 50 62 Q40 62 34 52 Z" fill={HAIR} />
          <Path d="M35 38 Q37 28 50 28 Q63 28 65 38 Z" fill="#FFFFFF" stroke="#BDBDBD" />
        </G>
      );
    case 9: // long hair
      return (
        <G>
          <Path d="M30 48 Q28 24 50 24 Q72 24 70 48 L72 78 L28 78 Z" fill={HAIR} />
          <Face skin={skin} />
        </G>
      );
    case 10: // wheelchair user
      return (
        <G>
          <Face skin={skin} />
          <Path d="M34 42 Q36 30 50 30 Q64 30 66 42 Q58 36 50 37 Q42 36 34 42 Z" fill={HAIR} />
          <Circle cx={74} cy={80} r={11} fill="#0277BD" />
          <Circle cx={74} cy={83} r={5} fill="none" stroke="#FFFFFF" strokeWidth={1.8} />
          <Circle cx={73} cy={73} r={1.8} fill="#FFFFFF" />
          <Path d="M73 75 L73 81 L78 81" stroke="#FFFFFF" strokeWidth={1.8} fill="none" />
        </G>
      );
    case 11: // headscarf elder with glasses
      return (
        <G>
          <Path d="M26 58 Q24 24 50 22 Q76 24 74 58 L78 96 L22 96 Z" fill="#6D4C41" />
          <Face skin={skin} />
          <Circle cx={44} cy={46} r={5} fill="none" stroke="#333" strokeWidth={1.5} />
          <Circle cx={56} cy={46} r={5} fill="none" stroke="#333" strokeWidth={1.5} />
        </G>
      );
    default: // short hair
      return (
        <G>
          <Face skin={skin} />
          <Path d="M33 44 Q33 26 50 26 Q67 26 67 44 Q60 34 50 35 Q40 34 33 44 Z" fill={HAIR} />
        </G>
      );
  }
}

export function GroupShapeGlyph({ shape, color, size = 12 }: { shape: Shape; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      {shape === 'circle' ? <Circle cx={5} cy={5} r={5} fill={color} /> : null}
      {shape === 'triangle' ? <Polygon points="5,0 10,10 0,10" fill={color} /> : null}
      {shape === 'square' ? <Rect x={0.5} y={0.5} width={9} height={9} fill={color} /> : null}
      {shape === 'diamond' ? <Polygon points="5,0 10,5 5,10 0,5" fill={color} /> : null}
    </Svg>
  );
}

/** Avatar with the person's colour ring and its shape badge, so colour is never the only cue. */
export function Avatar({ preset, photo, colour, size = 48, dim }: { preset: number; photo?: string | null; colour: number; size?: number; dim?: boolean }) {
  const t = useTheme();
  const g = t.groupColour(colour);
  return (
    <View style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(2, size / 16), borderColor: g.color, overflow: 'hidden', backgroundColor: t.colors.surfaceRaised }}>
        {photo ? (
          <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        ) : (
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Preset index={preset} />
          </Svg>
        )}
      </View>
      <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: t.colors.surface, borderRadius: 8, padding: 2 }}>
        <GroupShapeGlyph shape={g.shape} color={g.color} size={Math.max(8, size / 5)} />
      </View>
    </View>
  );
}
