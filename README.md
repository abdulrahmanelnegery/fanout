# fanout

Real-time event delivery: Laravel to Redis pub/sub to a Node.js WebSocket service to the browser.

[![CI](https://github.com/abdulrahmanelnegery/fanout/actions/workflows/ci.yml/badge.svg)](https://github.com/abdulrahmanelnegery/fanout/actions/workflows/ci.yml)

A small polyglot system that pushes domain events to the browser in real time.

A Laravel API records "reservation events" and hands each one to a queued job.
The job publishes the event onto a Redis pub/sub channel. A Node.js WebSocket
server subscribes to that channel and fans every message out to the browsers
currently connected, after checking a short lived signed token that the browser
first fetched from the API.

```
                POST /events/reservation
  browser  ─────────────────────────────────▶  Laravel API  (api/, PHP 8.4)
     ▲                                              │  dispatch BroadcastReservationEvent
     │                                              ▼
     │                                       queue:work worker
     │                                              │  RPUBLISH
     │                                              ▼
     │                                   Redis channel "reservation-events"
     │                                              │  SUBSCRIBE
     │        WebSocket frame (JSON)                ▼
     └───────────────────────────────────  ws server  (ws/, Node 20 + TypeScript)
       GET /ws-token  ──▶ Laravel API           validates ?token=... on connect,
       (short lived HMAC token)                  closes with 4001 if it is bad
```

Payload on the wire, identical from Redis through to the browser:

```json
{ "id": "1", "type": "created", "resource": "reservations/42", "at": "2026-09-02T12:00:00+00:00", "tenant_id": 1 }
```

## Stack

PHP 8.4 / Laravel 11 / Pest / PHPStan (larastan) / Pint  ·  Node 20 / TypeScript / `ws` / `ioredis` / Vitest / ESLint  ·  Redis pub/sub  ·  MySQL 8  ·  Docker Compose  ·  GitHub Actions

## Run the demo

```bash
docker compose up --build
```

Services that come up: `mysql`, `redis`, `api` (http://localhost:8000), a
`queue-worker`, `ws` (ws://localhost:8080), and `web` (a static page on
http://localhost:3000).

1. Open http://localhost:3000 in **two** browser tabs. Each tab fetches a
   `ws-token` from the API and opens a WebSocket to `ws/`. The status line
   should read `open`.
2. In either tab, click **POST a reservation event** (or run the curl below).
3. Both tabs render the new event at the top of the list within a moment.

```bash
curl -X POST http://localhost:8000/events/reservation \
  -H 'Content-Type: application/json' \
  -d '{"type":"created","resource":"reservations/42","tenant_id":1}'
```

### You must run a queue worker

The API dispatches `BroadcastReservationEvent` onto the **redis** queue instead
of publishing inline, so an event only reaches Redis (and therefore browsers)
once a worker processes the job. `docker compose` runs one for you in the
`queue-worker` service. Running the API outside Docker, start one yourself:

```bash
cd api && php artisan queue:work
```

## Endpoints

| Method | Path                   | Purpose                                                            |
| ------ | ---------------------- | ---------------------------------------------------------------- |
| POST   | `/events/reservation`  | Validate + store an event, dispatch the broadcast job. Returns 201. |
| GET    | `/ws-token`            | Issue a short lived HMAC token (`<exp>.<hmac-sha256(exp)>`, 60s). |

The token is signed with `WS_TOKEN_SECRET`. The `ws` server is given the same
secret and re-implements verification in `ws/src/token.ts`; a missing, expired,
tampered, or wrongly signed token is closed with WebSocket code `4001`.

## Local development

### api/

```bash
cd api
cp .env.example .env && php artisan key:generate
composer install
composer test          # Pest, runs against sqlite :memory:
vendor/bin/pint --test # style
vendor/bin/phpstan analyse --memory-limit=1G  # level 6
```

`.env` defaults to `QUEUE_CONNECTION=redis`; point `REDIS_HOST` at a running
Redis and start `php artisan queue:work` for the end to end path.

### ws/

```bash
cd ws
npm ci
npm run lint
npm run build          # tsc -> dist/
npm test               # Vitest
npm start              # needs WS_TOKEN_SECRET and a reachable Redis
```

Environment: `WS_PORT` (default 8080), `REDIS_URL` (default
`redis://127.0.0.1:6379`), `REDIS_CHANNEL` (default `reservation-events`),
`WS_TOKEN_SECRET` (required, must match the API).

## Tests

- **api/** `BroadcastReservationEventTest` asserts the job publishes the exact
  JSON payload to the `reservation-events` channel
  (`Redis::shouldReceive('publish')->once()->with(...)`).
  `StoreReservationEventTest` asserts the POST stores the record and dispatches
  the job (`Queue::fake()`) with the right payload, and that validation rejects
  bad input. `WsTokenTest` covers issue/verify, expiry, wrong secret, tampering,
  and malformed tokens.
- **ws/** `bridge.test.ts` fakes an `ioredis` `message` event and asserts every
  connected mock socket's `.send` was called with the payload, that a bad or
  missing token is closed with `4001` and never receives a message, and that
  closed / non-open sockets are skipped. `token.test.ts` mirrors the PHP token
  cases.

## Layout

```
.
├── api/              Laravel 11 API + queued Redis publisher
├── ws/               Node 20 / TypeScript WebSocket fan-out server
├── web/              static demo page (index.html + inline module)
├── docker-compose.yml
└── .github/workflows/ci.yml
```
