# Apex Admin

Основа для переноса HTML-экранов в React: TypeScript, Vite и Oxlint.

## Запуск

```powershell
npm ci
npm run dev
```

Основной проект: http://localhost:5173.

```powershell
npm run lint
npm run build
npm run preview
```

Используется Node.js 20.19+ или 22.12+ и npm. Зависимости закреплены в `package-lock.json`.

## Работа трех агентов

Все пути ниже указаны относительно основного каталога `apex-admin`.

| Назначение | Ветка | Каталог | Команда запуска в своем каталоге |
| --- | --- | --- | --- |
| Интеграция | `main` | `.` | `npm run dev -- --port 5173 --strictPort` |
| Агент 1 | `agent/1` | `../apex-admin-worktrees/agent-1` | `npm run dev -- --port 5174 --strictPort` |
| Агент 2 | `agent/2` | `../apex-admin-worktrees/agent-2` | `npm run dev -- --port 5175 --strictPort` |
| Агент 3 | `agent/3` | `../apex-admin-worktrees/agent-3` | `npm run dev -- --port 5176 --strictPort` |

Каждый worktree имеет собственные исходники и `node_modules`, но общую историю Git. Проверить рабочие копии: `git worktree list`.

После получения HTML координатор распределяет экраны и согласует общие компоненты. Агенты делают коммиты в своих ветках; координатор проверяет результат и объединяет изменения в `main`.

Правила совместной работы находятся в `AGENTS.md`.
