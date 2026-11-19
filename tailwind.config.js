/**
 * 一水千田｜Tailwind 設定（v3 語法）
 * ------------------------------------------------------------
 * 所有數值都指向 css/tokens.css 的 CSS 變數，兩邊永遠同步：
 * 改 tokens.css 就好，不要在這裡另外寫顏色。
 *
 * 目前網站沒有建置流程，主要寫法仍是一般 CSS ＋ 變數。
 * 這份設定是給「之後想改用 Tailwind」時使用（Tailwind CLI 或 Play CDN 皆可）。
 * 區域切換仍用 data-zone="exhibit | stage | archive"，Tailwind 的語意色會跟著變。
 */
module.exports = {
  content: ['./*.html', './js/**/*.js', './data/**/*.js'],
  theme: {
    screens: { sm: '600px', md: '960px', lg: '1280px' },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      // 語意色（會隨 data-zone 改變）— 元件請優先用這一組
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      text: 'var(--text)',
      muted: 'var(--text-muted)',
      line: 'var(--line)',
      'line-strong': 'var(--line-strong)',
      accent: 'var(--accent)',
      interactive: 'var(--interactive)',
      focus: 'var(--focus)',
      success: 'var(--success)',
      // 原始色票
      concrete: { 50: 'var(--concrete-50)', 100: 'var(--concrete-100)', 300: 'var(--concrete-300)', 500: 'var(--concrete-500)' },
      iron: { 700: 'var(--iron-700)', 900: 'var(--iron-900)' },
      pond: { 800: 'var(--pond-800)', 900: 'var(--pond-900)' },
      laterite: { DEFAULT: 'var(--laterite)', light: 'var(--laterite-light)' },
      brass: { DEFAULT: 'var(--brass)', dark: 'var(--brass-dark)' },
      canal: { DEFAULT: 'var(--canal)', light: 'var(--canal-light)' },
      paddy: { DEFAULT: 'var(--paddy)', light: 'var(--paddy-light)' },
      white: 'var(--white)',
    },
    fontFamily: {
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      game: 'var(--font-game)',
    },
    fontSize: {
      12: ['var(--fs-12)', { lineHeight: '1.6' }],
      14: ['var(--fs-14)', { lineHeight: '1.7' }],
      16: ['var(--fs-16)', { lineHeight: 'var(--lh-body)' }],
      18: ['var(--fs-18)', { lineHeight: 'var(--lh-body)' }],
      21: ['var(--fs-21)', { lineHeight: '1.7' }],
      24: ['var(--fs-24)', { lineHeight: 'var(--lh-heading)' }],
      36: ['var(--fs-36)', { lineHeight: 'var(--lh-heading)' }],
      48: ['var(--fs-48)', { lineHeight: 'var(--lh-tight)' }],
      72: ['var(--fs-72)', { lineHeight: '1' }],
      display: ['var(--fs-display)', { lineHeight: '1', letterSpacing: 'var(--ls-display)' }],
    },
    fontWeight: { light: 'var(--fw-light)', normal: 'var(--fw-regular)', bold: 'var(--fw-bold)', black: 'var(--fw-black)' },
    spacing: {
      0: '0', 1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)', 5: 'var(--space-5)',
      6: 'var(--space-6)', 7: 'var(--space-7)', 8: 'var(--space-8)', 9: 'var(--space-9)',
      section: 'var(--space-section)', gutter: 'var(--grid-gutter)', margin: 'var(--grid-margin)', nav: 'var(--nav-h)',
    },
    borderRadius: { none: '0', control: 'var(--radius-control)', media: 'var(--radius-media)', pin: 'var(--radius-pin)' },
    boxShadow: { none: 'none', elevation: 'var(--elevation)' },
    extend: {
      maxWidth: { grid: 'var(--grid-max)', measure: 'var(--measure)', 'measure-narrow': 'var(--measure-narrow)' },
      gridTemplateColumns: { site: 'repeat(var(--grid-cols), minmax(0, 1fr))' },
      transitionTimingFunction: { out: 'var(--ease-out)', inout: 'var(--ease-inout)' },
      transitionDuration: { fast: 'var(--dur-fast)', base: 'var(--dur-base)', slow: 'var(--dur-slow)' },
      zIndex: { nav: 'var(--z-nav)', overlay: 'var(--z-overlay)', toast: 'var(--z-toast)' },
    },
  },
  plugins: [],
};
