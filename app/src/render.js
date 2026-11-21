// render.js — draws a finished Neon Coast cover onto any 2D context.
//
// One draw path serves the editor preview and every export size, so what the
// maker sees is exactly what the PNG holds: graded photos cropped into the
// layout's panels over a pale poster backing, a soft vignette and grain, then
// the lettering — a big Anton title with a sunset gradient fill and a hard
// outline, a letter-spaced subtitle, a small studio tag and an optional row
// of heat stars in the corner.

import { panelRects } from './layouts.js';

export const EXPORT_SIZES = [
  { id: 'square', name: 'Square post', width: 1080, height: 1080 },
  { id: 'portrait', name: 'Portrait post', width: 1080, height: 1350 },
  { id: 'wide', name: 'Wide cover', width: 1920, height: 1080 },
];

// Cover-fit source rectangle for a photo placed in a panel: the photo fills
// the panel, zoom scales the crop, and pan slides it within the overflow.
// panX and panY run from -1 (start edge) through 0 (centred) to 1 (end edge).
export function coverCrop(image, panel, zoom, panX, panY) {
  const scale = Math.max(panel.w / image.width, panel.h / image.height) * zoom;
  const sw = panel.w / scale;
  const sh = panel.h / scale;
  const maxX = Math.max(0, image.width - sw);
  const maxY = Math.max(0, image.height - sh);
  return {
    sx: (maxX / 2) * (1 + panX),
    sy: (maxY / 2) * (1 + panY),
    sw,
    sh,
  };
}

function drawPanel(ctx, gradedImage, panel, placement) {
  if (!gradedImage) {
    const empty = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
    empty.addColorStop(0, '#3a2358');
    empty.addColorStop(1, '#150a2a');
    ctx.fillStyle = empty;
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    return;
  }
  const crop = coverCrop(gradedImage, panel, placement.zoom, placement.panX, placement.panY);
  ctx.drawImage(
    gradedImage,
    crop.sx, crop.sy, crop.sw, crop.sh,
    panel.x, panel.y, panel.w, panel.h,
  );
}

// A whisper of grain and a darkened edge keep flat phone photos feeling like
// printed poster stock once the grade has done its work.
function finishSurface(ctx, width, height) {
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.78,
  );
  vignette.addColorStop(0, 'rgba(10, 4, 24, 0)');
  vignette.addColorStop(1, 'rgba(10, 4, 24, 0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const step = Math.max(3, Math.round(width / 320));
  for (let y = step; y < height; y += step * 2) {
    for (let x = (y / step) % 2 ? step : 0; x < width; x += step * 2) {
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// The lettering block: studio tag top-left, heat stars top-right, and the
// title riding a scrim at the bottom so it stays readable over any photo.
function drawLettering(ctx, width, height, caption) {
  const unit = Math.min(width, height);
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Studio tag.
  const tagSize = Math.round(unit * 0.028);
  ctx.font = `${tagSize}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(tagSize * 0.32)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = 'rgba(255, 246, 230, 0.92)';
  ctx.shadowColor = 'rgba(12, 4, 28, 0.65)';
  ctx.shadowBlur = unit * 0.008;
  ctx.fillText('NEON COAST COVER STUDIO', unit * 0.045, unit * 0.062);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }

  // Heat stars.
  if (caption.stars) {
    const starR = unit * 0.021;
    ctx.fillStyle = '#ffd166';
    ctx.shadowBlur = unit * 0.01;
    for (let i = 0; i < 5; i += 1) {
      drawStar(ctx, width - unit * 0.045 - starR - i * starR * 2.5, unit * 0.05, starR);
    }
  }
  ctx.shadowBlur = 0;

  // Bottom scrim, deepest where the title sits.
  const scrimH = height * 0.42;
  const scrim = ctx.createLinearGradient(0, height - scrimH, 0, height);
  scrim.addColorStop(0, 'rgba(14, 5, 30, 0)');
  scrim.addColorStop(0.55, 'rgba(14, 5, 30, 0.55)');
  scrim.addColorStop(1, 'rgba(14, 5, 30, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - scrimH, width, scrimH);

  // Title: fit Anton to the frame width, fill it with a sunset gradient and
  // give it a hard dark outline so it pops off the art like poster lettering.
  const title = (caption.title || 'NEON COAST').toUpperCase();
  let titleSize = unit * 0.16 * caption.titleScale;
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const maxTitleWidth = width * 0.92;
  const measured = ctx.measureText(title).width;
  if (measured > maxTitleWidth) {
    titleSize = Math.floor(titleSize * (maxTitleWidth / measured));
    ctx.font = `${titleSize}px Anton, sans-serif`;
  }
  const titleY = height - unit * 0.115;
  const fill = ctx.createLinearGradient(0, titleY - titleSize, 0, titleY);
  fill.addColorStop(0, '#fff7e0');
  fill.addColorStop(0.45, '#ffd166');
  fill.addColorStop(0.78, '#ff7b54');
  fill.addColorStop(1, '#ef476f');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1d0b33';
  ctx.lineWidth = Math.max(2, titleSize * 0.055);
  ctx.shadowColor = 'rgba(239, 71, 111, 0.55)';
  ctx.shadowBlur = unit * 0.02;
  ctx.shadowOffsetY = unit * 0.006;
  ctx.strokeText(title, unit * 0.045, titleY);
  ctx.fillStyle = fill;
  ctx.fillText(title, unit * 0.045, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Subtitle: spaced capitals in warm white under the title.
  const sub = (caption.subtitle || '').toUpperCase();
  if (sub) {
    const subSize = Math.round(unit * 0.034);
    ctx.font = `${subSize}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.55)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffe8c9';
    ctx.fillText(sub, unit * 0.048, height - unit * 0.045);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();
}

// Draw the whole cover. `state` carries the layout, the graded photo source
// for each panel (or null), each panel's placement, and the caption.
export function drawCover(ctx, width, height, state) {
  ctx.save();
  ctx.fillStyle = '#f3ead8';
  ctx.fillRect(0, 0, width, height);
  const gutter = Math.max(3, Math.round(Math.min(width, height) * 0.008));
  const rects = panelRects(state.layout, width, height, gutter);
  rects.forEach((panel, index) => {
    const placement = state.placements[index] ?? { zoom: 1, panX: 0, panY: 0 };
    drawPanel(ctx, state.sources[index] ?? null, panel, placement);
    if (state.selected === index && state.showSelection) {
      ctx.strokeStyle = '#ffcf3f';
      ctx.lineWidth = Math.max(3, gutter * 0.9);
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    }
  });
  finishSurface(ctx, width, height);
  drawLettering(ctx, width, height, state.caption);
  ctx.restore();
  return rects;
}
