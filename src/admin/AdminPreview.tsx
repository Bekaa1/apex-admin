import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router';
import { ThemeProvider } from '../design-system/theme';
import { I18nProvider } from '../i18n/i18n';
import { AdminShell } from './AdminShell';
import { AdminNotFound, AdminPlaceholder } from './AdminPlaceholder';
import { ADMIN_SECTIONS } from './sections';
import '../index.css';
import '../design-system/styles.css';

/** Empty local preview only, with no session provider, query client, or data adapters. */
export function mountAdminPreview() {
  if (!import.meta.env.DEV) return;
  createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><I18nProvider><HashRouter>
    <Routes><Route element={<AdminShell preview><Outlet /></AdminShell>}>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      {ADMIN_SECTIONS.map((section) => <Route key={section.path} path={section.path} element={<AdminPlaceholder titleKey={section.labelKey} />} />)}
      <Route path="*" element={<AdminNotFound />} />
    </Route></Routes>
  </HashRouter></I18nProvider></ThemeProvider></StrictMode>);
}
