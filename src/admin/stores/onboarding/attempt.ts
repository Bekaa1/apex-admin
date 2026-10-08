import { isStoreId } from '../model';
import { FIELDS, type StoreFields } from './model';
import { RequestFailure } from './errors';

export interface CreateAttempt { key: string; values: StoreFields; uncertain: boolean; requestId?: string }
/** Create attempt and short-lived confirmed receipt, scoped to this tab and user. */
export function createAttemptStore(userId: string, storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, uuid: () => string) {
  const slot = `apex-admin:store-create:v1:${userId}`;
  const read = (): CreateAttempt | null => {
    try {
      const raw = storage.getItem(slot);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!isStoreId(value?.key) || typeof value?.uncertain !== 'boolean' || (value.requestId !== undefined && !isStoreId(value.requestId))
        || !value?.values || FIELDS.some(field => typeof value.values[field] !== 'string')) throw new Error();
      return value as CreateAttempt;
    } catch { throw new RequestFailure('storage'); }
  };
  const write = (value: CreateAttempt) => {
    try { storage.setItem(slot, JSON.stringify(value)); } catch { throw new RequestFailure('storage'); }
    return value;
  };
  return {
    read,
    prepare(values: StoreFields) {
      const current = read();
      return write({ key: current?.key ?? uuid(), values: current?.uncertain ? current.values : values, uncertain: true });
    },
    rejected() { const current = read(); if (current) write({ ...current, uncertain: false }); },
    complete(requestId: string) {
      const current = read();
      if (current) write({ ...current, requestId, uncertain: false });
    },
    acknowledge(requestId: string) {
      // Clear only after the confirmed UUID is in the route. A reload in the gap recovers it.
      try { if (read()?.requestId?.toLowerCase() === requestId.toLowerCase()) storage.removeItem(slot); } catch { /* keep the recovery marker */ }
    },
  };
}
export type AttemptStore = ReturnType<typeof createAttemptStore>;
