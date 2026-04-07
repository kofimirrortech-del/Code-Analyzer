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
│   ├── index.js                    - Express entry point
│   ├── db.js                       - PostgreSQL pool + table migrations
│   ├── middleware.js               - requireAuth (sets req.user)
│   └── routes/
│       ├── auth.js                 - Login, logout, /me
│       ├── store.js                - Store CRUD + /names (persistent)
│       ├── ingredients.js          - Ingredients CRUD + /names (persistent)
│       ├── production.js           - Production CRUD + /products (persistent)
│       ├── packages.js             - Packaging CRUD + /types (persistent)
│       ├── dispatch.js             - Dispatch CRUD + /items (persistent)
│       ├── todays-order-note.js    - Standalone Today's Order notes (admin write, all read)
│       ├── todays-production-note.js - Standalone Today's Production notes (admin write, all read)
│       ├── dashboard.js            - Dashboard stats
│       ├── history.js              - Historical data by date
│       └── gdrive.js               - Google Drive OAuth + backup
├── client/src/
│   ├── App.jsx                     - Routes + role-based redirects
│   ├── components/Layout.jsx       - Sidebar + mobile nav (role-filtered)
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx           - ADMIN only
│       ├── Store.jsx               - ADMIN + STORE
│       ├── Ingredients.jsx         - ADMIN + INGREDIENT
│       ├── Production.jsx          - ADMIN + PRODUCTION (standalone, no links)
│       ├── Packaging.jsx           - ADMIN + PACKAGE
│       ├── Dispatch.jsx            - ADMIN + DISPATCH
│       ├── TodaysOrder.jsx         - ADMIN (write) + PACKAGE/DISPATCH (read-only)
│       ├── TodaysProduction.jsx    - ADMIN (write) + STORE/INGREDIENT/PRODUCTION (read-only)
│       ├── History.jsx             - ADMIN only
│       └── Settings.jsx            - ADMIN only, Google Drive config
```

## Role-Based Dashboard (Home page on login)

| Role        | Home page          | Can also access             |
|-------------|--------------------|-----------------------------|
| ADMIN       | Dashboard (/)      | Everything                  |
| STORE       | Today's Production | Store                       |
| INGREDIENT  | Today's Production | Ingredients                 |
| PRODUCTION  | Today's Production | Production                  |
| PACKAGE     | Today's Order      | Packaging                   |
| DISPATCH    | Today's Order      | Dispatch                    |

Non-admin users can **edit** records in their section but **cannot add or delete**.

## Persistent Names (survive day changes)

Each data section has a separate persistent names table:
- `store_item_names` → Item Name column in Store
- `ingredient_names` → Name column in Ingredients
- `production_product_names` → Product column in Production
- `package_type_names` → Package Type column in Packaging
- `dispatch_item_names` → Item column in Dispatch

Daily records are filtered by today's date. Names never wipe.

## Standalone Note Sections (admin-managed)

- **Today's Order** (`/todays-order`): `todays_order_notes` table — only Date (auto) + Note (unlimited)
- **Today's Production** (`/todays-production`): `todays_production_notes` table — only Date (auto) + Note (unlimited)
- These two are completely independent of each other and of all other sections.

## Database Tables

All auto-created on first server start:
- `sessions` — auth sessions
- `store_item_names`, `ingredient_names`, `production_product_names`, `package_type_names`, `dispatch_item_names` — persistent names
- `store_items`, `ingredients`, `production_batches`, `packages`, `orders` — daily data (date-filtered)
- `todays_order_notes`, `todays_production_notes` — standalone admin note sections
- `settings` — Google Drive tokens

## Hardcoded Users

| Username    | Password  | Role        |
|-------------|-----------|-------------|
| admin       | admin123  | ADMIN       |
| store_user  | store789  | STORE       |
| ing_user    | ing789    | INGREDIENT  |
| prod_user   | prod789   | PRODUCTION  |
| pkg_user    | pkg789    | PACKAGE     |
| disp_user   | disp789   | DISPATCH    |

## Development on Replit

Two workflows run simultaneously:
- **API Server** — `API_PORT=3000 PORT=3000 node server/index.js`
- **Start application** — `API_PORT=3000 PORT=5173 cd client && npm run dev` (proxies `/api` → port 3000)

## Deploying to Render (Free Tier)

- **Build**: `npm install && npm run build`
- **Start**: `node server/index.js`
- Required env vars: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`
- Optional (Google Drive): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
