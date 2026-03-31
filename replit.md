# DEFFIZZY BAKE ERP

## Overview

Bakery management ERP system. Single project deployable on Render (free tier).

## Stack

- **Backend**: Express.js (Node.js, plain JavaScript, ES modules)
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 4
- **Database**: PostgreSQL (via `pg` library — no ORM)
- **Auth**: Session-based (cookies, stored in `sessions` table)
- **Routing**: Wouter (hash-based routing in frontend)
- **Data Fetching**: TanStack React Query v5
- **Google Drive**: googleapis for backup feature

## Project Structure

```
/
├── server/
│   ├── index.js          - Express entry point (serves static + API)
│   ├── db.js             - PostgreSQL pool + table migrations
│   ├── middleware.js      - requireAuth session middleware
│   └── routes/
│       ├── auth.js        - Login, logout, /me
│       ├── store.js       - Store inventory CRUD
│       ├── ingredients.js - Ingredients CRUD
│       ├── production.js  - Production batches CRUD
│       ├── packages.js    - Packaging CRUD
│       ├── dispatch.js    - Orders/dispatch CRUD
│       ├── dashboard.js   - Dashboard stats
│       ├── history.js     - Historical data by date
│       └── gdrive.js      - Google Drive OAuth + backup
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx       - React entry
│       ├── App.jsx        - Router setup (hash routing)
│       ├── index.css      - Global styles + Tailwind
│       ├── api.js         - Fetch utility wrapper
│       ├── components/
│       │   └── Layout.jsx - Sidebar + mobile nav
│       ├── hooks/
│       │   └── useAuth.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Store.jsx
│           ├── Ingredients.jsx
│           ├── Production.jsx
│           ├── Packaging.jsx
│           ├── Dispatch.jsx
│           ├── History.jsx
│           └── Settings.jsx  - Google Drive config
├── package.json          - Server dependencies
├── render.yaml           - Render deployment config
└── .env.example          - Environment variable template
```

## Development on Replit

Two workflows run simultaneously:
- **API Server** — `PORT=3000 node server/index.js` (Express API on port 3000)
- **Start application** — `PORT=5173 cd client && npm run dev` (Vite dev server on port 5173, proxies `/api` to port 3000)

## Deploying to Render (Free Tier)

1. Push the project to a GitHub repo
2. On Render, create a **Web Service** from the repo
3. Set:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server/index.js`
4. Add environment variables (see `.env.example`):
   - `DATABASE_URL` — PostgreSQL connection string (Neon.tech recommended)
   - `SESSION_SECRET` — any long random string
   - `APP_URL` — your Render app URL (e.g. `https://deffizzy-erp.onrender.com`)
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — (optional, for Drive backup)
5. Deploy!

## Database

Tables are auto-created on first server start (`server/db.js → initDb()`):
- `sessions` — auth sessions
- `store_items` — inventory
- `ingredients` — daily ingredients
- `production_batches` — production logs
- `packages` — packaging stock
- `orders` — dispatch orders
- `settings` — app settings (Google tokens, etc.)

## User Roles

| Username    | Password  | Role        |
|-------------|-----------|-------------|
| admin       | admin123  | ADMIN       |
| store_user  | store789  | STORE       |
| ing_user    | ing789    | INGREDIENT  |
| prod_user   | prod789   | PRODUCTION  |
| pkg_user    | pkg789    | PACKAGE     |
| disp_user   | disp789   | DISPATCH    |

## Google Drive Backup

1. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` env vars
2. Log in as admin → go to **Settings**
3. Click **Connect Google Account**
4. Authorize access
5. Click **Backup Now** to save all data to Google Drive
