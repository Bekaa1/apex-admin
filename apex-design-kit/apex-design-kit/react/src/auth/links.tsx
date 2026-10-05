import { createContext, useContext, type ReactNode } from 'react';

/** Where auth screens link to. Replace with your router paths (and swap <a> for your router's Link if needed). */
export interface AuthLinks {
  home: string;
  login: string;
  signup: string;
  verify: string;
  resetEmail: string;
  resetCode: string;
  resetNew: string;
  resetDone: string;
  privacy: string;
  offer: string;
}

export const DEFAULT_AUTH_LINKS: AuthLinks = {
  home: '/',
  login: '/login',
  signup: '/signup',
  verify: '/signup/verify',
  resetEmail: '/reset-password',
  resetCode: '/reset-password/code',
  resetNew: '/reset-password/new',
  resetDone: '/reset-password/done',
  privacy: '/privacy',
  offer: '/offer',
};

const AuthLinksContext = createContext<AuthLinks>(DEFAULT_AUTH_LINKS);

export function AuthLinksProvider({ links, children }: { links: Partial<AuthLinks>; children: ReactNode }) {
  return <AuthLinksContext.Provider value={{ ...DEFAULT_AUTH_LINKS, ...links }}>{children}</AuthLinksContext.Provider>;
}

export function useAuthLinks(): AuthLinks {
  return useContext(AuthLinksContext);
}
