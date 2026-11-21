// grades.js — Vice City colour grades for Neon Coast Cover Studio.
//
// A grade is a gradient map: the photo's luminance is pushed through a ramp of
// five colour stops, then blended back with the original so faces and detail
// survive. Each grade also carries a saturation and contrast nudge, so a panel
// reads as poster ink rather than a phone snapshot. Everything is computed on
// an offscreen canvas once per photo and grade, then cached by the renderer.

// Each stop is [red, green, blue] at luminance 0, 0.25, 0.5, 0.75 and 1.
export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    stops: [
      [46, 18, 88],
      [148, 42, 110],
      [233, 92, 92],
      [255, 164, 84],
      [255, 238, 196],
    ],
    blend: 0.62,
    saturation: 1.18,
    contrast: 1.06,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    stops: [
      [7, 18, 46],
      [16, 84, 122],
      [150, 52, 148],
      [240, 84, 158],
      [214, 252, 244],
    ],
    blend: 0.58,
    saturation: 1.25,
    contrast: 1.08,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    stops: [
      [40, 22, 10],
      [124, 74, 22],
      [206, 134, 46],
      [246, 198, 108],
      [255, 244, 216],
    ],
    blend: 0.5,
    saturation: 1.12,
    contrast: 1.04,
  },
  {
    id: 'midnight-chrome',
    name: 'Midnight Chrome',
    stops: [
      [10, 15, 27],
      [44, 60, 88],
      [104, 126, 160],
      [188, 206, 228],
      [250, 253, 255],
    ],
    blend: 0.55,
    saturation: 0.92,
    contrast: 1.1,
  },
  {
    id: 'original',
    name: 'Original',
    stops: null,
    blend: 0,
    saturation: 1.05,
    contrast: 1.02,
  },
];

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}

// Build a 256-entry lookup table (one [r, g, b] per luminance step) by walking
// the grade's five stops with smooth interpolation between neighbours.
export function buildLut(grade) {
  const lut = new Uint8ClampedArray(256 * 3);
  if (!grade.stops) {
    for (let i = 0; i < 256; i += 1) {
      lut[i * 3] = i;
      lut[i * 3 + 1] = i;
      lut[i * 3 + 2] = i;
    }
    return lut;
  }
  const stops = grade.stops;
  for (let i = 0; i < 256; i += 1) {
    const t = (i / 255) * (stops.length - 1);
    const lo = Math.min(stops.length - 2, Math.floor(t));
    const frac = t - lo;
    for (let c = 0; c < 3; c += 1) {
      lut[i * 3 + c] = Math.round(stops[lo][c] + (stops[lo + 1][c] - stops[lo][c]) * frac);
    }
  }
  return lut;
}

// Apply contrast and saturation around the gradient map. Works in place on an
// ImageData so the renderer can grade a whole photo in one pass.
export function applyGrade(imageData, grade) {
  const lut = buildLut(grade);
  const data = imageData.data;
  const blend = grade.blend;
  const keep = 1 - blend;
  const saturation = grade.saturation;
  const contrast = grade.contrast;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    const li = luma * 3;
    let nr = r * keep + lut[li] * blend;
    let ng = g * keep + lut[li + 1] * blend;
    let nb = b * keep + lut[li + 2] * blend;
    // Contrast around mid-grey, then saturation around the new luminance.
    nr = (nr - 128) * contrast + 128;
    ng = (ng - 128) * contrast + 128;
    nb = (nb - 128) * contrast + 128;
    const grey = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    data[i] = grey + (nr - grey) * saturation;
    data[i + 1] = grey + (ng - grey) * saturation;
    data[i + 2] = grey + (nb - grey) * saturation;
  }
  return imageData;
}

// Draw a photo onto a fresh canvas (longest side capped so grading a big phone
// photo stays fast) and return the graded canvas.
export function gradedCanvasFor(image, grade, maxSide = 1440) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  if (grade.blend > 0 || grade.saturation !== 1 || grade.contrast !== 1) {
    const pixels = ctx.getImageData(0, 0, width, height);
    ctx.putImageData(applyGrade(pixels, grade), 0, 0);
  }
  return canvas;
}
