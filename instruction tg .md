# Как запустить сайт студии — пошагово

Сайт состоит из страницы и маленького сервера (`server.js`). Сервер нужен, чтобы
пересылать заявки из формы в Telegram и чтобы токен бота никто не увидел.
Устанавливать пакеты (`npm install`) **не нужно**.

---

## Шаг 1. Создайте Telegram-бота (5 минут)

1. В Telegram найдите **@BotFather** и нажмите **Start**.
2. Отправьте команду `/newbot`.
3. Введите название бота, например `Moth & Lantern Leads`.
4. Введите имя пользователя, оно должно заканчиваться на `bot`, например `mothlantern_leads_bot`.
5. BotFather пришлёт **токен** вида `123456789:AAH...`. Это `BOT_TOKEN`. Никому его не показывайте.

## Шаг 2. Узнайте свой CHAT_ID

1. Откройте своего нового бота (ссылка есть в сообщении от BotFather) и нажмите **Start**. Без этого бот не сможет вам писать.
2. Найдите в Telegram бота **@userinfobot** и нажмите **Start**. Он пришлёт ваш **Id**, например `123456789`. Это `CHAT_ID`.

Хотите, чтобы заявки приходили в группу? Добавьте своего бота в группу, напишите там любое сообщение
и откройте в браузере `https://api.telegram.org/botВАШ_ТОКЕН/getUpdates`. Найдите `"chat":{"id":-100...`:
это CHAT_ID группы (с минусом).

## Шаг 3. Проверьте у себя на компьютере

1. Распакуйте архив и откройте папку `studio-site` в VS Code.
2. Сделайте копию файла `.env.example` и назовите её `.env`.
   Откройте `.env` и впишите свои значения:
   ```
   BOT_TOKEN=123456789:AAH...ваш токен
   CHAT_ID=123456789
   ```
3. В терминале VS Code (Terminal → New Terminal):
   ```
   npm.cmd run dev
   ```
4. Откройте **http://localhost:3000**, заполните форму внизу страницы и нажмите **Send request**.
   Через секунду бот пришлёт заявку вам в Telegram.

## Шаг 4. Загрузите на GitHub

1. На github.com создайте новый репозиторий, например `moth-and-lantern-site` (Public, без README).
2. В терминале VS Code, **в папке studio-site**:
   ```
   git init
   git add .
   git commit -m "Studio website"
   git branch -M main
   git remote add origin https://github.com/MairamKenzh/moth-and-lantern-site.git
   git push -u origin main
   ```
   Файл `.env` с токеном на GitHub **не попадёт**: он указан в `.gitignore`. Так и должно быть.

## Шаг 5. Опубликуйте на Render

1. render.com → **+ New** → **Web Service** → выберите репозиторий `moth-and-lantern-site`.
2. Заполните поля:

   | Поле | Значение |
   |---|---|
   | Language | Node |
   | Branch | main |
   | Root Directory | *(пусто)* |
   | Build Command | *(пусто, или `npm install`)* |
   | Start Command | `npm start` |
   | Instance Type | Free |

3. Ниже, в разделе **Environment Variables**, нажмите **+ Add Environment Variable** и добавьте две переменные:
   - `BOT_TOKEN` → ваш токен
   - `CHAT_ID` → ваш id
4. Нажмите **Deploy Web Service** и дождитесь статуса **Live**.
5. Откройте ссылку вида `https://moth-and-lantern-site.onrender.com` и отправьте тестовую заявку.

Если заявка не пришла, откройте на Render вкладку **Logs**: там будет причина.
Чаще всего вы не нажали **Start** у своего бота или ошиблись в CHAT_ID.

---

## Как поменять содержимое

Весь текст сайта лежит в `public/index.html`, и каждый раздел подписан комментарием (`<!-- PROJECTS -->` и т. д.).

| Что поменять | Где |
|---|---|
| Название студии | `index.html`: ищите `Moth` (в шапке, подвале и `<title>`) |
| Ваше фото | положите `founder.jpg` в `public/assets/` и в блоке FOUNDER замените `<span>MK</span>` на `<img src="/assets/founder.jpg" alt="Ваше имя">` |
| Имя, навыки, даты | блок FOUNDER |
| Новый проект | скопируйте блок `<article class="file">…</article>` в разделе PROJECTS |
| Фото в галерею | положите картинку в `public/assets/gallery/` и скопируйте один `<li class="g">…</li>`. Класс `g--wide` делает большую плитку, `g--tall` — высокую |

После изменений отправьте их на GitHub, и Render обновит сайт сам:
```
git add .
git commit -m "Update content"
git push
```
