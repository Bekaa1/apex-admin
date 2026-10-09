import { Navigate, type RouteObject } from 'react-router';
import { RequireAdmin } from '../auth/RequireAdmin';
import { RequireStoreOwner } from '../auth/RequireStoreOwner';
import { RequireAdminSection } from '../auth/RequirePermission';
import { adminRoutePermission } from '../auth/permissions';
import { AdminLayout } from '../admin/AdminLayout';
import { AdminNotFound, AdminPlaceholder } from '../admin/AdminPlaceholder';
import { ADMIN_SECTIONS } from '../admin/sections';
import { AccessDenied, RouteFrame, RouteState } from '../navigation/RouteState';
import { ResetPasswordRoute } from '../auth/AuthRoutes';
import { LoginFlow } from '../auth/AuthFlows';
import { SessionLoading } from '../auth/RequireSession';
import { DEFAULT_AUTH_LINKS } from '../auth/links';
import { ChatRouteLayout } from '../chat/widget/ChatRouteLayout';

function withPermission(route: RouteObject): RouteObject {
  return { ...route, handle: { adminPermission: adminRoutePermission(`/admin/${route.path ?? ''}`), adminHome: route.index === true, admin404: route.path === '*' },
    ...(route.children ? { children: route.children.map(withPermission) } : {}) } as RouteObject;
}

const applicationRoutes: RouteObject[] = [
  { path: '/', element: <Navigate to="/admin" replace /> },
  { path: '/access-denied', element: <AccessDenied /> },
  {
    path: '/admin', element: <RequireAdmin />, children: [
      { element: <AdminLayout />, children: [{ element: <RequireAdminSection />, children: [
        { index: true, lazy: async () => ({ Component: (await import('../admin/overview/OverviewPage')).OverviewPage }) },
        { path: 'campaigns', lazy: async () => ({ Component: (await import('../admin/campaigns/CampaignsPage')).CampaignsPage }) },
        { path: 'moderation', lazy: async () => ({ Component: (await import('../admin/campaigns/CampaignsPage')).ModerationPage }) },
        { path: 'campaigns/:id', lazy: async () => ({ Component: (await import('../admin/campaigns/details/CampaignDetailPage')).CampaignDetailPage }) },
        { path: 'invoices', lazy: async () => ({ Component: (await import('../admin/invoices/InvoicesPage')).InvoicesPage }) },
        { path: 'invoices/:id', lazy: async () => ({ Component: (await import('../admin/invoices/details/InvoiceDetailPage')).InvoiceDetailPage }) },
        { path: 'clients', lazy: async () => ({ Component: (await import('../admin/clients/ClientsPage')).ClientsPage }) },
        { path: 'clients/:id', lazy: async () => ({ Component: (await import('../admin/clients/details/ClientDetailPage')).ClientDetailPage }) },
        { path: 'stores', lazy: async () => ({ Component: (await import('../admin/stores/StoresPage')).StoresPage }) },
        { path: 'store-requests', lazy: async () => ({ Component: (await import('../admin/stores/owner/StoreRequestsHome')).StoreRequestsHome }) },
        { element: <RequireStoreOwner />, children: [
          { path: 'store-requests/pending', lazy: async () => ({ Component: (await import('../admin/stores/owner/OwnerQueuePage')).OwnerQueuePage }) },
          { path: 'store-requests/:requestId/review', lazy: async () => ({ Component: (await import('../admin/stores/owner/OwnerReviewPage')).OwnerReviewPage }) },
        ] },
        { path: 'stores/new', lazy: async () => ({ Component: (await import('../admin/stores/onboarding/StoreRequestPage')).StoreRequestPage }) },
        { path: 'stores/new/:requestId', lazy: async () => ({ Component: (await import('../admin/stores/onboarding/StoreRequestPage')).StoreRequestPage }) },
        { path: 'stores/:id', lazy: async () => ({ Component: (await import('../admin/stores/details/StoreDetailPage')).StoreDetailPage }) },
        { path: 'equipment', lazy: async () => ({ Component: (await import('../admin/equipment/EquipmentPage')).EquipmentPage }) },
        { path: 'tariffs', lazy: async () => ({ Component: (await import('../admin/tariffs/TariffsPage')).TariffsPage }) },
        { path: 'media', lazy: async () => ({ Component: (await import('../admin/media/MediaPage')).MediaPage }) },
        { path: 'audit', lazy: async () => ({ Component: (await import('../admin/audit/AuditPage')).AuditPage }) },
        { path: 'team', lazy: async () => ({ Component: (await import('../admin/team/TeamPage')).TeamPage }) },
        { path: 'cart-routes/:id', lazy: async () => ({ Component: (await import('../admin/roles/CartRoutePage')).CartRoutePage }) },
        { path: 'partner/stores', lazy: async () => ({ Component: (await import('../admin/partner/PartnerPage')).PartnerStoresPage }) },
        { path: 'partner/stores/:id', lazy: async () => ({ Component: (await import('../admin/partner/PartnerPage')).PartnerStorePage }) },
        { path: 'partner/campaigns', lazy: async () => ({ Component: (await import('../admin/partner/PartnerPage')).PartnerCampaignsPage }) },
        { path: 'partner/equipment', lazy: async () => ({ Component: (await import('../admin/partner/PartnerPage')).PartnerEquipmentPage }) },
        { path: 'corporate-requests', lazy: async () => ({ Component: (await import('../admin/corporate-requests/CorporateRequestsPage')).CorporateRequestsPage }) },
        { path: 'corporate-requests/:id', lazy: async () => ({ Component: (await import('../admin/corporate-requests/CorporateRequestPage')).CorporateRequestPage }) },
        ...ADMIN_SECTIONS.filter((section) => section.placeholder).map((section) => ({ path: section.path.slice('/admin/'.length), element: <AdminPlaceholder titleKey={section.labelKey} /> })),
        { path: '*', element: <AdminNotFound /> },
      ].map(withPermission) }] },
    ],
  },
  { path: DEFAULT_AUTH_LINKS.login, element: <LoginFlow admin /> },
  { path: DEFAULT_AUTH_LINKS.resetEmail, element: <ResetPasswordRoute admin step="email" /> },
  { path: DEFAULT_AUTH_LINKS.resetCode, element: <ResetPasswordRoute admin step="code" /> },
  { path: DEFAULT_AUTH_LINKS.resetNew, element: <ResetPasswordRoute admin step="new" /> },
  { path: DEFAULT_AUTH_LINKS.resetDone, element: <ResetPasswordRoute admin step="done" /> },
  { path: '*', element: <RouteFrame admin><RouteState to="/admin" label="admin" /></RouteFrame> },
];

export const routes: RouteObject[] = [{ element: <ChatRouteLayout site="admin" />, hydrateFallbackElement: <SessionLoading admin />, children: applicationRoutes }];
