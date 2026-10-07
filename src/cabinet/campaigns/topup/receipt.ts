import { TARIFFS, type TariffCode } from '../../tariffs';

/** What «Счёт выставлен» shows; passed in the navigation state. */
export interface TopUpReceipt {
  name: string;
  tariff: TariffCode | 'corporate' | null;
  amount: number;
  email: string;
}

export function readTopUpReceipt(state: unknown): TopUpReceipt | null {
  if (typeof state !== 'object' || state === null) return null;
  const name: unknown = Reflect.get(state, 'name');
  const amount: unknown = Reflect.get(state, 'amount');
  const email: unknown = Reflect.get(state, 'email');
  const code: unknown = Reflect.get(state, 'tariff');
  const tariff = code === 'corporate' ? code : (TARIFFS.find((plan) => plan.code === code)?.code ?? null);
  return typeof name === 'string' && typeof amount === 'number' && typeof email === 'string' ? { name, tariff, amount, email } : null;
}
