import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { normalizeKazakhstanPhone } from './validation';

const MAX_PHONE_DIGITS = 11;
const PHONE_DRAFT_RE = /^\+?[\d\s()-]+$/;

function countDigits(value: string): number {
  return value.match(/\d/g)?.length ?? 0;
}

function isPhoneDraft(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed.includes('@') && /\d/.test(trimmed) && PHONE_DRAFT_RE.test(trimmed);
}

function limitPhoneDigits(value: string): string {
  if (!isPhoneDraft(value)) return value;

  let digits = 0;
  let limited = '';
  for (const character of value) {
    if (/\d/.test(character)) {
      digits += 1;
      if (digits > MAX_PHONE_DIGITS) continue;
    }
    limited += character;
  }
  return limited;
}

/** Keeps phone entry unformatted while capping it at the supported Kazakhstan number length. */
export function useContactInput(initialValue: string) {
  const [contact, setContact] = useState(() => limitPhoneDigits(initialValue));

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeKazakhstanPhone(event.currentTarget.value);
    if (!normalized) return;

    const digits = normalized.slice(2);
    setContact(`+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`);
  };

  const handleBeforeInput = (event: FormEvent<HTMLInputElement>) => {
    const inputEvent = event.nativeEvent as InputEvent;
    const inserted = inputEvent.data;
    if (!inserted || !isPhoneDraft(event.currentTarget.value)) return;

    const input = event.currentTarget;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const selectedDigits = countDigits(input.value.slice(start, end));
    const resultingDigits = countDigits(input.value) - selectedDigits + countDigits(inserted);
    if (resultingDigits > MAX_PHONE_DIGITS) event.preventDefault();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const rawValue = input.value;
    const start = input.selectionStart ?? rawValue.length;
    const end = input.selectionEnd ?? start;
    const limitedValue = limitPhoneDigits(rawValue);
    const nextStart = limitPhoneDigits(rawValue.slice(0, start)).length;
    const nextEnd = limitPhoneDigits(rawValue.slice(0, end)).length;

    setContact(limitedValue);
    if (limitedValue !== rawValue) {
      requestAnimationFrame(() => input.setSelectionRange(nextStart, nextEnd));
    }
  };

  return { contact, handleBeforeInput, handleChange, handleBlur };
}
