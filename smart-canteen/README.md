# Smart Canteen — College Canteen Ordering & Queue Management System

Eliminates canteen queues by letting students/staff order ahead, and
spreads pickups across time slots automatically so everyone doesn't show
up at the same 5 minutes.

## What's actually built (full feature set as of this update)

**Core (MVP):**
- Auth: register/login with roles — student, staff, canteen_staff, admin (JWT)
- Menu: browse by category — seeded with ~35 real Indian-canteen items
- **Smart pickup slots**: every order auto-assigned to the earliest slot that
  isn't full; spills into the next slot once full — this is what actually
  kills the queue
- Live "Pickup Board": open/filling/full status per upcoming slot
- Order tracking: token number + live status (pending → accepted →
  preparing → ready → collected)
- Stock tracking with auto sold-out
- Kitchen view for staff; admin dashboard (revenue, orders, top items, low
  stock)

**Added in this round:**
- **Favorites** — star any item, filter menu to favorites only
- **Reorder** — one tap on a past order re-adds all its items to the cart
- **Estimated wait time** — queue-position + prep-time heuristic shown on
  the tracking screen
- **QR pickup** — each order gets a QR code (shown on the tracking page)
  encoding the order/token; staff can look an order up by token (manual
  entry — see note below on camera scanning)
- **Coupons** — apply a discount code at checkout (`WELCOME10`,
  `BIGLUNCH20` seeded); admin can create more via the API
- **Feedback/ratings** — students rate food + service after an order is
  collected; admin dashboard shows the aggregate and recent comments
- **Crowd prediction** — shows expected busy hours based on past orders on
  the same weekday
- **Demand forecast** — admin dashboard shows suggested prep quantities for
  tomorrow based on the last 30 days of sales
- **Voice ordering** — a mic button (Menu page) uses the browser's built-in
  speech recognition to add an item by saying its name
- **Offline mode** — a service worker caches the app shell so it still
  loads with no connection; if you place an order while offline, it's
  queued in the browser and automatically synced once you're back online
- **Push notifications** — real browser notifications (not a toast) fire
  when your order's status changes, using the Notification API
- **Payment** — a "Pay via UPI" option at checkout that simulates a
  successful payment

### Being upfront about scope on a few of these

I built these to genuinely work, but a few are intentionally simpler than
the "advanced" version described in planning docs — worth knowing for your
viva/demo so you can describe them accurately instead of over-claiming:

- **"AI" crowd prediction & demand forecast** are historical-average
  heuristics over real order data (SQL aggregation), not trained ML models.
  They're honest, useful, and defensible as "data-driven" — just don't call
  them machine learning models unless you actually train one on top of this
  data (which the tables here would support later).
- **QR pickup** generates a real QR code, but staff "scanning" is currently
  manual token entry (or scanning with any generic QR app, which decodes to
  JSON they then type in). Wiring up in-browser camera scanning is a
  reasonable next step — add the `html5-qrcode` npm package on the frontend
  and pass its decoded text straight into the existing token lookup call.
- **UPI payment** is simulated (marks the order paid, no money moves). A
  real integration needs a payment gateway (Razorpay/PayU/Cashfree) and
  your college's merchant account — the `payment_method`/`payment_status`
  fields on the Order model are already there for you to wire a real
  gateway's webhook into.
- **Offline mode** lets the app shell load and queues orders placed while
  offline for later sync. It does not let you browse a live, current menu
  with no network — that data has to come from the server.
- **Voice ordering** uses the browser's native speech recognition. Works
  well on Chrome/Edge (desktop and Android); not supported on Firefox or
  iOS Safari — the mic button simply won't appear there.

### Round 2 additions

- **USN-based login** — students/staff log in with USN/staff ID instead of
  email; registration also collects a phone number (used only for password
  recovery, never as the password itself)
- **Forgot password** — verify USN + registered phone, then set a new
  password. This is an identity check, not an OTP send — no SMS service
  involved, worth describing accurately in your viva.
- **College Wallet** — a real, working internal payment method: top up
  (demo credit) and pay from the balance at checkout, with proper
  insufficient-balance handling. Unlike UPI, the balance actually moves —
  this one isn't a simulation.
- **Menu search, veg/non-veg filter, price range filter, sort by popularity**
- **Ingredients / calories / allergens** on menu items (optional fields,
  shown as an expandable "Ingredients & nutrition" link)
- **Special instructions** per cart item (e.g. "less spicy"), visible to
  kitchen staff next to the item
