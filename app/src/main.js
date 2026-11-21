// main.js — wires the Neon Coast Cover Studio editor together.
//
// State lives here: the loaded photos, which photo fills which panel, each
// panel's crop (zoom and pan), the layout, the grade and the caption. The
// preview canvas and every export share render.js's single draw path, and
// grades.js turns each photo into a graded canvas once per grade, cached.
// Photos are read with FileReader and never leave the machine.
//
// Two extra modes exist for the maker's own screenshots, driven by the URL:
//   ?shot=cover&w=1280&h=720&layout=hero-and-three&grade=vice-sunset
//     shows only the cover, drawn at the requested size;
//   ?shot=editor
//     the normal editor with the sample photos already loaded.

import { GRADES, gradeById, gradedCanvasFor } from './grades.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { EXPORT_SIZES, drawCover } from './render.js';

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

const SAMPLE_PHOTOS = [
  { name: 'Boulevard', src: './samples/boulevard.jpg' },
  { name: 'Pier', src: './samples/pier.jpg' },
];

const state = {
  photos: [], // { name, image, url, graded: { gradeId, canvas } }
  pickedPhoto: 0,
  layout: layoutById(params.get('layout') ?? 'hero-and-three'),
  grade: gradeById(params.get('grade') ?? 'vice-sunset'),
  assignments: [0, 1, 0, 1, 1, 0],
  // Each panel starts with its own crop, so when one photo fills several
  // panels the poster still reads as a collage of framings, not copies.
  placements: [
    { zoom: 1.12, panX: 0, panY: -0.2 },
    { zoom: 1.3, panX: 0.15, panY: -0.1 },
    { zoom: 1.45, panX: -0.2, panY: 0.15 },
    { zoom: 1.25, panX: 0.1, panY: 0.3 },
    { zoom: 1.5, panX: -0.1, panY: -0.25 },
    { zoom: 1.2, panX: 0.25, panY: 0.1 },
  ],
  selected: 0,
  caption: {
    title: params.get('title') ?? 'Neon Coast',
    subtitle: params.get('subtitle') ?? 'Vice Coast · Est. 2026',
    titleScale: 1,
    stars: true,
  },
  size: EXPORT_SIZES[0],
};

const canvas = document.getElementById('stage-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
let lastRects = [];

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function gradedSource(photo) {
  if (!photo) return null;
  if (!photo.graded || photo.graded.gradeId !== state.grade.id) {
    photo.graded = { gradeId: state.grade.id, canvas: gradedCanvasFor(photo.image, state.grade) };
  }
  return photo.graded.canvas;
}

function currentSources() {
  return state.layout.panels(state.size.width, state.size.height)
    .map((_, index) => gradedSource(state.photos[state.assignments[index] ?? 0]));
}

let renderQueued = false;
function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    canvas.width = state.size.width;
    canvas.height = state.size.height;
    lastRects = drawCover(ctx, state.size.width, state.size.height, {
      layout: state.layout,
      sources: currentSources(),
      placements: state.placements,
      caption: state.caption,
      selected: state.selected,
      showSelection: !shotMode,
    });
    syncPanelControls();
  });
}

function loadPhoto(name, src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      state.photos.push({ name, image, url: src, graded: null });
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

async function loadSamples() {
  for (const sample of SAMPLE_PHOTOS) {
    await loadPhoto(sample.name, sample.src);
  }
  buildPhotoStrip();
  render();
}

function buildPhotoStrip() {
  const strip = document.getElementById('photo-strip');
  if (!strip) return;
  strip.replaceChildren();
  state.photos.forEach((photo, index) => {
    const thumb = document.createElement('img');
    thumb.src = photo.url;
    thumb.alt = photo.name;
    thumb.title = `${photo.name} — click to pick, then click a panel`;
    thumb.className = index === state.pickedPhoto ? 'picked' : '';
    thumb.addEventListener('click', () => {
      state.pickedPhoto = index;
      state.assignments[state.selected] = index;
      buildPhotoStrip();
      render();
    });
    strip.append(thumb);
  });
}

function buildButtons(rowId, items, currentId, onPick) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.replaceChildren();
  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.name;
    button.className = item.id === currentId ? 'active' : '';
    button.addEventListener('click', () => onPick(item));
    row.append(button);
  });
}

function refreshButtons() {
  buildButtons('layout-row', LAYOUTS, state.layout.id, (layout) => {
    state.layout = layout;
    state.selected = 0;
    refreshButtons();
    render();
  });
  buildButtons('grade-row', GRADES, state.grade.id, (grade) => {
    state.grade = grade;
    refreshButtons();
    render();
  });
}

function syncPanelControls() {
  const panelCount = state.layout.panels(state.size.width, state.size.height).length;
  const label = document.getElementById('panel-label');
  if (label) label.textContent = `Panel ${state.selected + 1} of ${panelCount}`;
  const placement = state.placements[state.selected];
  const zoom = document.getElementById('zoom-slider');
  const panX = document.getElementById('panx-slider');
  const panY = document.getElementById('pany-slider');
  if (zoom) zoom.value = String(Math.round(placement.zoom * 100));
  if (panX) panX.value = String(Math.round(placement.panX * 100));
  if (panY) panY.value = String(Math.round(placement.panY * 100));
}

