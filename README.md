# 🥋 Sambo Hero — Telegram Mini App

Игровой трекер тренировок для ребёнка: XP, уровни, пояса, серии, награды от родителя, достижения, напоминания через бота.

## Структура

```
sambo-hero-tma/
├── server/          # Express API + grammY-бот + SQLite
├── webapp/          # React-фронт (Vite), Telegram WebApp SDK
├── Dockerfile       # multi-stage: сборка фронта → рантайм
├── docker-compose.yml
└── .env.example
```

Один контейнер: сервер отдаёт статику фронта, API `/api/state` и держит бота (long polling — вебхук не нужен).

## 1. Создание бота (5 минут)

1. В Telegram → **@BotFather** → `/newbot` → имя `Sambo Hero`, username вида `sambo_hero_bot`.
2. Скопируй токен → в `.env`.
3. Больше ничего в BotFather не нужно — кнопку меню сервер настроит сам через `setChatMenuButton`.

## 2. Деплой на VPS

```bash
# на сервере
cd /opt && git clone <repo> sambo-hero  # или scp каталога
cd sambo-hero
cp .env.example .env && nano .env       # BOT_TOKEN + APP_URL
docker compose up -d --build
docker compose logs -f                  # ждём "Bot polling started"
```

Контейнер слушает только `127.0.0.1:8090` — наружу через Traefik.

## 3. Traefik (provider.yml)

DNS: A-запись `sambo.procurarus.com` → IP сервера.

В `/matrix/traefik/config/provider.yml` добавь:

```yaml
http:
  routers:
    sambo-hero:
      rule: "Host(`sambo.procurarus.com`)"
      entryPoints:
        - websecure
      service: sambo-hero
      tls:
        certResolver: letsencrypt   # имя резолвера как у остальных роутов

  services:
    sambo-hero:
      loadBalancer:
        servers:
          - url: "http://172.17.0.1:8090"   # docker bridge → порт контейнера
```

> Если Traefik в той же docker-сети, что и sambo-hero, можно вместо bridge-IP указать `http://sambo-hero:3000` и убрать ports из compose. Проверь, какой паттерн уже используешь для niitec/matrix — повтори его.

Проверка: `https://sambo.procurarus.com` должен открыть приложение в браузере (без Telegram оно покажет 401 при загрузке данных — это норма, валидация initData работает).

## 4. Запуск на телефоне

- Ребёнок открывает бота → `/start` → кнопка **«🥋 Открыть Sambo Hero»** (или кнопка меню слева от поля ввода).
- Работает одинаково на iOS и Android, ничего устанавливать не нужно.
- Прогресс хранится на сервере (SQLite, ключ — Telegram user id) → виден с любого устройства.

## 5. Напоминания

- По умолчанию включены, время — `REMIND_TIME` в `.env` (TZ задаётся в compose, стоит Europe/Moscow).
- Бот сам подставляет текущую серию: «Твоя серия — 5 🔥 Не дай ей прерваться!»
- Управление: `/remind_on`, `/remind_off`.

## 6. Безопасность

- Каждый запрос к API проходит HMAC-валидацию `initData` (подпись токеном бота, окно 24 ч) — подделать чужой прогресс нельзя.
- PIN родителя хранится в состоянии пользователя; для MVP этого достаточно (защита от ребёнка, не от хакера).
- БД в `./data/sambo.db` — добавь каталог в свой бэкап-скрипт.

## Локальная разработка

```bash
cd server && npm i && BOT_TOKEN=... APP_URL=http://localhost:5173 node index.js
cd webapp && npm i && npm run dev   # vite проксирует /api на :3000
```

## Что дальше (по желанию)

- **Подтверждение тренером**: вторая роль в боте — тренер получает кнопку «Подтвердить» при отметке ребёнка, XP начисляется после подтверждения.
- **Рейтинг группы**: таблица учеников одной секции (друзья по invite-ссылке бота).
- **PDF-отчёт родителю за месяц** — по твоему готовому ReportLab-паттерну, бот шлёт файл 1-го числа.
