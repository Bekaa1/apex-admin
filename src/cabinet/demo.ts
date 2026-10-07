import type { TariffTerms } from './tariffs';

/** Dev-only preview of Home states: /cabinet?demo=new|active|loading|error. Never active in production builds. */
export type DemoVariant = 'new' | 'active' | 'loading' | 'error';

const VARIANTS: DemoVariant[] = ['new', 'active', 'loading', 'error'];

export function parseDemoVariant(value: string | null): DemoVariant | null {
  if (!import.meta.env.DEV || !value) return null;
  return VARIANTS.find((v) => v === value) ?? null;
}

/** Plan terms of the demo, as in the design. A function, so production builds drop it. */
export function demoTariffTerms(): TariffTerms[] {
  return [
    { code: 'standard', minimum: 500_000, version: 1 },
    { code: 'zones', minimum: 1_000_000, version: 1 },
    { code: 'premium', minimum: 2_000_000, version: 1 },
  ];
}