function wireControls() {
  document.getElementById('photo-input').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      const url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
      if (url) await loadPhoto(file.name.replace(/\.[^.]+$/, ''), url);
    }
    if (files.length) {
      state.pickedPhoto = state.photos.length - 1;
      state.assignments[state.selected] = state.pickedPhoto;
      setStatus(`${state.photos.length} photo(s) loaded — nothing was uploaded anywhere.`);
    }
    buildPhotoStrip();
    render();
  });

  document.getElementById('fill-all').addEventListener('click', () => {
    state.assignments = state.assignments.map(() => state.pickedPhoto);
    render();
  });

  const titleInput = document.getElementById('title-input');
  titleInput.value = state.caption.title;
  titleInput.addEventListener('input', () => {
    state.caption.title = titleInput.value;
    render();
  });
  const subtitleInput = document.getElementById('subtitle-input');
  subtitleInput.value = state.caption.subtitle;
  subtitleInput.addEventListener('input', () => {
    state.caption.subtitle = subtitleInput.value;
    render();
  });
  document.getElementById('title-size').addEventListener('input', (event) => {
    state.caption.titleScale = Number(event.target.value) / 100;
    render();
  });
  document.getElementById('stars-toggle').addEventListener('change', (event) => {
    state.caption.stars = event.target.checked;
    render();
  });

  const bindPlacement = (id, key, scale) => {
    document.getElementById(id).addEventListener('input', (event) => {
      state.placements[state.selected][key] = Number(event.target.value) * scale;
      render();
    });
  };
  bindPlacement('zoom-slider', 'zoom', 0.01);
  bindPlacement('panx-slider', 'panX', 0.01);
  bindPlacement('pany-slider', 'panY', 0.01);

  const exportAt = (size) => async () => {
    state.size = size;
    await exportPng(size);
    render();
  };
  document.getElementById('export-square').addEventListener('click', exportAt(EXPORT_SIZES[0]));
  document.getElementById('export-portrait').addEventListener('click', exportAt(EXPORT_SIZES[1]));
  document.getElementById('export-wide').addEventListener('click', exportAt(EXPORT_SIZES[2]));

  // Pointer work on the cover: click picks a panel, drag pans its photo,
  // the wheel zooms it.
  let dragging = null;
  const toCanvasPoint = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = toCanvasPoint(event);
    const index = lastRects.findIndex(
      (r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h,
    );
    if (index >= 0) {
      state.selected = index;
      dragging = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      render();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const panel = lastRects[state.selected];
    if (!panel) return;
    const placement = state.placements[state.selected];
    placement.panX = clamp(placement.panX - ((event.clientX - dragging.x) / panel.w) * 1.6, -1, 1);
    placement.panY = clamp(placement.panY - ((event.clientY - dragging.y) / panel.h) * 1.6, -1, 1);
    dragging = { x: event.clientX, y: event.clientY };
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = null; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const placement = state.placements[state.selected];
    placement.zoom = clamp(placement.zoom * (event.deltaY < 0 ? 1.07 : 0.93), 1, 3);
    render();
  }, { passive: false });
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// Render the cover at full export resolution (fresh graded sources, so a
// 1920-wide export is not an upscale of the preview's cached grade) and hand
// the PNG to the browser as a download.
async function exportPng(size) {
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  const offCtx = off.getContext('2d');
  const sources = state.layout.panels(size.width, size.height).map((_, index) => {
    const photo = state.photos[state.assignments[index] ?? 0];
    return photo ? gradedCanvasFor(photo.image, state.grade, 1920) : null;
  });
  drawCover(offCtx, size.width, size.height, {
    layout: state.layout,
    sources,
    placements: state.placements,
    caption: state.caption,
    selected: -1,
    showSelection: false,
  });
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `neon-coast-cover-${size.width}x${size.height}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  setStatus(`Exported a ${size.width} × ${size.height} PNG — check your downloads.`);
}

async function start() {
  if (shotMode === 'cover') {
    document.body.classList.add('shot-mode');
    const width = Number(params.get('w') ?? 1280);
    const height = Number(params.get('h') ?? 720);
    state.size = { id: 'shot', name: 'Shot', width, height };
    if (params.get('panels')) {
      state.assignments = params.get('panels').split(',').map((n) => Number(n));
    }
    if (params.get('crops')) {
      // Per-panel crops for a composed shot: "zoom,panX,panY;zoom,panX,panY;…"
      params.get('crops').split(';').forEach((triple, index) => {
        const [zoom, panX, panY] = triple.split(',').map(Number);
        if (state.placements[index] && Number.isFinite(zoom)) {
          state.placements[index] = { zoom, panX: panX || 0, panY: panY || 0 };
        }
      });
    }
    if (params.get('stars') === '0') state.caption.stars = false;
    await loadSamples();
    await document.fonts.ready;
    render();
    document.title = 'cover-shot-ready';
    return;
  }
  wireControls();
  refreshButtons();
  await loadSamples();
  await document.fonts.ready;
  render();
  document.title = 'editor-ready';
}

start();
