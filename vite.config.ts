import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// The default stays the public site. Admin must be selected explicitly.
export default defineConfig(({ mode }) => {
  const app = mode === 'admin' ? 'admin' : 'public'
  const title = app === 'admin' ? 'ApexAdmin' : 'Apexmedia — реклама у полки'
  const description = app === 'admin'
    ? 'ApexAdmin — панель управления для сотрудников Apex.'
    : 'Запускайте видеорекламу у полки в супермаркетах Казахстана.'
  return {
    cacheDir: `node_modules/.vite/${app}`,
    server: { proxy: { '/api/chat/respond': 'http://127.0.0.1:8787', ...(app === 'public' ? { '/api/stats/report': 'http://127.0.0.1:8787' } : {}) } },
    plugins: [react(), {
      name: 'apex-app-metadata',
      transformIndexHtml: (html: string) => html
        .replace('__APEX_TITLE__', title)
        .replace('__APEX_DESCRIPTION__', description),
    }],
    resolve: { alias: { '@app/routes': fileURLToPath(new URL(`./src/routes/${app}.tsx`, import.meta.url)) } },
    build: { outDir: `dist/${app}` },
  }
})
