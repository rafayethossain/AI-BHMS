import { describe, it, expect } from 'vitest';
import themeCss from '../../components/SpreadsheetGrid.theme.css?raw';
import tokensCss from '../tokens.css?raw';

function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].replace(/\s+/g, ' ').trim();
    const body = match[2].trim();
    if (selector) out.push({ selector, body });
  }
  return out;
}

function ruleMatching(needle: string): { selector: string; body: string } | undefined {
  return rules(themeCss).find((r) => r.selector.includes(needle));
}

function ruleMatchingRegex(needle: RegExp): { selector: string; body: string } | undefined {
  return rules(themeCss).find((r) => needle.test(r.selector));
}

function token(block: string, name: string): string | undefined {
  const match = block.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('SpreadsheetGrid theme — token-driven & WCAG contrast (light + dark)', () => {
  it('uses no hardcoded colors in the grid theme (token-driven only)', () => {
    const hardcoded = themeCss.match(/#[0-9a-fA-F]{3,8}\b/) ?? [];
    expect(hardcoded).toHaveLength(0);
  });

  it('themes the in-cell editor/select with input tokens so it fits both modes', () => {
    const editor = ruleMatchingRegex(/tabulator-edit\b/);
    expect(editor, 'expected a .tabulator-edit rule in SpreadsheetGrid.theme.css').toBeDefined();
    expect(editor!.body).toContain('var(--color-bg-input)');
    expect(editor!.body).toContain('var(--color-text-body)');
    expect(editor!.body).toContain('var(--color-border-input)');
  });

  it('renders sort arrows with muted text tokens (readable in both modes)', () => {
    const arrow = ruleMatching('tabulator-arrow');
    expect(arrow, 'expected a .tabulator-arrow rule').toBeDefined();
    expect(arrow!.body).toContain('var(--color-text-muted)');
  });

  it('renders the empty-grid placeholder with muted text tokens', () => {
    const placeholder = ruleMatching('tabulator-placeholder-contents');
    expect(placeholder, 'expected a .tabulator-placeholder-contents rule').toBeDefined();
    expect(placeholder!.body).toContain('var(--color-text-muted)');
  });

  it('renders header text with body tokens (>= 4.5:1 in both modes)', () => {
    const header = ruleMatching('.tabulator-header');
    expect(header, 'expected a .tabulator-header rule').toBeDefined();
    expect(header!.body).toContain('var(--color-text-body)');
  });

  it('renders footer/pagination text with body tokens', () => {
    const footer = ruleMatching('.tabulator-footer');
    expect(footer, 'expected a .tabulator-footer rule').toBeDefined();
    expect(footer!.body).toContain('var(--color-text-body)');
  });
});

describe('Design tokens — WCAG contrast floor', () => {
  const blocks: Record<string, string> = {};
  for (const block of tokensCss.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)) {
    blocks[block[1]] = block[2];
  }

  const pairs: { fg: string; bg: string; min: number; label: string }[] = [
    { fg: 'text-body', bg: 'bg-surface', min: 4.5, label: 'body on surface (cells)' },
    { fg: 'text-heading', bg: 'bg-surface', min: 4.5, label: 'heading on surface (selected rows)' },
    { fg: 'text-muted', bg: 'bg-surface', min: 4.5, label: 'muted text on surface' },
    { fg: 'text-muted', bg: 'bg-surface-alt', min: 3.0, label: 'muted graphical (arrows) on surface-alt' },
    { fg: 'text-faint', bg: 'bg-surface', min: 3.0, label: 'faint secondary/disabled on surface' },
  ];

  for (const [scope, block] of Object.entries(blocks)) {
    it(`${scope.trim()} tokens meet contrast floors`, () => {
      for (const pair of pairs) {
        const fg = token(block, pair.fg);
        const bg = token(block, pair.bg);
        expect(fg, `missing ${pair.fg} in ${scope}`).toBeDefined();
        expect(bg, `missing ${pair.bg} in ${scope}`).toBeDefined();
        if (fg?.startsWith('#') && bg?.startsWith('#')) {
          const ratio = contrast(fg!, bg!);
          expect(ratio, `${scope}: ${pair.label} (#${pair.fg} vs #${pair.bg}) = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(pair.min);
        }
      }
    });
  }
});