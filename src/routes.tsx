import type { ComponentType } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { ResetPasswordCodeRoute, VerifyEmailRoute } from './AuthPreviewRoutes';
import { LoginScreen } from './auth/LoginScreen';
import { DEFAULT_AUTH_LINKS } from './auth/links';
import { ResetPasswordDoneScreen, ResetPasswordEmailScreen, ResetPasswordNewScreen } from './auth/ResetScreens';
import { SignupScreen } from './auth/SignupScreen';
import { CABINET_ROOT, CABINET_SECTIONS, type CabinetRouteHandle } from './cabinet/sections';
import { Landing } from './landing/Landing';

const landing = <Landing loginHref={DEFAULT_AUTH_LINKS.login} startHref={DEFAULT_AUTH_LINKS.signup} />;

function cabinetRoute(path: string, titleKey: string, page?: () => Promise<ComponentType>): RouteObject {
  const route = {
    handle: { titleKey } satisfies CabinetRouteHandle,
    lazy: page ? async () => ({ Component: await page() }) : undefined,
  };
  return path ? { ...route, path } : { ...route, index: true };
}

const cabinetRoutes: RouteObject[] = [
  ...CABINET_SECTIONS.flatMap((section) => [
    cabinetRoute(section.path, section.labelKey, section.page),
    ...(section.subpages ?? []).map((sub) => cabinetRoute(sub.path, sub.titleKey, sub.page)),
  ]),
  { path: '*', element: <Navigate to={CABINET_ROOT} replace /> },
];

export const router = createBrowserRouter([
  { path: '/', element: landing },
  { path: DEFAULT_AUTH_LINKS.login, element: <LoginScreen /> },
  { path: DEFAULT_AUTH_LINKS.signup, element: <SignupScreen /> },
  { path: DEFAULT_AUTH_LINKS.verify, element: <VerifyEmailRoute /> },
  { path: DEFAULT_AUTH_LINKS.resetEmail, element: <ResetPasswordEmailScreen /> },
  { path: DEFAULT_AUTH_LINKS.resetCode, element: <ResetPasswordCodeRoute /> },
  { path: DEFAULT_AUTH_LINKS.resetNew, element: <ResetPasswordNewScreen /> },
  { path: DEFAULT_AUTH_LINKS.resetDone, element: <ResetPasswordDoneScreen /> },
  {
    path: CABINET_ROOT,
    lazy: async () => ({ Component: (await import('./cabinet/CabinetLayout')).CabinetLayout }),
    children: cabinetRoutes,
  },
  { path: '*', element: landing },
]);
