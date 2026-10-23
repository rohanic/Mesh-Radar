import { Image, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';

import { useTheme } from '@/core/theme/ThemeProvider';
import type { GroupShape as Shape } from '@/core/theme/tokens';

// Preset avatars (A3). Flat portrait illustrations (DEC-030, redrawn in DEC-045) until a
// commissioned set exists: short hair, hijab, turban, cap, ihram, dupatta, an elder with glasses, a
// child, kufi and beard, long hair, a wheelchair user and an elder in a headscarf. Indices are
// stable because they travel over the mesh.
export const AVATAR_PRESETS = 12;

/** Skin tone and its shade (ears, neck, nose). */
const SKIN: [string, string][] = [
  ['#8D5524', '#6F4220'],
  ['#C68642', '#A56B33'],
  ['#E0AC69', '#C38E50'],
  ['#F1C27D', '#D6A660'],
  ['#6B4423', '#52331A'],
  ['#D4A373', '#B5865A'],
];
const HAIR = '#2B1D14';
const GREY = '#D5D8DC';
/** Soft backdrop per preset, light enough for both themes. */
const BACKDROP = ['#D6EAF8', '#E4E1FF', '#FFE6CC', '#D9F2E3', '#EFEDE4', '#FFE0EA', '#E5E9EF', '#FFF0C7', '#DCEFEF', '#EFE1FF', '#D8E6FF', '#F1E4D8'];

function Bust({ fill, child }: { fill: string; child?: boolean }) {
  return <Path d={child ? 'M22 100 C22 86 34 78 50 78 C66 78 78 86 78 100 Z' : 'M12 100 C12 82 28 71 50 71 C72 71 88 82 88 100 Z'} fill={fill} />;
}

function Head({ skin, child, ears = true }: { skin: [string, string]; child?: boolean; ears?: boolean }) {
  const cy = child ? 50 : 47;
  return (
    <G>
      <Rect x={43} y={child ? 62 : 58} width={14} height={16} rx={4} fill={skin[1]} />
      {ears ? <Ellipse cx={child ? 31.5 : 33} cy={cy + 2} rx={3.2} ry={4.5} fill={skin[1]} /> : null}
      {ears ? <Ellipse cx={child ? 68.5 : 67} cy={cy + 2} rx={3.2} ry={4.5} fill={skin[1]} /> : null}
      <Ellipse cx={50} cy={cy} rx={child ? 18 : 16.5} ry={child ? 18 : 19} fill={skin[0]} />
    </G>
  );
}

function Features({ skin, child, brow = HAIR, glasses, mouth = true }: { skin: [string, string]; child?: boolean; brow?: string; glasses?: boolean; mouth?: boolean }) {
  const y = child ? 4 : 0;
  return (
    <G transform={`translate(0 ${y})`}>
      <Circle cx={40.5} cy={54} r={3} fill="#F28B82" opacity={0.28} />
      <Circle cx={59.5} cy={54} r={3} fill="#F28B82" opacity={0.28} />
      <Path d="M39.5 41.8 Q43.5 39.6 47 41.2" stroke={brow} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M53 41.2 Q56.5 39.6 60.5 41.8" stroke={brow} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Ellipse cx={43.5} cy={47} rx={child ? 2.4 : 2} ry={child ? 2.8 : 2.4} fill="#2A1D17" />
      <Ellipse cx={56.5} cy={47} rx={child ? 2.4 : 2} ry={child ? 2.8 : 2.4} fill="#2A1D17" />
      <Circle cx={44.2} cy={46.2} r={0.7} fill="#FFFFFF" />
      <Circle cx={57.2} cy={46.2} r={0.7} fill="#FFFFFF" />
      <Path d="M50 48.5 Q48.6 52 50.6 53" stroke={skin[1]} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {mouth ? <Path d="M45 56.5 Q50 60.5 55 56.5" stroke="#7A3B2E" strokeWidth={1.8} fill="none" strokeLinecap="round" /> : null}
      {glasses ? (
        <G>
          <Circle cx={43.5} cy={47} r={5} fill="none" stroke="#33302E" strokeWidth={1.6} />
          <Circle cx={56.5} cy={47} r={5} fill="none" stroke="#33302E" strokeWidth={1.6} />
          <Path d="M48.5 47 Q50 45.8 51.5 47" stroke="#33302E" strokeWidth={1.6} fill="none" />
        </G>
      ) : null}
    </G>
  );
}

/** A head covering that frames the face (hijab, headscarf). */
function Wrap({ skin, cloth, fold, glasses }: { skin: [string, string]; cloth: string; fold: string; glasses?: boolean }) {
  return (
    <G>
      <Bust fill={cloth} />
      <Path d="M50 24 C35 24 29.5 35 29.5 48 C29.5 60 35 69 42 73 L58 73 C65 69 70.5 60 70.5 48 C70.5 35 65 24 50 24 Z" fill={cloth} />
      <Ellipse cx={50} cy={48} rx={13.5} ry={16} fill={skin[0]} />
      <Ellipse cx={50} cy={48} rx={14} ry={16.5} fill="none" stroke={fold} strokeWidth={1.5} />
      <Path d="M38 70 Q50 76 62 70" stroke={fold} strokeWidth={1.5} fill="none" />
      <Features skin={skin} glasses={glasses} brow={glasses ? '#8D8D8D' : HAIR} />
    </G>
  );
}

function Preset({ index }: { index: number }) {
  const i = ((index % AVATAR_PRESETS) + AVATAR_PRESETS) % AVATAR_PRESETS;
  const skin = SKIN[i % SKIN.length]!;
  const body = (() => {
    switch (i) {
      case 1: // hijab
        return <Wrap skin={skin} cloth="#3F7FBF" fold="#336BA3" />;
      case 2: // turban
        return (
          <G>
            <Bust fill="#5B8C5A" />
            <Head skin={skin} />
            <Path d="M31 43 C29 27 38 18.5 50 18.5 C62 18.5 71 27 69 43 C66 38 60 35 50 35 C40 35 34 38 31 43 Z" fill="#E2761B" />
            <Path d="M33.5 35.5 C40 28 56 25 66.5 31" stroke="#C25F12" strokeWidth={2} fill="none" strokeLinecap="round" />
            <Path d="M35 39.5 C43 33 57 31 67 36.5" stroke="#C25F12" strokeWidth={1.6} fill="none" strokeLinecap="round" />
            <Features skin={skin} />
          </G>
        );
      case 3: // cap
        return (
          <G>
            <Bust fill="#E9B949" />
            <Head skin={skin} />
            <Path d="M33.5 47 C33 41 34 37 36 35 L36 47 Z" fill={HAIR} />
            <Path d="M66.5 47 C67 41 66 37 64 35 L64 47 Z" fill={HAIR} />
            <Path d="M32.5 41 C33 28.5 41 24 50 24 C59.5 24 67 28.5 67.5 41 Z" fill="#2D6A4F" />
            <Path d="M48 39 L77 40.5 C78 43.5 74 45 69 44.5 L48 42.5 Z" fill="#235640" />
            <Circle cx={50} cy={24.5} r={1.6} fill="#235640" />
            <Features skin={skin} />
          </G>
        );
      case 4: // ihram
        return (
          <G>
            <Bust fill={skin[0]} />
            <Path d="M12 100 C12 84 24 73 38 71 C46 76 56 84 66 100 Z" fill="#FAFAF5" stroke="#D8D6CC" strokeWidth={1.2} />
            <Path d="M12 100 C13 88 18 79 26 74 L36 100 Z" fill="#F0EEE6" />
            <Head skin={skin} />
            <Path d="M34 42 C34.5 31 41 27 50 27 C59 27 65.5 31 66 42 C62 36 57 34 50 34 C43 34 38 36 34 42 Z" fill="#3A2A20" opacity={0.85} />
            <Features skin={skin} />
          </G>
        );
      case 5: // dupatta
        return (
          <G>
            <Bust fill="#C2185B" />
            <Path d="M33 47 C31 34 39 26.5 50 26.5 C61 26.5 69 34 67 47 L68 66 L32 66 Z" fill={HAIR} />
            <Head skin={skin} ears={false} />
            <Path
              d="M50 21 C35 21 27 31 27.5 46 C28 58 30 68 26 80 L18 100 L30 100 C33 88 34 76 34 66 C33 55 33 44 35 38 C38 30 44 28 50 28 C56 28 62 30 65 38 C67 44 67 55 66 66 C66 76 67 88 70 100 L82 100 L74 80 C70 68 72 58 72.5 46 C73 31 65 21 50 21 Z"
              fill="#C2185B"
              stroke="#F2B134"
              strokeWidth={1.4}
            />
            <Path d="M37 41 C39 33 44 30.5 50 30.5 C56 30.5 61 33 63 41 C59 37 55 35.5 50 36.5 C45 35.5 41 37 37 41 Z" fill={HAIR} />
            <Features skin={skin} />
          </G>
        );
      case 6: // elder with glasses
        return (
          <G>
            <Bust fill="#7A8699" />
            <Path d="M43 71 L50 79 L57 71 Z" fill="#FFFFFF" />
            <Head skin={skin} />
            <Path d="M33.5 47 C32 37 35 31 40 28.5 C38 33 37.5 38 38 44 Z" fill={GREY} />
            <Path d="M66.5 47 C68 37 65 31 60 28.5 C62 33 62.5 38 62 44 Z" fill={GREY} />
            <Path d="M40 29.5 C45 26.5 55 26.5 60 29.5 C55 28.5 45 28.5 40 29.5 Z" fill={GREY} />
            <Features skin={skin} glasses brow="#BDBDBD" mouth={false} />
            <Path d="M44.5 55 Q50 52.5 55.5 55 Q50 56.8 44.5 55 Z" fill="#C9CCD1" />
            <Path d="M46 58.5 Q50 60.5 54 58.5" stroke="#7A3B2E" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          </G>
        );
      case 7: // child
        return (
          <G>
            <Bust fill="#F4A261" child />
            <Head skin={skin} child />
            <Path d="M32 47 C31 33 39.5 30 50 30 C61 30 69 33 68 47 C65 41 60 38.5 54 38 C51 40.5 45 41 41 39 C37 41 34 43.5 32 47 Z" fill={HAIR} />
            <Features skin={skin} child />
          </G>
        );
      case 8: // kufi and beard
        return (
          <G>
            <Bust fill="#ECE8DC" />
            <Path d="M50 71 L50 88" stroke="#D5CFBD" strokeWidth={1.6} />
            <Head skin={skin} />
            <Features skin={skin} mouth={false} />
            <Path d="M33.8 49 C34 63 41 71 50 71 C59 71 66 63 66.2 49 C63.5 56 58 59 50 59 C42 59 36.5 56 33.8 49 Z" fill={HAIR} />
            <Path d="M44 55.5 Q50 53 56 55.5" stroke={HAIR} strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <Path d="M34.5 37 C35 29 41.5 25 50 25 C58.5 25 65 29 65.5 37 Z" fill="#FAFAFA" stroke="#D0D0D0" strokeWidth={1} />
            <Path d="M35.5 33.5 L64.5 33.5" stroke="#D0D0D0" strokeWidth={1} />
          </G>
        );
      case 9: // long hair
        return (
          <G>
            <Path d="M31 48 C29 32 38 24 50 24 C62 24 71 32 69 48 L70 70 L30 70 Z" fill={HAIR} />
            <Bust fill="#5E9C6B" />
            <Head skin={skin} ears={false} />
            <Path d="M33 50 C32 62 31 74 29 84 C33 85 37 84 39 82 C38 72 37 62 36 52 Z" fill={HAIR} />
            <Path d="M67 50 C68 62 69 74 71 84 C67 85 63 84 61 82 C62 72 63 62 64 52 Z" fill={HAIR} />
            <Path d="M33.5 45 C34 32 42 26 51 26.5 C60 27 66.5 33 66.5 45 C62 37.5 55 33 47 33.5 C41 35 36.5 39 33.5 45 Z" fill={HAIR} />
            <Features skin={skin} />
          </G>
        );
      case 10: // wheelchair user
        return (
          <G>
            <Bust fill="#7B61C9" />
            <Head skin={skin} />
            <Circle cx={38} cy={33} r={6} fill={HAIR} />
            <Circle cx={45} cy={29} r={6.5} fill={HAIR} />
            <Circle cx={53} cy={28.5} r={6.5} fill={HAIR} />
            <Circle cx={61} cy={32} r={6} fill={HAIR} />
            <Circle cx={65} cy={38} r={4.5} fill={HAIR} />
            <Circle cx={35} cy={39} r={4.5} fill={HAIR} />
            <Features skin={skin} />
            <Circle cx={76} cy={78} r={13} fill="#1565C0" stroke="#FFFFFF" strokeWidth={2} />
            <Circle cx={75} cy={70.5} r={2} fill="#FFFFFF" />
            <Path d="M75 73.5 L75 79 L80.5 79 L82.5 84" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M71.5 76.5 A6 6 0 1 0 79.5 84.5" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
          </G>
        );
      case 11: // elder in a headscarf, with glasses
        return <Wrap skin={skin} cloth="#7B5544" fold="#664436" glasses />;
      default: // short hair
        return (
          <G>
            <Bust fill="#3B7DD8" />
            <Path d="M44 71 L50 80 L56 71 Z" fill={skin[1]} />
            <Head skin={skin} />
            <Path d="M33.5 45 C32 30 40 25.5 50 25.5 C60 25.5 68 30 66.5 45 C64.5 39 61 35.5 55 35 C50 37.5 42 37.5 37 35.5 C35 38 34 41.5 33.5 45 Z" fill={HAIR} />
            <Features skin={skin} />
          </G>
        );
    }
  })();
  return (
    <G>
      <Rect x={0} y={0} width={100} height={100} fill={BACKDROP[i]} />
      {body}
    </G>
  );
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
