# Apexmedia — сервер и деплой

[Обзор проекта](TECHNICAL_OVERVIEW.md) · [Справочник БД](DATABASE_SCHEMA.md)

Состояние проверено при деплое **7 октября 2026 года**. Последний размещённый коммит на момент записи: `ae03ddde30c080fbbea8c994d5af8bd3c0ab6592` (`main`). Дата размещения: `2026-10-07T10:17:58Z`.

## 1. Адреса и сервисы

| Параметр | Значение |
| --- | --- |
| Сайт | `https://apexmedia.kz` |
| Доступ по IP | `http://31.130.153.154` |
| SSH | `root@31.130.153.154`, порт 22; пароль/ключ получать отдельно |
| Hostname VPS | `9220183-lm697753.twc1.net` |
| ОС при проверке | Ubuntu 26.04.1 LTS |
| HTTP/TLS | Caddy 2.11.4, Docker-контейнер `supabase-caddy`, образ `caddy:2` |
| Порты Caddy | 80/tcp, 443/tcp, 443/udp |
| Nginx | При проверке не установлен и не обслуживает сайт |
| Backend React-приложения | Supabase Cloud `eveylcsziemhqouazebu.supabase.co` |
| DNS A | `apexmedia.kz` → `31.130.153.154`, TTL при проверке 3600 |
| DNS NS | `ns1.ps.kz`, `ns2.ps.kz`, `ns3.ps.kz` |
| `www.apexmedia.kz` | При проверке DNS-записи и отдельного host-блока не было |

Caddy автоматически получает и обновляет сертификат Let’s Encrypt. HTTP-запросы к домену перенаправляются на HTTPS; IP остаётся доступен по HTTP. Устанавливать второй веб-сервер на занятые 80/443 для этого фронтенда не нужно.

На этом VPS также находятся:

- self-hosted Supabase: контейнеры Auth, PostgreSQL, PostgREST, Storage, Studio, Realtime, Edge Functions и другие; внешний домен `supabase.apexmedia.kz`;
- n8n с доменом `n8n.adminapex.kz`;
- сервисы apex-ai-bot, WAHA и их база.

**React сейчас использует Supabase Cloud.** Наличие self-hosted Supabase на VPS не означает, что нужно заменить `VITE_SUPABASE_URL` на его домен. Его актуальное назначение, данные и связь с Cloud требуют отдельного уточнения.

## 2. Где находятся файлы

| На хосте | Назначение |
| --- | --- |
| `/root/supabase-project` | Рабочий каталог существующего стека |
| `/root/supabase-project/volumes/proxy/caddy/Caddyfile` | Общий конфиг Caddy с несколькими доменами |
| `/root/supabase-project/volumes/proxy/caddy/sites/apex-admin` | Каталог фронтенда |
| `…/sites/apex-admin/releases/<полный SHA>/` | Содержимое конкретной сборки: `index.html`, `assets/`, `legal/` и прочее |
| `…/sites/apex-admin/current` | Относительная symlink на активный релиз |
| `…/sites/apex-admin/deployment.txt` | Сведения о последнем размещении |
| `…/sites/apex-admin/deployment-20261007T101758Z.json` | Метаданные выполненного деплоя |

Bind mount контейнера: `/root/supabase-project/volumes/proxy/caddy` → `/etc/caddy`. Поэтому корень сайта **внутри контейнера** — `/etc/caddy/sites/apex-admin/current`.

На дату снимка:

```text
current -> releases/ae03ddde30c080fbbea8c994d5af8bd3c0ab6592
предыдущий релиз: 52dd6fd2e1f236b752786c04ed5a17b37ab25567
```

Symlink должна оставаться относительной: абсолютный путь `/root/...` не соответствует путям внутри контейнера.

## 3. Конфигурация сайта

Это **только блок фронтенда**, а не весь `Caddyfile`. Другие host-блоки обслуживают существующие сервисы.