- **Admin Menu Management screen** — add/edit/delete/enable/disable food
  items from the UI (previously this only worked via direct API calls)
- **Delayed-order flagging + elapsed timer** in the kitchen view — orders
  sitting longer than their expected prep time are visually flagged

### Round 3 additions (latest)

- **USN-based login**, forgot password, College Wallet — covered above
- **Reward points & referrals** — earn points automatically when an order is
  collected (not on placement, so cancelling can't farm points); redeem
  points for wallet credit (10 pts = ₹1); every user gets a shareable
  referral code, worth 50 bonus points to both people on signup
- **Scheduled orders** — pick a future pickup date/time instead of always
  getting the next available slot (same slot-capacity mechanism, just a
  later starting point)
- **Manual/walk-in order entry** — staff can place an order for a customer
  with no account, from Kitchen → Manual Order Entry
- **Refunds on cancellation** — cancelling a wallet-paid order automatically
  credits the wallet back and restocks the items; cash/UPI-demo orders are
  flagged `refunded` (no real money moved to reverse)
- **Counter number assignment** — staff assign a counter when marking an
  order ready; students see it on their tracking page
- **Missed-pickup detection** — kitchen view flags orders sitting in "ready"
  for 15+ minutes uncollected
- **Admin: All Orders** (full history with status/date filters), **Reports**
  (date-range revenue with a daily bar chart, least-ordered items), **Staff
  Management** (add/remove canteen_staff and admin accounts — no
  shift/attendance tracking, out of scope for an ordering system)
- **PDF invoice download** on the order tracking page
- **Suggest new food / report an issue** — students submit from the nav,
  staff/admin review and resolve from Admin → Suggestions & Issues
- **FAQ / Help page**

### Round 4 additions (latest — role-portal pass)

- **Demo credentials simplified**: `student`/`student123`, `staff01`/`staff123`,
  `admin01`/`admin123` — the underlying login is still USN-based (so real
  registrations work the same way), these are just easy-to-type seed values
- **Profile editing** (name/phone/email) + **change password** while logged in
- **Coupon management**: edit and delete, not just create
- **Canteen settings**: admin-configurable business hours, tax %, and a
  pickup-slot-capacity override — tax is actually applied to order totals,
  not just stored
- **Announcements**: admin broadcasts a message, shown as a banner on the
  student menu page
- **Feedback replies**: admin/staff can respond to a student's review
- **Reject order**: a distinct kitchen action from cancel, for orders staff
  decline before accepting (e.g. can't fulfill in time)

### Round 5 addition (latest — real-time layer)

- **WebSocket real-time updates** (Socket.io), replacing polling as the
  primary update mechanism:
  - Kitchen dashboard gets a **live "new order" push** the instant a student
    orders — no waiting for the next poll
  - Students see their **own order's status change instantly** when kitchen
    staff update it (accepted → preparing → ready → collected)
  - The **public pickup board updates live** whenever a slot fills up or
    frees up (order placed / cancelled / rejected)
  - A green/red dot on the Kitchen Queue page shows live connection status
  - Slow polling (30s) is kept everywhere only as a safety-net fallback in
    case a socket event is missed (e.g. a brief disconnect) — it's no
    longer how the app stays in sync
  - Sockets authenticate with the same JWT as the REST API (sent in the
    connection handshake), so a socket is tied to the same identity/role as
    the user's normal session — no separate real-time login step
  - This was verified with an actual Socket.io test client hitting the live
    server (place order → kitchen gets `order:new` → staff accepts →
    student gets `order:status` instantly), not just written and assumed
    to work

### Round 6 addition (latest — strict role-based portals)

The single admin role was split into four, with a real 4th role added to
the database (`student`/`staff`, `canteen_staff`, `manager`, `admin`) and
enforced end-to-end, not just hidden in the UI:

- **Separate portals with their own layout and sidebar navigation**, at
  their own URL prefix: `/student/*`, `/kitchen/*`, `/manager/*`,
  `/admin/*`. Login/registration redirect each role straight to their own
  portal.
- **A real 403 Access Denied page** — a student hitting `/admin/dashboard`
  (or any wrong-portal URL) sees an actual "Access Denied" screen, not a
  silent redirect.
- **Permission boundaries enforced on the backend**, verified against a
  live server for every pairing below (not just written and assumed):
  - Kitchen staff can update order status and toggle an item's
    availability/stock — and *nothing else*; trying to change a price or
    description as kitchen staff is rejected with a 403 naming the exact
    disallowed fields
  - Kitchen staff cannot see revenue or any financial dashboard — they get
    a separate, genuinely lighter `/kitchen/dashboard` showing only order
    counts (pending/preparing/ready/collected), no money figures anywhere
  - Manager can manage the menu, coupons, feedback, reports, canteen
    settings, and hire Kitchen Staff — but **cannot** create another
    Manager or Admin account (403) — only an Admin can do that
  - Admin has every permission Manager has, plus user management across
    all roles
- Admin's sidebar links directly into Manager's pages for shared
  operations (menu, orders, reports, etc.) rather than duplicating those
  screens under `/admin/*` — same route, same permission check already
  allows both roles in, so there's one page to maintain instead of two
- **Fixed a real login bug found while building this**: the seeded demo
  usernames were lowercase but the login form was force-uppercasing input
  before sending it, which would have silently broken the demo credentials
  through the UI (curl testing against the API directly hadn't caught it).
  Login/register/forgot-password/staff-creation are now case-insensitive
  on the backend, and the frontend no longer forces a case transform.

## Stack

- **Frontend**: React + Vite + Tailwind, React Router, Axios, Socket.io-client
- **Backend**: Node.js + Express + Sequelize + Socket.io
- **Database**: PostgreSQL
- **Auth**: JWT
- **Containerization**: Docker + docker-compose

## Quick start (Docker — easiest)

```bash
docker compose up --build
```

- Frontend: http://localhost:4173
- Backend API: http://localhost:5000/api
- Postgres: localhost:5432

The backend automatically connects and syncs its tables on startup, but you
still need to **seed demo data** once (menu items + demo accounts):

```bash
docker compose exec backend npm run seed
```

Demo logins (USN/staff ID is the username, not email — case-insensitive):
- `student` / `Student@123` — Student portal (`/student/*`), ₹200 wallet balance seeded
- `kitchen01` / `Kitchen@123` — Kitchen portal (`/kitchen/*`)
- `manager01` / `Manager@123` — Manager portal (`/manager/*`)
- `admin01` / `Admin@123` — Admin portal (`/admin/*`, plus everything Manager can access)

Demo coupon codes: `WELCOME10` (10% off, no minimum), `BIGLUNCH20` (20% off,
min order ₹100).

## Running without Docker (local dev)

### 1. Database
Install PostgreSQL locally and create a database + user matching
`backend/.env.example`, or just run:
```bash
docker run --name canteen_db -e POSTGRES_DB=smart_canteen \
  -e POSTGRES_USER=canteen_user -e POSTGRES_PASSWORD=canteen_pass \
  -p 5432:5432 -d postgres:16-alpine
```

### 2. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run seed     # creates tables + seeds menu + demo users
npm run dev       # starts on http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # starts on http://localhost:5173
```

## Project structure

```
smart-canteen/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # Sequelize/Postgres connection
│   │   ├── models/                # User, Category, MenuItem, Order, OrderItem, PickupSlot
│   │   ├── controllers/           # auth, menu, order, admin
│   │   ├── routes/                # express routers
│   │   ├── middleware/auth.js     # JWT auth + role guard
│   │   ├── utils/pickupSlotService.js  # ★ the core slot-assignment logic
│   │   ├── seed/                  # menu_dataset.json + seed.js
│   │   ├── app.js
│   │   └── server.js
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Login, Register, Menu, Cart, MyOrders,
│   │   │                            OrderTracking, KitchenView, AdminDashboard
│   │   ├── components/            # NavBar, QueueStatus (pickup board)
│   │   ├── context/                # AuthContext, CartContext
│   │   └── api/client.js
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

## For your guide / demo talking points

1. **The problem**: 500–3000 students hitting the same canteen in the same
   30-minute lunch window causes queues and food running out before
   everyone's served.
2. **The insight**: online ordering alone doesn't fix this — if everyone still
   picks the same pickup time, you just move the queue from the counter to
   the pickup point. The fix is **spreading demand across time**.
3. **The mechanism**: `pickupSlotService.js` treats time as a resource with
   capacity, same idea as flight/train seat allocation — assign to the
   earliest slot with room, cascade forward when full.
4. **What's demoable today**: full order flow — browse → cart → order →
   token → live status → kitchen updates it → student sees it update live —
   plus an admin dashboard with real numbers.
5. **Where this goes next**: this same architecture (slots + roles + stock)
   generalizes to hostel messes, hospital cafeterias, and company canteens —
   good talking point for "future scope" in your report.
