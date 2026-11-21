// layouts.js — the panel arrangements of Neon Coast Cover Studio.
//
// A layout is a function of the cover's width and height that returns panel
// rectangles as fractions of the frame, so the same arrangement works at
// 1080 x 1080, 1080 x 1350 and 1920 x 1080. The renderer insets every panel by
// a shared gutter, which is what leaves the pale grid lines between panels
// that make a collage read as one poster.

function rect(x, y, w, h, hero = false) {
  return { x, y, w, h, hero };
}

export const LAYOUTS = [
  {
    id: 'hero-and-three',
    name: 'Hero + Three',
    panels(width, height) {
      void width;
      void height;
      return [
        rect(0, 0, 0.6, 1, true),
        rect(0.6, 0, 0.4, 1 / 3),
        rect(0.6, 1 / 3, 0.4, 1 / 3),
        rect(0.6, 2 / 3, 0.4, 1 / 3),
      ];
    },
  },
  {
    id: 'poster-grid',
    name: 'Poster Grid',
    panels() {
      const out = [];
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          out.push(rect(col / 3, row / 2, 1 / 3, 1 / 2, row === 0 && col === 0));
        }
      }
      return out;
    },
  },
  {
    id: 'quad-grid',
    name: 'Quad Grid',
    panels() {
      return [
        rect(0, 0, 0.5, 0.5, true),
        rect(0.5, 0, 0.5, 0.5),
        rect(0, 0.5, 0.5, 0.5),
        rect(0.5, 0.5, 0.5, 0.5),
      ];
    },
  },
  {
    id: 'full-bleed',
    name: 'Full Bleed',
    panels() {
      return [rect(0, 0, 1, 1, true)];
    },
  },
];

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

// Turn a layout's fractional panels into pixel rectangles for a cover of the
// given size, inset by the gutter so neighbouring panels never touch.
export function panelRects(layout, width, height, gutter) {
  return layout.panels(width, height).map((panel) => ({
    x: panel.x * width + gutter,
    y: panel.y * height + gutter,
    w: panel.w * width - gutter * 2,
    h: panel.h * height - gutter * 2,
    hero: panel.hero,
  }));
}
