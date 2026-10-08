// Separate dev entry: never imports main.tsx, AuthSessionProvider, or Supabase.
// The standard production build includes index.html only, not admin-preview.html.
if (import.meta.env.DEV) {
  void import('./AdminPreview').then(({ mountAdminPreview }) => mountAdminPreview());
}
