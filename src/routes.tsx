import type { ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { RequireAdmin } from './auth/RequireAdmin';
import { AdminLayout } from './admin/AdminLayout';
import { AdminNotFound, AdminPlaceholder } from './admin/AdminPlaceholder';
import { ADMIN_SECTIONS } from './admin/sections';
import { AccessDenied, RouteFrame, RouteState } from './navigation/RouteState';
import { ResetPasswordRoute, VerificationRoute } from './auth/AuthRoutes';
import { LoginFlow, SignupFlow, SignupProfileFlow } from './auth/AuthFlows';
import { RequireSession, SessionLoading } from './auth/RequireSession';
import { DEFAULT_AUTH_LINKS } from './auth/links';
import { CABINET_ROOT, CABINET_SECTIONS, type CabinetRouteHandle } from './cabinet/sections';
import { PublicLayout } from './landing/PublicLayout';
import { LegalDocumentPage } from './legal/LegalDocumentPage';

function cabinetRoute(path: string, handle: CabinetRouteHandle, page?: () => Promise<ComponentType>): RouteObject {
  const route = {
    handle,
    lazy: page ? async () => ({ Component: await page() }) : undefined,
    element: page ? undefined : <RouteState kind="unavailable" to={path.startsWith('campaigns/') ? '/cabinet/campaigns' : CABINET_ROOT} label="list" />,
  };
  return path ? { ...route, path } : { ...route, index: true };
}

const cabinetRoutes: RouteObject[] = [
  ...CABINET_SECTIONS.flatMap((section) => [
    cabinetRoute(section.path, { titleKey: section.labelKey }, section.page),
    ...(section.subpages ?? []).map((sub) => cabinetRoute(sub.path, { titleKey: sub.titleKey, hideCreate: sub.hideCreate }, sub.page)),
  ]),
  { path: '*', element: <RouteState to={CABINET_ROOT} /> },
];

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={CABINET_ROOT} replace /> },
  { path: '/access-denied', element: <AccessDenied /> },
  {
    path: '/admin', element: <RequireAdmin />, children: [
      { element: <AdminLayout />, children: [
        { index: true, lazy: async () => ({ Component: (await import('./admin/overview/OverviewPage')).OverviewPage }) },
        { path: 'media', lazy: async () => ({ Component: (await import('./admin/media/MediaPage')).MediaPage }) },
        { path: 'audit', lazy: async () => ({ Component: (await import('./admin/audit/AuditPage')).AuditPage }) },
        { path: 'corporate-requests', lazy: async () => ({ Component: (await import('./admin/corporate-requests/CorporateRequestsPage')).CorporateRequestsPage }) },
        { path: 'corporate-requests/:id', lazy: async () => ({ Component: (await import('./admin/corporate-requests/CorporateRequestPage')).CorporateRequestPage }) },
        ...ADMIN_SECTIONS.filter((section) => section.placeholder).map((section) => ({ path: section.path.slice('/admin/'.length), element: <AdminPlaceholder titleKey={section.labelKey} /> })),
        { path: '*', element: <AdminNotFound /> },
      ] },
    ],
  },
  {
    element: <PublicLayout />, children: [
      { path: 'pricing', lazy: async () => ({ Component: (await import('./landing/PricingPage')).PricingPage }) },
      { path: 'stores', lazy: async () => ({ Component: (await import('./landing/StoresPage')).StoresPage }) },
      { path: 'how-it-works', lazy: async () => ({ Component: (await import('./landing/HowItWorksPage')).HowItWorksPage }) },
    ],
  },
  { path: DEFAULT_AUTH_LINKS.login, element: <LoginFlow /> },
  { path: '/admin/login', element: <LoginFlow admin /> },
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
  { path: '*', element: <RouteFrame admin><RouteState /></RouteFrame> },
];
