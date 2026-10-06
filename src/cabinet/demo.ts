/** Dev-only preview of Home states: /cabinet?demo=new|active|loading|error. Never active in production builds. */
export type DemoVariant = 'new' | 'active' | 'loading' | 'error';

const VARIANTS: DemoVariant[] = ['new', 'active', 'loading', 'error'];

export function parseDemoVariant(value: string | null): DemoVariant | null {
  if (!import.meta.env.DEV || !value) return null;
  return VARIANTS.find((v) => v === value) ?? null;
}
