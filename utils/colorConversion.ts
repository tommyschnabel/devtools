export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface ColorFormats {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  cmyk: CMYK;
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

export function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
    default:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToCmyk(rgb: RGB): CMYK {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const k = 1 - Math.max(r, g, b);
  const c = k === 1 ? 0 : (1 - r - k) / (1 - k);
  const m = k === 1 ? 0 : (1 - g - k) / (1 - k);
  const y = k === 1 ? 0 : (1 - b - k) / (1 - k);

  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function cmykToRgb(cmyk: CMYK): RGB {
  const c = cmyk.c / 100;
  const m = cmyk.m / 100;
  const y = cmyk.y / 100;
  const k = cmyk.k / 100;

  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

export function getAllFormats(hex: string): ColorFormats {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const cmyk = rgbToCmyk(rgb);

  return {
    hex,
    rgb,
    hsl,
    hsv,
    cmyk,
  };
}

export interface PaletteColor {
  hex: string;
  name: string;
}

export interface ColorPalette {
  type: string;
  colors: PaletteColor[];
}

// Generate complementary colors (opposite on color wheel)
export function generateComplementary(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  const complementHue = (hsl.h + 180) % 360;
  const complementRgb = hslToRgb({ h: complementHue, s: hsl.s, l: hsl.l });

  return [
    { hex, name: 'Base' },
    { hex: rgbToHex(complementRgb), name: 'Complementary' },
  ];
}

// Generate analogous colors (adjacent on color wheel)
export function generateAnalogous(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  const analog1Hue = (hsl.h + 30) % 360;
  const analog2Hue = (hsl.h - 30 + 360) % 360;

  return [
    { hex: rgbToHex(hslToRgb({ h: analog2Hue, s: hsl.s, l: hsl.l })), name: 'Analogous -30°' },
    { hex, name: 'Base' },
    { hex: rgbToHex(hslToRgb({ h: analog1Hue, s: hsl.s, l: hsl.l })), name: 'Analogous +30°' },
  ];
}

// Generate triadic colors (120° apart)
export function generateTriadic(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  const triad1Hue = (hsl.h + 120) % 360;
  const triad2Hue = (hsl.h + 240) % 360;

  return [
    { hex, name: 'Base' },
    { hex: rgbToHex(hslToRgb({ h: triad1Hue, s: hsl.s, l: hsl.l })), name: 'Triadic +120°' },
    { hex: rgbToHex(hslToRgb({ h: triad2Hue, s: hsl.s, l: hsl.l })), name: 'Triadic +240°' },
  ];
}

// Generate tetradic/square colors (90° apart)
export function generateTetradic(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  const tetrad1Hue = (hsl.h + 90) % 360;
  const tetrad2Hue = (hsl.h + 180) % 360;
  const tetrad3Hue = (hsl.h + 270) % 360;

  return [
    { hex, name: 'Base' },
    { hex: rgbToHex(hslToRgb({ h: tetrad1Hue, s: hsl.s, l: hsl.l })), name: '+90°' },
    { hex: rgbToHex(hslToRgb({ h: tetrad2Hue, s: hsl.s, l: hsl.l })), name: '+180°' },
    { hex: rgbToHex(hslToRgb({ h: tetrad3Hue, s: hsl.s, l: hsl.l })), name: '+270°' },
  ];
}

// Generate split complementary colors
export function generateSplitComplementary(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  const complementHue = (hsl.h + 180) % 360;
  const split1Hue = (complementHue + 30) % 360;
  const split2Hue = (complementHue - 30 + 360) % 360;

  return [
    { hex, name: 'Base' },
    { hex: rgbToHex(hslToRgb({ h: split2Hue, s: hsl.s, l: hsl.l })), name: 'Split -30°' },
    { hex: rgbToHex(hslToRgb({ h: split1Hue, s: hsl.s, l: hsl.l })), name: 'Split +30°' },
  ];
}

// Generate monochromatic palette (varying lightness)
export function generateMonochromatic(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  return [
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.min(90, hsl.l + 30) })), name: 'Lightest' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.min(80, hsl.l + 15) })), name: 'Lighter' },
    { hex, name: 'Base' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.max(20, hsl.l - 15) })), name: 'Darker' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: Math.max(10, hsl.l - 30) })), name: 'Darkest' },
  ];
}

// Generate shades (mixing with black)
export function generateShades(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  return [
    { hex, name: '100%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l * 0.75 })), name: '75%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l * 0.5 })), name: '50%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l * 0.25 })), name: '25%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: 0 })), name: 'Black' },
  ];
}

// Generate tints (mixing with white)
export function generateTints(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));
  const lightnessRange = 100 - hsl.l;

  return [
    { hex, name: '100%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l + lightnessRange * 0.25 })), name: '75%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l + lightnessRange * 0.5 })), name: '50%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: hsl.l + lightnessRange * 0.75 })), name: '25%' },
    { hex: rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l: 100 })), name: 'White' },
  ];
}

// Generate web development palette
export function generateWebDevelopment(hex: string): PaletteColor[] {
  const hsl = rgbToHsl(hexToRgb(hex));

  // Primary - the selected color
  const primary = hex;

  // Secondary - triadic color (120° away)
  const secondaryHue = (hsl.h + 120) % 360;
  const secondary = rgbToHex(hslToRgb({ h: secondaryHue, s: hsl.s, l: hsl.l }));

  // Accent - split complementary for contrast
  const accentHue = (hsl.h + 150) % 360;
  const accent = rgbToHex(hslToRgb({ h: accentHue, s: Math.min(100, hsl.s + 20), l: hsl.l }));

  // Success - green tones (120° is green)
  const success = rgbToHex(hslToRgb({ h: 140, s: 65, l: 45 }));

  // Warning - orange/yellow tones (40° is orange)
  const warning = rgbToHex(hslToRgb({ h: 40, s: 90, l: 55 }));

  // Error - red tones (0° is red)
  const error = rgbToHex(hslToRgb({ h: 0, s: 75, l: 50 }));

  // Info - blue tones (210° is blue)
  const info = rgbToHex(hslToRgb({ h: 210, s: 70, l: 55 }));

  // Background - very light version of primary
  const background = rgbToHex(hslToRgb({ h: hsl.h, s: Math.max(10, hsl.s - 40), l: 96 }));

  // Text - dark color with slight hint of primary hue
  const text = rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(20, hsl.s), l: 15 }));

  return [
    { hex: primary, name: 'Primary' },
    { hex: secondary, name: 'Secondary' },
    { hex: accent, name: 'Accent' },
    { hex: success, name: 'Success' },
    { hex: warning, name: 'Warning' },
    { hex: error, name: 'Error' },
    { hex: info, name: 'Info' },
    { hex: background, name: 'Background' },
    { hex: text, name: 'Text' },
  ];
}

// Generate all palette types
export function generateAllPalettes(hex: string): ColorPalette[] {
  return [
    { type: 'Web Development', colors: generateWebDevelopment(hex) },
    { type: 'Complementary', colors: generateComplementary(hex) },
    { type: 'Analogous', colors: generateAnalogous(hex) },
    { type: 'Triadic', colors: generateTriadic(hex) },
    { type: 'Tetradic', colors: generateTetradic(hex) },
    { type: 'Split Complementary', colors: generateSplitComplementary(hex) },
    { type: 'Monochromatic', colors: generateMonochromatic(hex) },
    { type: 'Shades', colors: generateShades(hex) },
    { type: 'Tints', colors: generateTints(hex) },
  ];
}