```caddyfile
apexmedia.kz, http://31.130.153.154 {
    root * /etc/caddy/sites/apex-admin/current
    encode zstd gzip

    header {
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        X-Frame-Options SAMEORIGIN
        -Server
    }

    handle /assets/* {
        header Cache-Control "public, max-age=31536000, immutable"
        file_server
    }

    handle {
        try_files {path} /index.html
        header Cache-Control "no-cache"
        file_server
    }
}
```

`try_files` обеспечивает открытие `/login`, `/cabinet/...` и других маршрутов при прямом переходе. Для отсутствующих `/assets/*` возвращается ошибка файла, а не HTML. Хешированные assets кэшируются надолго, HTML перепроверяется перед использованием.

## 4. Порядок выпуска новой версии

Это инструкция ручного выпуска. Готового deploy-скрипта и GitHub Actions workflow в репозитории пока нет. Push/merge в `main` сам по себе сервер не обновляет.

### Подготовить сборку локально

1. Убедиться, что рабочее дерево чистое, получить свежий `origin/main`, зафиксировать полный SHA. Не включать незакоммиченные правки в релиз, обозначенный SHA другого состояния.
2. Проверить production env: нужен URL **Cloud Apex** и его публичный ключ. Секреты на сервер фронтенда не копировать.
3. Выполнить `npm ci`, `npm run lint`, `npm run build`.
4. Создать `dist/version.json` с SHA и UTC-временем сборки. Vite сам этот файл не генерирует.

Пример PowerShell из корня проекта после успешной сборки:

```powershell
$releaseCommit = (git rev-parse HEAD).Trim()
$releaseVersion = @{
    commit = $releaseCommit
    builtAt = [DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json -Compress
[IO.File]::WriteAllText(
    (Join-Path (Get-Location) 'dist/version.json'),
    $releaseVersion,
    [Text.UTF8Encoding]::new($false)
)
$releaseArchive = Join-Path $env:TEMP "apex-admin-$releaseCommit.tgz"
tar -czf $releaseArchive -C dist .
Get-FileHash -Algorithm SHA256 -LiteralPath $releaseArchive
```

Передать архив через SFTP (например, WinSCP или клиент на `ssh2`) в `/tmp/` на VPS. При последнем деплое использовался `ssh2`, не OpenSSH. Проверять host key по доверенной записи/отпечатку; пароль не сохранять в скрипт, Git или командную строку.

### Подготовить релиз на VPS

1. Посмотреть `docker ps`, текущую symlink и свободное место. Сохранить предыдущую цель `current` и SHA архива.
2. Сравнить `sha256sum` загруженного архива с локальным хешем.
3. Распаковать собственный архив сборки в новый, ранее не существующий `releases/<SHA>/`. `index.html` должен находиться прямо в этом каталоге, без дополнительного уровня `dist/`.
4. Проверить `index.html`, `version.json`, основные assets. Сохранить недостающие хешированные assets предыдущего релиза в новом, чтобы открытые вкладки могли догрузить старые lazy chunks; новые файлы не перезаписывать.
5. Не удалять предыдущий релиз до проверки нового и завершения согласованного срока хранения.

Если меняется только сборка, конфиг Caddy остаётся тем же. Если меняется домен или правила раздачи, сначала подготовить **полный конфиг-кандидат с сохранёнными чужими блоками**, сделать резервную копию и проверить кандидата:

```bash
docker exec supabase-caddy caddy validate --config /etc/caddy/Caddyfile.candidate --adapter caddyfile
```

`Caddyfile.candidate` в этой команде — подготовленный файл внутри существующего bind mount, не произвольный путь хоста.

### Переключить и проверить

После подготовки релиза атомарно заменить `current` через временную относительную symlink и `mv -T`. Пример Bash с **подставленным и проверенным SHA**, не команда подготовки архива:

