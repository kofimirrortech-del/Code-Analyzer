# DEFFIZZY BAKE ERP

## Overview

A full-featured bakery inventory management ERP system. Deployable on Render free tier.

## New Features (Latest)

- **Summary Report** — `/summary-report` — dashboard cards for every dept (items, stock totals, low-stock alerts) with drill-down links. Visible to all roles.
- **Item Requests system** — non-admin dept users can request items from other departments via a sidebar "Request Item" button. Requests go to admin for approval/rejection; requesting dept is notified.
- **In-app Notifications** — bell icon in sidebar shows unread badge (polls every 30s). Triggered by: low stock, new request, request approved/rejected.
- **Notification Settings (admin)** — within the Requests page admin can toggle which events generate notifications, and which departments are allowed to make requests.
- **Sidebar Reorder (admin)** — "Reorder Sidebar" button lets admin drag nav items up/down; order saved to DB, applied for all users.
- **WhatsApp Share** — WA share buttons on Purchase Orders and Requests tables — formats the record into a WhatsApp-ready message link.

## Stack

- **Backend**: Express.js (Node.js, plain JavaScript, ES modules)
- **Frontend**: React 18 + Vite 5 + Tailwind CSS 4
- **Database**: PostgreSQL (via `pg` library — no ORM)
- **Auth**: Session-based (cookies, stored in `sessions` table, DB-backed users)
- **Routing**: Wouter (hash-based routing in frontend)
- **Data Fetching**: TanStack React Query v5
- **Google Drive**: googleapis for backup feature

## User Management

Users are stored in the `users` table (not hardcoded). Admin can:
- Add/edit/delete users from the **Users** page (`/users`)
- Assign roles: ADMIN, STORE, INGREDIENT, PRODUCTION, BAKERY, PACKAGE, DISPATCH
- Toggle active/inactive status
- Configure per-user custom section permissions (view/edit per section)

Default seeded users (created on first run if `users` table is empty):

| Username     | Password   | Role        |
|--------------|------------|-------------|
| admin        | admin123   | ADMIN       |
| store_user   | store789   | STORE       |
| ing_user     | ing789     | INGREDIENT  |
| prod_user    | prod789    | PRODUCTION  |
| bakery_user  | bakery789  | BAKERY      |
| pkg_user     | pkg789     | PACKAGE     |
| disp_user    | disp789    | DISPATCH    |

Passwords are hashed with `crypto.scryptSync`.

## Permission System

Each user has a `permissions` JSONB field. If null, uses role defaults:

| Role        | Default Access                                          |
|-------------|---------------------------------------------------------|
| ADMIN       | Full access to everything (null = all)                  |
| STORE       | Store (view+edit), Today's Production (view)            |
| INGREDIENT  | Ingredients (view+edit), Today's Production (view)      |
| PRODUCTION  | Production (view+edit), Today's Production (view)       |
| BAKERY      | Bakery (view+edit), Today's Production (view)           |
| PACKAGE     | Packaging (view+edit), Today's Order (view)             |
| DISPATCH    | Dispatch (view+edit), Today's Order (view)              |

Admin can override by setting custom permissions per user (any combination of view/edit per section).

## Supply Chain (Multi-Channel Syncing)

Each department can supply to the next in the chain:

```
Store → Ingredients → Production → Bakery → Packaging → Dispatch
```

When a transfer is recorded:
1. Automatically **deducts** from source department stock
2. Automatically **adds** to destination department stock
3. Logs to `stock_transfers` table
4. **Auto-creates a Purchase Order** if source stock falls below its reorder point

Transfer API: `POST /api/transfers`

## Automated Reordering (Purchase Orders)

- Each item (Store, Ingredients, Bakery, Packaging) has a `low_stock_threshold` / reorder point
- When a transfer causes stock to drop below the threshold, a pending PO is auto-created
- Admin sees pending POs on the Dashboard (with alert banner) and manages them on `/purchase-orders`
- POs can be assigned to any active user, have priority (high/normal/low), status tracking (pending → approved → received → closed)

## Analytics & Reports (`/analytics`)

- Department stock overview (all 6 departments)
- Low stock alerts across all departments (with visual stock bars)
- Recent transfer history (last 100)
- Dispatch revenue trends (last 30 days)

## Departments / Sections

| Section            | Nav Key            | Supply To    |
|--------------------|--------------------|--------------|
| Store              | `store`            | Ingredients  |
| Ingredients        | `ingredients`      | Production   |
| Production         | `production`       | Bakery       |
| Bakery             | `bakery`           | Packaging    |
| Packaging          | `packaging`        | Dispatch     |
| Dispatch           | `dispatch`         | (end)        |
| Today's Order      | `todays-order`     | —            |
| Today's Production | `todays-production`| —            |

## Admin-Only Pages

- Dashboard (`/`) — enhanced with transfer count, pending POs, low stock across all depts
- Analytics (`/analytics`) — comprehensive reports
- Purchase Orders (`/purchase-orders`) — reorder management
- Users (`/users`) — user management with permission matrix
- History (`/history`)
- Settings (`/settings`) — Google Drive backup

## Database Tables

All auto-created on first server start (`initDb()`):

**Auth & Users:**
- `sessions` — auth sessions
- `users` — dynamic users (username, password_hash, role, permissions JSONB, is_active)

**Persistent Names:**
- `store_item_names`, `ingredient_names`, `production_product_names`, `bakery_item_names`, `package_type_names`, `dispatch_item_names`

**Daily Data:**
- `store_items`, `ingredients`, `production_batches`, `bakery_items`, `packages`, `orders`

**Standalone Notes:**
- `todays_order_notes`, `todays_production_notes`

**Supply Chain:**
- `stock_transfers` — full audit log of all inter-dept transfers
- `purchase_orders` — reorder alerts/POs with status, assignment, priority

**Settings:**
- `settings` — Google Drive tokens etc.

## Completed Features (All Departments)

- **`recorded_by` column** — All daily tables track which user created each row (auto-set from session)
- **Auto-calculated closing stock** — Store: opening + addedStock; Packaging: stock + addedStock − supply (no manual entry)
- **Low stock threshold on all departments** — Store, Ingredients, Bakery, Packaging all have reorder points; triggers auto-PO
- **Permission enforcement** — All Add/Edit buttons use `canEdit(user, section)` (not hard-coded isAdmin)
- **Permissions backfill** — Server startup fills null permissions for non-admin users using ROLE_DEFAULTS
- **Production baker auto-fill** — Baker field pre-fills with logged-in username; optional (backend falls back to username anyway)
- **Bakery "Recorded By" column** — Shows which user last updated each bakery item row

## Development on Replit

Two workflows:
- **API Server** — `API_PORT=3000 PORT=3000 node server/index.js`
- **Start application** — `API_PORT=3000 PORT=5173 cd client && npm run dev`

## Deploying to Render (Free Tier)

- **Build**: `npm install && npm run build`
- **Start**: `node server/index.js`
- Required env vars: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Drive backup)
