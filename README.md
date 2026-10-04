# Mable Audience Builder

A small tool for defining an **audience** from anonymous customer behaviour and understanding **why** each person belongs to it.

An operator builds a rule such as:

> Users who viewed a product **at least twice** in the previous 7 days, but did **not purchase** in that period.

The app evaluates the rule against synthetic event data and shows the audience size plus, for every matching anonymous user, the evidence behind the match (for example `Product view: 3`, `Purchase: 0`).

It is two independent applications:

| App | What it does | Stack |
|---|---|---|
| [`backend/`](backend) | Stores synthetic events in a database and evaluates audience rules (`POST /v1/audiences/preview`) | Node.js, Express, TypeScript, PostgreSQL |
| [`frontend/`](frontend) | One screen to build a rule and preview the audience. All matching happens in the backend. | React, TypeScript, Vite |

Design decisions (data model, rule evaluation, time window, trade-offs) are in [`docs/DESIGN.md`](docs/DESIGN.md). AI tool usage is in [`docs/AI_USAGE.md`](docs/AI_USAGE.md).

---

## Prerequisites

| Tool | Version | Used for |
|---|---|---|
| [Node.js](https://nodejs.org) | 20.19 or newer (22.12+ also works) | Both apps (npm comes with it) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Any recent version with Compose v2 | Runs PostgreSQL locally |

Make sure Docker Desktop is **running** before you start (the whale icon should say the engine is running).

These ports must be free: **3000** (backend), **5173** (frontend), **5432** (PostgreSQL).

---

## Setup and run

You will use **two terminals**: one for the backend, one for the frontend. Start from the repository root.

### 1. Backend (terminal 1)

```bash
cd backend
cp .env.example .env     # default values work as they are
npm install
npm run db:up            # starts PostgreSQL in Docker and waits until it is ready
npm run db:setup         # creates the events table and loads the synthetic seed data
npm run dev              # starts the API on http://localhost:3000
```

You should see `Database ready: 43 seed events inserted` after `db:setup`, and `Server is running on PORT 3000` after `dev`.

Check it works: open <http://localhost:3000/health>. It returns `{"status":"ok"}`.

### 2. Frontend (terminal 2)

```bash
cd frontend
cp .env.example .env     
npm install
npm run dev              # starts the app on http://localhost:5173
```

Open **<http://localhost:5173>**.

> On Windows PowerShell, `cp` works as an alias for `Copy-Item`. In `cmd.exe` use `copy` instead.

---

## How to preview an audience

The screen opens pre-filled with the example audience, so you can try it straight away.

1. **Audience name**: a label for your own use. It is echoed back in the results.
2. **As of date**: the day "the last N days" is counted back from. It is sent to the API, and the server's clock is never used, so results are reproducible. It defaults to `2026-09-29`, because the seed data is built around that date.
3. **Conditions**: each row says *"the user has done this event, at least or exactly this many times, within the last N days"*.
   - Choose an **event type** (`page_view`, `product_view`, `add_to_cart`, `checkout_started`, `purchase`).
   - Choose an **operator**: `at least` or `exactly`.
   - Set the **event count** and the **number of days**.
   - **Add condition** adds a row and **Remove** deletes one. A user must meet **all** conditions.
4. Click **Preview audience** (or press Enter).
5. The results show the **audience size** and a table of **anonymous users**, each with the number of events found for every condition.

With the default example you get an audience of **6 users**, for example `anon_heavy_viewer` with `Product view: 6` and `Purchase: 0`.

Things to try:

| Change | Expected result |
|---|---|
| Set the product view count to `99` | Empty state: "No users match this audience" |
| Change *As of date* to `2026-10-20` | Empty: no seeded views fall in the 7 days before that date |
| Change the operator of the first row to `exactly`, count `1` | Users with exactly one product view and no purchase (e.g. `anon_one_view`) |
| Clear the audience name and submit | A validation message next to the field |
| Stop the backend and click Preview | "Could not reach the server" with a **Try again** button |

---

## API

The frontend uses these endpoints. You can also call them directly.

### `GET /health`

```bash
curl http://localhost:3000/health
```
```json
{ "status": "ok" }
```

### `POST /v1/audiences/preview`

```bash
curl -X POST http://localhost:3000/v1/audiences/preview \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Viewed but not purchased",
    "asOf": "2026-09-29T00:00:00.000Z",
    "conditions": [
      { "eventType": "product_view", "operator": "at_least", "count": 2, "withinDays": 7 },
      { "eventType": "purchase", "operator": "exactly", "count": 0, "withinDays": 7 }
    ]
  }'
```

<details>
<summary>The same request in PowerShell</summary>

```powershell
$body = @{
  name = "Viewed but not purchased"
  asOf = "2026-09-29T00:00:00.000Z"
  conditions = @(
    @{ eventType = "product_view"; operator = "at_least"; count = 2; withinDays = 7 },
    @{ eventType = "purchase"; operator = "exactly"; count = 0; withinDays = 7 }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post -Uri http://localhost:3000/v1/audiences/preview `
  -ContentType "application/json" -Body $body
```
</details>

Response (shortened):

```json
{
  "name": "Viewed but not purchased",
  "asOf": "2026-09-29T00:00:00.000Z",
  "total": 6,
  "members": [
    {
      "anonymousId": "anon_heavy_viewer",
      "evidence": [
        { "eventType": "product_view", "observedCount": 6 },
        { "eventType": "purchase", "observedCount": 0 }
      ]
    }
  ]
}
```

| Field | Rules |
|---|---|
| `name` | Non-empty text |
| `asOf` | ISO 8601 date-time, e.g. `2026-09-29T00:00:00.000Z` |
| `conditions` | At least one condition, all combined with AND |
| `conditions[].eventType` | `page_view`, `product_view`, `add_to_cart`, `checkout_started`, `purchase` |
| `conditions[].operator` | `at_least` or `exactly` |
| `conditions[].count` | Whole number, 0 or more |
| `conditions[].withinDays` | Whole number from 1 to 365 |

**Errors** always use one JSON shape. A rule that fails validation returns `400`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The audience definition is invalid",
    "details": [
      { "field": "conditions.0.count", "message": "Too small: expected number to be >=0" }
    ]
  }
}
```

Other error codes: `INVALID_JSON` (`400`, the body is not valid JSON) and `INTERNAL_ERROR` (`500`, with a generic message; details go to the server log only).

---

## Tests

Run these in `backend/`. PostgreSQL must be running (`npm run db:up`).

```bash
npm test                  # everything: unit tests, then integration tests
npm run test:unit         # fast, no database needed
npm run test:integration  # runs the real SQL against the seeded database
```

- **Unit tests** (27) use fake data: request validation rules, the service logic (time-window maths, evidence, no use of the server clock), the controller's responses and the error format.
- **Integration tests** (11) run the real query against the seed data and cover both operators, "exactly 0", the time-window boundaries, a different `asOf`, and AND across conditions.

> `npm run test:integration` first runs `db:setup`, which **clears and reloads** the `events` table. It only ever holds the seed data, so nothing is lost.

Frontend checks, in `frontend/`:

```bash
npm run lint              # static checks
npm run build             # type-checks and builds the app
```

---

## Configuration

| File | Variable | Default | Meaning |
|---|---|---|---|
| `backend/.env` | `PORT` | `3000` | Port the API listens on |
| `backend/.env` | `DATABASE_URL` | `postgresql://mable:mable_dev_password@localhost:5432/mable_audience` | PostgreSQL connection (matches `docker-compose.yml`) |
| `backend/.env` | `CORS_ORIGIN` | `http://localhost:5173` | The frontend address the API accepts requests from |
| `frontend/.env` | `VITE_API_BASE_URL` | `http://localhost:3000` | Backend base URL used by the frontend |

The database credentials are for local development only. If you change the backend `PORT`, update `VITE_API_BASE_URL` to match and restart the frontend.

---

## Useful commands

| Command (in `backend/`) | What it does |
|---|---|
| `npm run db:up` | Start PostgreSQL in Docker (waits until healthy) |
| `npm run db:setup` | Create the table and reset it to the seed data |
| `docker compose down` | Stop PostgreSQL (data is kept) |
| `docker compose down -v` | Stop PostgreSQL **and delete its data** (run `db:up` and `db:setup` again afterwards) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run db:up` says it cannot connect to the Docker engine | Start Docker Desktop and wait until it is running, then retry |
| `db:setup` fails with `ECONNREFUSED` | PostgreSQL is not up. Run `npm run db:up` first. Port 5432 may also be in use by another PostgreSQL. |
| Frontend fails with `Port 5173 is already in use` | Another dev server is running. Stop it. The port is fixed because the backend only accepts requests from it. |
| The page says "Could not reach the server" | Start the backend (`npm run dev` in `backend/`) and click **Try again**. Check `VITE_API_BASE_URL`. |
| Browser console shows a CORS error | `CORS_ORIGIN` in `backend/.env` must equal the frontend address exactly. Restart the backend after changing it. |
| Results look different from this README | Run `npm run db:setup` to restore the seed data, and make sure *As of date* is `2026-09-29` |

---

## Repository layout

```
backend/    Express API, PostgreSQL schema + seed, tests
  src/
    dto/            request validation (zod) and response types
    models/         database schema
    repositories/   database access (SQL)
    services/       audience rule logic
    controllers/    HTTP handlers
    routes/         URL mapping
    middleware/     request logging, error handling
    db/             connection, migration, seed data
    tests/          unit/ and integration/
frontend/   React app
  src/
    api/            the single function that calls the backend
    components/     condition row and results table
    types/          data shapes shared across the app
    App.tsx         screen state and wiring
docs/       DESIGN.md, AI_USAGE.md
```
