import makeQr from 'qrcode-generator';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** QR code drawn with SVG (B1, G8, E6). Black on white for every theme, so scanners read it. */
export function QRCode({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const path = useMemo(() => {
    const qr = makeQr(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    return { d, n: n + 8 };
  }, [value]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} accessibilityLabel={label} accessible>
      <Rect x={0} y={0} width={path.n} height={path.n} fill="#FFFFFF" />
      <Path d={path.d} fill="#000000" />
    </Svg>
  );
}
