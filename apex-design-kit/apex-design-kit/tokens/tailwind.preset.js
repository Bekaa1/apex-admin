/**
 * Apex — Tailwind CSS preset. Colours point at CSS variables from react/src/design-system/tokens.css,
 * so light/dark switching is done by the [data-theme] attribute, not by Tailwind's dark: variant.
 * Usage (tailwind.config.js):  module.exports = { presets: [require('./apex-design-kit/tokens/tailwind.preset.js')], ... }
 * and import react/src/design-system/styles.css once in the app root.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg': 'var(--bg)',
        'surface': 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-muted': 'var(--surface-muted)',
        'input-bg': 'var(--input-bg)',
        'border': 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'text': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        'primary': 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-pressed': 'var(--primary-pressed)',
        'on-primary': 'var(--on-primary)',
        'primary-soft': 'var(--primary-soft)',
        'link': 'var(--link)',
        'focus': 'var(--focus)',
        'inverse': 'var(--inverse)',
        'on-inverse': 'var(--on-inverse)',
        'segment-active': 'var(--segment-active)',
        'brand-panel': 'var(--brand-panel)',
        'on-brand-panel': 'var(--on-brand-panel)',
        'on-brand-panel-muted': 'var(--on-brand-panel-muted)',
        'success': 'var(--success)',
        'success-soft': 'var(--success-soft)',
        'warning': 'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        'danger': 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        'on-danger': 'var(--on-danger)',
        'accent': 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'brand-cyan': 'var(--brand-cyan)',
        'brand-blue': 'var(--brand-blue)',
        'brand-magenta': 'var(--brand-magenta)'
      },
      fontFamily: {
        display: ['Geologica', 'Onest', 'system-ui', 'sans-serif'],
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)'
      },
      spacing: {
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
        'space-7': 'var(--space-7)',
        'space-8': 'var(--space-8)',
        'space-9': 'var(--space-9)',
        'space-10': 'var(--space-10)',
        'space-11': 'var(--space-11)'
      },
      height: {
        'control-sm': 'var(--control-sm)',
        'control-md': 'var(--control-md)',
        'control-lg': 'var(--control-lg)',
        'control-xl': 'var(--control-xl)'
      },
      maxWidth: {
        content: 'var(--content-max)',
        form: 'var(--form-max)'
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)'
      }
    }
  }
};
