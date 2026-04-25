
export const colors = {
  surface:                 "#121318",
  surfaceContainerLowest:  "#0d0e13",
  surfaceContainerLow:     "#1a1b20",
  surfaceContainer:        "#1e1f24",
  surfaceContainerHigh:    "#282a2f",
  surfaceContainerHighest: "#33353a",

  primary:          "#c6c0ff",
  primaryContainer: "#6b5ee0",
  primaryFixed:     "#e4dfff",
  primaryFixedDim:  "#c6c0ff",

  secondary:          "#c3c0ff",
  secondaryContainer: "#434281",

  tertiary:          "#e9b4f7",
  tertiaryContainer: "#8f609d",

  onPrimary:         "#27049e",
  onSurface:         "#e2e2e9",
  onSurfaceVariant:  "#c8c4d6",

  outline:        "#928f9f",
  outlineVariant: "#474554",

  error: "#ffb4ab",
} as const;

export type ColorToken = keyof typeof colors;


export const fontFamily = {
  headline: "'Manrope', sans-serif",
  body:     "'Inter', sans-serif",
  mono:     "monospace",
} as const;

export const fontSize = {
  "display-lg": "3.5rem",   // 56px
  "display-md": "2.75rem",  // 44px
  "headline-lg": "2rem",    // 32px
  "headline-md": "1.5rem",  // 24px
  "body-lg":  "1.0625rem",  // 17px
  "body-md":  "0.9375rem",  // 15px
  "body-sm":  "0.8125rem",  // 13px
  "label-md": "0.75rem",    // 12px
  "label-sm": "0.6875rem",  // 11px
  "label-xs": "0.625rem",   // 10px
  "label-xxs": "0.5625rem", // 9px
} as const;


export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;


export const radius = {
  DEFAULT: 2,
  sm:  4,
  md:  6,
  lg:  8,
  xl:  12,
  "2xl": 16,
  full: 9999,
} as const;


export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;500;700;800;900&family=Inter:wght@300;400;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: ${colors.surface};
    color: ${colors.onSurface};
    font-family: ${fontFamily.body};
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { display: none; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    vertical-align: middle;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }

  button:hover { opacity: 0.9; }

  select option {
    background: ${colors.surfaceContainerHigh};
    color: ${colors.onSurface};
  }
`;
