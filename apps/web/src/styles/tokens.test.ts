import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Reads the real tokens from globals.css, so a color edited there below the
// WCAG 2.2 AA minimum fails CI instead of shipping (D136).
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const tokens = new Map(
  [...css.matchAll(/--fd-([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)].map(
    ([, name = '', light = '', dark = '']) => [name, { light, dark }] as const,
  ),
);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

// [foreground, background, minimum]: 4.5 for text, 3 for field borders
// (WCAG 1.4.11). Text in the accent uses accent-ink: the cyan itself only
// fills, because it reaches 2:1 on light paper.
const pairs: [string, string, number][] = [
  ['ink', 'paper', 4.5],
  ['ink', 'surface', 4.5],
  ['ink', 'raised', 4.5],
  ['ink-muted', 'paper', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'raised', 4.5],
  ['accent-ink', 'paper', 4.5],
  ['accent-ink', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent-ink', 'accent-soft', 4.5],
  ['danger', 'paper', 4.5],
  ['danger', 'surface', 4.5],
  ['on-danger', 'danger', 4.5],
  ['danger', 'danger-soft', 4.5],
  ['success', 'success-soft', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['field', 'surface', 3],
  ['field', 'paper', 3],
  // Mesa de luz (A3): text in the room's top bar and on the lit table, and
  // badges and secondary buttons filled with the table's raised tone.
  ['ink', 'room', 4.5],
  ['ink-muted', 'room', 4.5],
  ['accent-ink', 'room', 4.5],
  ['ink', 'table', 4.5],
  ['ink-muted', 'table', 4.5],
  ['accent-ink', 'table', 4.5],
  ['danger', 'table', 4.5],
  ['field', 'table', 3],
  ['ink', 'table-raised', 4.5],
  ['ink-muted', 'table-raised', 4.5],
];

// The focus ring is the cyan framed in on-accent (globals.css, and the inset
// ring of menu items). It stands out where either color reaches 3:1 on what
// sits behind it, and the frame has to set the cyan apart (WCAG 1.4.11). The
// accent is in the list for the primary button, which the frame touches.
const ringBackgrounds = ['paper', 'surface', 'raised', 'room', 'table', 'table-raised', 'accent'];

describe('design tokens', () => {
  it('parses every token used by the contrast pairs and the focus ring', () => {
    for (const name of [
      ...pairs.flatMap(([fg, bg]) => [fg, bg]),
      ...ringBackgrounds,
      'on-accent',
    ]) {
      expect(tokens.has(name), name).toBe(true);
    }
  });

  for (const mode of ['light', 'dark'] as const) {
    for (const [fg, bg, minimum] of pairs) {
      it(`${mode}: ${fg} on ${bg} reaches ${minimum}:1`, () => {
        const ratio = contrast(tokens.get(fg)![mode], tokens.get(bg)![mode]);
        expect(ratio).toBeGreaterThanOrEqual(minimum);
      });
    }

    const ring = tokens.get('accent')![mode];
    const frame = tokens.get('on-accent')![mode];
    it(`${mode}: the focus ring's frame sets the cyan apart (3:1)`, () => {
      expect(contrast(ring, frame)).toBeGreaterThanOrEqual(3);
    });
    for (const bg of ringBackgrounds) {
      it(`${mode}: the focus ring stands out on ${bg} (3:1)`, () => {
        const behind = tokens.get(bg)![mode];
        expect(Math.max(contrast(ring, behind), contrast(frame, behind))).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
