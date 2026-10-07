import { useSyncExternalStore } from 'react';

export type SignupLegalDocument = 'offer' | 'privacy';

// UI state for this registration tab, not a server-side record of legal consent.
// Bump the key when either document changes and acceptance must be requested again.
const STORAGE_KEY = 'apex-signup-consent-v1';
const CONSENTS = {
  none: { offer: false, privacy: false },
  offer: { offer: true, privacy: false },
  privacy: { offer: false, privacy: true },
  both: { offer: true, privacy: true },
} as const;
type ConsentState = keyof typeof CONSENTS;

let memoryState: ConsentState | null = null;
let storageUnavailable = false;
const listeners = new Set<() => void>();

function getSnapshot(): ConsentState | null {
  if (!storageUnavailable) {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      memoryState = stored === 'none' || stored === 'offer' || stored === 'privacy' || stored === 'both' ? stored : null;
    } catch {
      storageUnavailable = true;
    }
  }
  return memoryState;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener('pageshow', notify);
    window.addEventListener('storage', onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('pageshow', notify);
      window.removeEventListener('storage', onStorage);
    }
  };
}

function save(state: ConsentState) {
  memoryState = state;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, state);
  } catch {
    storageUnavailable = true;
  }
  notify();
}

function setDocumentAccepted(document: SignupLegalDocument, accepted: boolean) {
  const next = { ...CONSENTS[getSnapshot() ?? 'none'], [document]: accepted };
  save(next.offer && next.privacy ? 'both' : next.offer ? 'offer' : next.privacy ? 'privacy' : 'none');
}

function setAllAccepted(accepted: boolean) {
  save(accepted ? 'both' : 'none');
}

export function clearSignupConsent() {
  save('none');
}

function getServerSnapshot() {
  return null;
}

export function useSignupConsent(initiallyAccepted = false) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const documents = CONSENTS[state ?? (initiallyAccepted ? 'both' : 'none')];
  return { documents, accepted: documents.offer && documents.privacy, setDocumentAccepted, setAllAccepted };
}
