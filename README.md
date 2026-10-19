# Moth & Lantern — Studio Website

Portfolio website of **Moth & Lantern**, an independent game studio.
It presents the studio, its founder, projects with links to the live games and
source code, a gallery, and a consultation form that delivers requests
straight to a **Telegram bot**.

---

## Features

- One-page responsive site: studio, projects, gallery, founder CV, process, contact
- Projects shown as "case files" with status, stack and links (Play / Source code)
- Gallery with category filter and a lightbox (keyboard arrows, swipe on phones)
- Consultation form with client- and server-side validation
- Requests are sent to Telegram through the server, so the bot token is never exposed in the browser
- Spam protection: hidden honeypot field and a rate limit (5 requests per 10 minutes per IP)
- No dependencies: the server uses only built-in Node.js modules

## Technical Requirements

| Item | Requirement |
|---|---|
| Runtime | Node.js 20.6 or newer |
| Dependencies | none (`npm install` is not required) |
| Environment variables | `BOT_TOKEN`, `CHAT_ID`, optional `PORT` |
| Browser | Current Chrome, Edge, Firefox or Safari, desktop and mobile |
| Hosting | Any Node.js host; deployed on Render (free web service) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js (`http`, `fs`, built-in `fetch`) |
| Notifications | Telegram Bot API (`sendMessage`) |
| Fonts | Fraunces, Manrope, IBM Plex Mono (Google Fonts) |

## How the form works

```
Browser form ──POST /api/contact──►  Node.js server  ──sendMessage──►  Telegram bot  ──►  your chat
              (JSON)                 validates data,                  (BOT_TOKEN)        (CHAT_ID)
                                     honeypot, rate limit
```

## Project Structure

```
studio-site/
├── server.js            # static file server + /api/contact → Telegram
├── package.json
├── .env.example         # template for BOT_TOKEN and CHAT_ID
├── .gitignore           # keeps .env out of GitHub
└── public/
    ├── index.html       # all page content
    ├── styles.css
    ├── main.js          # menu, gallery, lightbox, form
    └── assets/
        ├── logo.svg
        └── gallery/     # gallery and project images
```

## Run locally

```bash
cp .env.example .env     # then put your BOT_TOKEN and CHAT_ID into .env
npm run dev              # Windows PowerShell: npm.cmd run dev
```

Open http://localhost:3000

## Deploy on Render

| Setting | Value |
|---|---|
| Language | Node |
| Build Command | *(leave empty)* |
| Start Command | `npm start` |
| Environment | `BOT_TOKEN`, `CHAT_ID` |

## Projects featured

- **Last Card** — online multiplayer card game · [Play](https://uno-with-friends-online.onrender.com) · [Source](https://github.com/MairamKenzh/uno-with-friends-online)
- **Case History** — mystery point-and-click game in Unity (in production)
- **Battle at Sea — Pirate Edition** — naval strategy game, vs computer or 2 players · [Play](https://battle-at-see-pirate-edition.vercel.app/)
- **Arcana Sort** — calm alchemy sorting puzzle · [Play](https://arcana-sort.vercel.app/) · [Source](https://github.com/MairamKenzh/arcana-sort)

## License

MIT
