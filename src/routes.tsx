import type { ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { ResetPasswordRoute, VerificationRoute } from './auth/AuthRoutes';
import { LoginFlow, SignupFlow, SignupProfileFlow } from './auth/AuthFlows';
import { RequireSession, SessionLoading } from './auth/RequireSession';
import { DEFAULT_AUTH_LINKS } from './auth/links';
import { CABINET_ROOT, CABINET_SECTIONS, type CabinetRouteHandle } from './cabinet/sections';
import { Landing } from './landing/Landing';
import { PublicLayout } from './landing/PublicLayout';
import { LegalDocumentPage } from './legal/LegalDocumentPage';

function cabinetRoute(path: string, handle: CabinetRouteHandle, page?: () => Promise<ComponentType>): RouteObject {
  const route = {
    handle,
    lazy: page ? async () => ({ Component: await page() }) : undefined,
  };
  return path ? { ...route, path } : { ...route, index: true };
}

const cabinetRoutes: RouteObject[] = [
  ...CABINET_SECTIONS.flatMap((section) => [
    cabinetRoute(section.path, { titleKey: section.labelKey }, section.page),
    ...(section.subpages ?? []).map((sub) => cabinetRoute(sub.path, { titleKey: sub.titleKey, hideCreate: sub.hideCreate }, sub.page)),
  ]),
  { path: '*', element: <Navigate to={CABINET_ROOT} replace /> },
];

export const routes: RouteObject[] = [
  {
    path: '/', element: <PublicLayout />, children: [
      { index: true, element: <Landing /> },
      { path: 'pricing', lazy: async () => ({ Component: (await import('./landing/PricingPage')).PricingPage }) },
      { path: 'stores', lazy: async () => ({ Component: (await import('./landing/StoresPage')).StoresPage }) },
    ],
  },
  { path: DEFAULT_AUTH_LINKS.login, element: <LoginFlow /> },
  { path: DEFAULT_AUTH_LINKS.signup, element: <SignupFlow /> },
  { path: DEFAULT_AUTH_LINKS.verify, element: <VerificationRoute /> },
  { path: DEFAULT_AUTH_LINKS.profile, element: <SignupProfileFlow /> },
  { path: DEFAULT_AUTH_LINKS.resetEmail, element: <ResetPasswordRoute step="email" /> },
  { path: DEFAULT_AUTH_LINKS.resetCode, element: <ResetPasswordRoute step="code" /> },
  { path: DEFAULT_AUTH_LINKS.resetNew, element: <ResetPasswordRoute step="new" /> },
  { path: DEFAULT_AUTH_LINKS.resetDone, element: <ResetPasswordRoute step="done" /> },
  { path: DEFAULT_AUTH_LINKS.privacy, element: <LegalDocumentPage key="privacy" kind="privacy" /> },
  { path: DEFAULT_AUTH_LINKS.offer, element: <LegalDocumentPage key="offer" kind="offer" /> },
  {
    element: <RequireSession />,
    hydrateFallbackElement: <SessionLoading />,
    children: [{
      path: CABINET_ROOT,
      lazy: async () => ({ Component: (await import('./cabinet/CabinetLayout')).CabinetLayout }),
      children: cabinetRoutes,
    }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
