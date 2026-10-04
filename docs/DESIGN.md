# Design Notes

## Data model

One table holds all behaviour:

```
events(id BIGSERIAL PK, anonymous_id TEXT, event_type TEXT CHECK (one of 5 types), occurred_at TIMESTAMPTZ)
```

- **No personal data.** A person is only an opaque `anonymous_id`. There is no payload column, so names, emails or payment details cannot be stored.
- **Event types are enforced by the database** (`CHECK`) as well as by request validation.
- **No `users` table.** A "known user" is anyone with at least one event. This keeps the model small; the cost is listed in the trade-off below.
- **Index:** `(anonymous_id, event_type, occurred_at)` serves the per-user counting.
- The seed has 15 users and 43 events around `2026-09-29`: clear matches, clear non-matches, exactly the required count, and events 1 second either side of the window edges.

## Rule evaluation

A rule is a list of conditions combined with AND. I evaluate it in **one SQL query** and let the database count:

```sql
SELECT * FROM (
  SELECT anonymous_id,
    COUNT(*) FILTER (WHERE event_type = $1 AND occurred_at > $2 AND occurred_at <= $3) AS count_0,
    COUNT(*) FILTER (WHERE event_type = $5 AND occurred_at > $6 AND occurred_at <= $7) AS count_1
  FROM events GROUP BY anonymous_id
) AS user_counts
WHERE count_0 >= $4 AND count_1 = $8
```

- The inner query counts every condition per user in one pass. The outer `WHERE` applies the operators (`at_least` is `>=`, `exactly` is `=`), and AND is simply all checks together.
- **"Exactly 0" works** because grouping covers all events, not only matching ones. A user with no purchases still gets a row with count 0.
- **Evidence comes from the same counts** that decided membership, so the two cannot disagree.
- **Rejected:** one query per condition then intersecting in code (more round trips), and counting events in the app.
- **Safety:** all values use `$n` placeholders. The only SQL text I add is `>=` or `=` from a fixed map. Input is validated with zod at the HTTP boundary first, and `withinDays` is capped at 365 because a huge value overflows the date range.

## Time window

`asOf` comes from the request. The server clock is never read, so the same rule and `asOf` always give the same audience.

For `withinDays = N` the window is **after `asOf - N days`, up to and including `asOf`**:

- It is exactly N x 24 hours, with no overlap between windows.
- An event exactly at `asOf` counts: "as of" means everything known up to that moment.
- An event exactly at the start is excluded.
- Events after `asOf` are ignored, so nothing from the future leaks in.
- Each condition has its own window. A day is 24 hours in UTC, so there are no time-zone surprises; the UI sends midnight UTC.

Every edge has a seeded user and a test.

## Backend structure, middleware and logging

Each layer has one job: **dto** (request validation, response shapes), **models** (table schema), **repositories** (SQL only), **services** (windows, evidence), **controllers** (HTTP in and out), **routes** (URLs). A change stays in one place, and layers test separately: service tests use a fake repository, so only the integration tests need a database.

**Middleware** is small: a request logger (method, path, status, duration), CORS for the frontend origin only, and one error handler that returns every failure in the same JSON shape, with a generic message for unexpected errors.

**Logging** (winston, console and files) records requests, audience sizes and errors, but never request bodies or events, so audience definitions and data stay out of the logs.

## Trade-off: scanning all events

Since "known users" means anyone with an event, each preview groups the **whole `events` table**. Cost grows with total events, not audience size. That is fine here, but not for hundreds of millions of events.

At scale I would add a `users` table and keep daily per-user, per-event-type counts in a rollup table, summed over the window. That is far cheaper than scanning raw events, at the price of a pipeline to maintain and counts that can lag behind the raw data.

Related product limit: the API returns every matching member in one response. For large audiences I would return the total and a paginated list.

## Dependencies

**pg** (plain SQL instead of an ORM, so the query stays visible), **zod** (validation), **winston** (logging), **vitest** (tests, dev only), and **react** with **vite** for the frontend. Nothing else of note.