```bash
SITE=/root/supabase-project/volumes/proxy/caddy/sites/apex-admin
REV='<полный SHA подготовленного релиза>'
PREVIOUS=$(readlink "$SITE/current")
test -f "$SITE/releases/$REV/index.html" || exit 1
test -f "$SITE/releases/$REV/version.json" || exit 1
printf '%s\n' "$PREVIOUS"
ln -s "releases/$REV" "$SITE/current.next-$REV"
mv -Tf "$SITE/current.next-$REV" "$SITE/current"
```

Если конфиг изменён, атомарно установить проверенного кандидата и выполнить:

```bash
docker exec supabase-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Для смены одной symlink при неизменном конфиге reload не требуется. Не выполнять `docker compose down`: фронтенд не требует остановки Supabase, n8n или бота.

Проверить результат снаружи:

- `https://apexmedia.kz/version.json` содержит новый SHA.
- `/`, `/login`, `/signup`, `/offer` открываются; вложенные SPA-адреса не дают серверный 404.
- Основные JS/CSS возвращаются как соответствующие файлы, их хеши совпадают со сборкой.
- Сертификат проходит обычную TLS-проверку; HTTP домена перенаправляется на HTTPS.
- В браузере отображается актуальная версия, нет ошибок загрузки chunks/консоли.
- Запросы Auth направлены в правильный Cloud-проект; ранее работающие сервисы VPS остаются доступны.

Ответ 200 на `/cabinet/...` доказывает только работу SPA fallback. Проверка доступа к данным кабинета требует отдельного входа; реальную отправку OTP и создание кампаний выполнять только в рамках согласованной проверки.

Сохранить метаданные выпуска: SHA, UTC-время, предыдущий релиз, имя архива и результат проверки. Обновить этот документ, если поменялись инфраструктура или процедура.

### Откат

Сохранённую цель `PREVIOUS` использовать для создания новой временной symlink и атомарной замены `current`. Если менялся Caddyfile, восстановить его резервную копию, выполнить validate/reload. Затем снова проверить `version.json` и сайт.

Откат статической сборки не откатывает изменения Cloud-БД/Auth/Storage. Их миграции имеют отдельный жизненный цикл и должны сохранять совместимость с возвращаемым фронтендом.

## 5. Диагностика

| Симптом | Что проверить |
| --- | --- |
| После merge сайт прежний | Был ли отдельный деплой; SHA в `version.json`; цель `current` |
| Домен ведёт на старый сайт | A/AAAA, NS и TTL у авторитетного DNS и локального резолвера; открыть без старого браузерного кэша |
| По IP новый сайт, по домену старый | DNS и host-блок Caddy; IP сам по себе не проверяет маршрутизацию домена |
| 404 при обновлении `/cabinet/...` | `try_files {path} /index.html` в Caddy |
| JS/CSS не загружаются | Пути assets, MIME, содержимое архива, старые chunks открытой вкладки |
| «Supabase is not configured» | Env при сборке; после исправления пересобрать фронтенд |
| RPC 404 | URL проекта, существование функции и её сигнатура; не выполнять несвязанную миграцию вслепую |
| OTP не приходит | Auth/Edge Function логи, лимиты, текущий SMS sender/префикс, шаблоны email и статус провайдера |
| Сохранение не разрешено | JWT/сессия, RLS/grants, параметры RPC; HTTP 200 статики не проверяет эти права |

При переносе домена 7 октября старый A-кэш ещё указывал на `34.136.28.237` со старым FlutterFlow-сайтом. После истечения DNS TTL и обновления браузера начал открываться новый React-сайт. Это историческая причина того случая, а не универсальная причина любого устаревшего отображения.

## 6. Что не хранится в этом репозитории

SSH-пароль/ключи, доступ к панели VPS/DNS, полный Caddyfile с настройками других сервисов, Docker secrets, резервные копии БД, почтовые шаблоны Supabase и полный backend deployment находятся у владельцев соответствующих систем. В документации указаны только адреса, пути и имена переменных. Регламент резервного копирования и восстановления нужно уточнить отдельно.
