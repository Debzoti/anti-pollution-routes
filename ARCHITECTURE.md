# Anti-Pollution Routes — Architecture & Codebase Guide

> **Purpose**: This document explains every file, function, and data flow in the backend.  
> Read this before touching any code.

---

## Table of Contents
1. [Big Picture](#1-big-picture)
2. [Data Flow Diagram](#2-data-flow-diagram)
3. [Folder Structure](#3-folder-structure)
4. [File-by-File Breakdown](#4-file-by-file-breakdown)
5. [Database Schema](#5-database-schema)
6. [Environment Variables](#6-environment-variables)
7. [How to Run](#7-how-to-run)
8. [Golden Rules](#8-golden-rules)

---

## 1. Big Picture

This backend does **one core job**: pull air quality, weather, and traffic data from 3rd-party APIs every few minutes and store it in a TimescaleDB (time-series Postgres) database. Later, a **scoring engine** uses this stored data to recommend the least-polluted route between two points.

**Three data sources:**
| API | What we get | How often |
|-----|-------------|-----------|
| [OpenAQ](https://openaq.org) | PM2.5, PM10, NO2, O3, CO, SO2 readings | Every 15 min |
| [OpenWeather](https://openweathermap.org) | Temperature, humidity, wind, rainfall | Every 30 min |
| [TomTom](https://developer.tomtom.com) | Current road speed, congestion | Every 10 min |

---

## 2. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         server.js                               │
│     starts Express + imports scheduler (fires on boot)          │
└──────────────────────┬──────────────────────────────────────────┘
                       │ on boot, registers cron jobs
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   src/jobs/scheduler.js                         │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│    │ AQI  15 min  │  │Weather 30min │  │ Traffic  10 min  │     │
│    └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘     │
└───────────┼─────────────────┼───────────────────┼───────────────┘
            │                 │                   │
            ▼                 ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                 src/ingestion/fetchers/                         │
│   aqi.js           weather.js           traffic.js             │
│   → calls OpenAQ   → calls OpenWeather  → calls TomTom         │
│   → returns raw    → returns raw        → returns raw JSON      │
│     JSON                JSON                                    │
└────────────────┬────────────────────────┬──────────────────────┘
                 │   raw JSON             │
                 ▼                        ▼
┌───────────────────────────────────────────────────────────────┐
│                 src/ingestion/normaliser.js                    │
│   normaliseAQI()   normaliseWeather()   normaliseTraffic()     │
│   → converts every API's unique shape → one standard shape     │
│     { type, timestamp, lat, lng, ...values, source }           │
└────────────────────────────┬──────────────────────────────────┘
                             │  standard row
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                  src/ingestion/writer.js                       │
│   writeRow(row)                                                │
│   → checks row.type                                            │
│   → picks correct SQL query from src/db/queries.js            │
│   → runs pool.query() via src/db/client.js                     │
└────────────────────────────┬──────────────────────────────────┘
                             │  SQL INSERT
                             ▼
┌───────────────────────────────────────────────────────────────┐
│                      TimescaleDB                               │
│   air_quality | weather_snapshots | traffic_conditions         │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Folder Structure

```
anti-pollution-routes/
│
├── init-db/
│   └── 01-schema.sql         # DB schema — runs once when Docker starts
│
├── src/
│   ├── db/
│   │   ├── client.js         # pg connection pool (singleton)
│   │   └── queries.js        # all SQL strings as named exports
│   │
│   ├── ingestion/
│   │   ├── fetchers/
│   │   │   ├── aqi.js        # OpenAQ API caller
│   │   │   ├── weather.js    # OpenWeather API caller
│   │   │   └── traffic.js    # TomTom API caller
│   │   ├── normaliser.js     # raw → standard shape converters
│   │   └── writer.js         # normalised row → DB INSERT
│   │
│   ├── jobs/
│   │   ├── scheduler.js      # cron timers that fire each fetcher
│   │   └── heartbeat.js      # placeholder — scoring + alerts (Step 4)
│   │
│   ├── scoring/              # (Step 4) route scoring engine
│   ├── routes/               # (Step 5) Express API endpoints  
│   └── notification/         # (Step 6) alert system
│
├── server.js                 # Express app entrypoint
├── config.js                 # reads .env, exports typed config
├── docker-compose.yml        # TimescaleDB container
└── .env                      # secrets — never commit this
```

---

## 4. File-by-File Breakdown

---

### `config.js`
**What it does**: Loads `.env` once at startup and exports a clean config object.  
**Why it exists**: So the rest of the app never calls `process.env` directly — all config goes through here.

```js
config.port            // Express server port (default 3000)
config.openaqApiKey    // OpenAQ API key
config.openWeatherApiKey
config.tomTomApiKey
config.dbConnection    // Full postgres connection string
```

> **Rule**: If you add a new env variable, add it here too — never use `process.env.SOMETHING` directly in business logic.

---

### `server.js`
**What it does**: Creates the Express app, registers middleware, starts the HTTP server, and boots the scheduler.

```js
import './src/jobs/scheduler.js'  // ← this one line starts ALL cron jobs on boot
```

**Endpoints right now**:
- `GET /` — health check, returns `{ status: 'ok' }`

> **Rule**: Add new routes by creating files in `src/routes/` and importing them here — don't put business logic directly in `server.js`.

---

### `src/db/client.js`
**What it does**: Creates **one** `pg.Pool` and exports it.  
**Why singleton**: Opening a new DB connection for every request is expensive. One pool handles up to 10 concurrent connections and reuses them.

```js
import pool from '../db/client.js';     // ✅ correct — reuse the pool
const pool2 = new Pool({ ... });        // ❌ wrong — never do this
```

**Error handling**: Logs unexpected pool errors without crashing the process.

---

### `src/db/queries.js`
**What it does**: Holds every SQL string as a named export.  
**Why**: Keeps SQL out of business logic files. If you need to change a query, there's exactly one place to look.

```js
export const INSERT_AIR_QUALITY = `INSERT INTO air_quality (...) VALUES (...)`;
export const LATEST_AIR_QUALITY_NEAR = `SELECT * FROM air_quality WHERE lat BETWEEN ...`;
// etc.
```

**Parameterised queries**: All queries use `$1, $2, ...` placeholders — this prevents SQL injection.

---

### `src/ingestion/fetchers/aqi.js`
**What it does**: Calls the OpenAQ v3 API and returns the **raw JSON response**.  
**Nothing else** — no DB, no transformation.

```js
export async function fetchAQI()
// Returns: raw response.data from OpenAQ
// Throws:  axios error on network failure (caught in scheduler)
```

**API used**: `GET https://api.openaq.io/v3/locations`  
**Auth**: `X-API-Key` header from `config.openaqApiKey`

---

### `src/ingestion/fetchers/weather.js`
**What it does**: Calls OpenWeather `/weather` for a given lat/lon pair. Returns raw JSON.

```js
export async function fetchWeather(lat, lon)
// Default: New Delhi (28.6139, 77.2090)
// Returns: raw response.data from OpenWeather
```

**API used**: `GET https://api.openweathermap.org/data/2.5/weather`  
**Auth**: `appid` query param from `config.openWeatherApiKey`

---

### `src/ingestion/fetchers/traffic.js`
**What it does**: Calls TomTom's Traffic Flow API for a road segment at a given lat/lon. Returns raw JSON.

```js
export async function fetchTraffic(lat, lon, zoom = 10)
// zoom: TomTom map zoom level (1–22), 10 = city level
// Returns: raw response.data from TomTom
```

**API used**: `GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/{zoom}/json`  
**Auth**: `key` query param from `config.tomTomApiKey`

---

### `src/ingestion/normaliser.js` ⭐ Most important file

**What it does**: Converts raw API responses (which all look different) into a **single, consistent internal shape**.  
This is the **contract** the entire system relies on. If this shape changes, everything downstream breaks.

#### Standard Shapes

**AQI row** (from `normaliseAQI(rawLocationObject)`):
```js
{
  type: 'aqi',
  timestamp: Date,
  locationId: String,
  locationName: String,
  lat: Number,
  lng: Number,
  pm25: Number | null,
  pm10: Number | null,
  no2: Number | null,
  o3: Number | null,
  co: Number | null,
  so2: Number | null,
  aqi: null,            // computed by scoring engine later
  source: 'openaq'
}
```

**Weather row** (from `normaliseWeather(rawApiResponse)`):
```js
{
  type: 'weather',
  timestamp: Date,
  lat: Number, lng: Number,
  cityName: String,
  tempCelsius: Number,
  humidityPct: Number,
  windSpeedMs: Number,
  windDeg: Number,
  weatherMain: 'Rain' | 'Clear' | ...,
  weatherDesc: String,
  visibilityM: Number,
  source: 'openweather'
}
```

**Traffic row** (from `normaliseTraffic(rawApiResponse, lat, lng)`):
```js
{
  type: 'traffic',
  timestamp: Date,
  segmentId: String,
  lat: Number, lng: Number,
  freeFlowSpeed: Number,      // km/h — speed with no traffic
  currentSpeed: Number,       // km/h — actual speed right now
  congestionLevel: Number,    // 0.0 (free) → 1.0 (standstill), computed here
  travelTimeSec: Number,
  source: 'tomtom'
}
```

> **Rule**: Never add DB logic or API calls here. Input = raw JSON. Output = standard shape. Nothing else.

---

### `src/ingestion/writer.js`
**What it does**: Takes one normalised row, picks the right SQL, and inserts it into TimescaleDB.

```js
export async function writeRow(row)
// row.type determines which table it goes into:
//   'aqi'     → INSERT INTO air_quality
//   'weather' → INSERT INTO weather_snapshots
//   'traffic' → INSERT INTO traffic_conditions
```

**Responsibility**: DB writes only. No fetching. No transforming. Single responsibility.

---

### `src/jobs/scheduler.js`
**What it does**: Registers cron jobs that fire each fetcher on a timer. Wires fetchers → normaliser → writer.

```
Every 15 min  →  fetchAQI()       → normaliseAQI()     → writeRow()
Every 30 min  →  fetchWeather()   → normaliseWeather()  → writeRow()
Every 10 min  →  fetchTraffic()   → normaliseTraffic()  → writeRow()
```

**Fail gracefully**: Each fetcher is wrapped in `try/catch`. If OpenAQ is down, only that job logs an error — weather and traffic ingestion keeps running. **The process never crashes.**

Currently polls **two cities**: New Delhi and Mumbai. Add more by extending the `POINTS` array.

---

### `src/jobs/heartbeat.js`
**What it does**: Placeholder for Step 4. Will run every 15 minutes to trigger the scoring engine and send push notifications when air quality at a user's route worsens.

---

## 5. Database Schema

All 4 tables are **TimescaleDB hypertables** — they behave exactly like normal Postgres tables but are automatically partitioned by time for fast time-range queries.

### `air_quality`
| Column | Type | Description |
|--------|------|-------------|
| `time` | TIMESTAMPTZ | Measurement timestamp (partition key) |
| `location_id` | TEXT | OpenAQ location ID |
| `location_name` | TEXT | Human-readable name |
| `latitude`, `longitude` | DOUBLE | GPS coordinates |
| `pm25`, `pm10`, `no2`, `o3`, `co`, `so2` | DOUBLE | Pollutant readings |
| `aqi` | INTEGER | Composite score (filled by scoring engine) |
| `source` | TEXT | Always `'openaq'` |

### `weather_snapshots`
| Column | Type | Description |
|--------|------|-------------|
| `time` | TIMESTAMPTZ | Partition key |
| `latitude`, `longitude` | DOUBLE | Point queried |
| `temp_celsius`, `humidity_pct` | DOUBLE | Weather values |
| `wind_speed_ms`, `wind_deg` | DOUBLE / INT | Wind data |
| `weather_main`, `weather_desc` | TEXT | e.g. `"Rain"`, `"light rain"` |
| `visibility_m` | INTEGER | Visibility in metres |

### `traffic_conditions`
| Column | Type | Description |
|--------|------|-------------|
| `time` | TIMESTAMPTZ | Partition key |
| `segment_id` | TEXT | Road segment identifier |
| `free_flow_speed`, `current_speed` | DOUBLE | km/h |
| `congestion_level` | DOUBLE | 0.0 = free, 1.0 = standstill |
| `travel_time_sec` | INTEGER | Estimated travel time |

### `route_scores` *(filled by Step 4 scoring engine)*
| Column | Type | Description |
|--------|------|-------------|
| `time` | TIMESTAMPTZ | When score was computed |
| `route_id` | TEXT | Hash of origin→destination |
| `aqi_score`, `traffic_score`, `weather_score` | DOUBLE | 0–100 individual scores |
| `composite_score` | DOUBLE | Weighted final score |
| `recommended` | BOOLEAN | Whether this is the best route |

---

## 6. Environment Variables

All variables live in `.env` — **never commit this file**.

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=anti_pollution
DB_HOST=db           # use 'db' inside Docker, 'localhost' if running node outside Docker
DB_PORT=5432
DB_CONNECTION=postgresql://postgres:postgres@db:5432/anti_pollution

# API Keys
OPENAQ_API_KEY=...
OPENWEATHER_API_KEY=...
TOMTOM_API_KEY=...

# Server
PORT=3000
```

> ⚠️ **Important**: If you run `node server.js` directly on your machine (not inside Docker), change `DB_HOST=db` to `DB_HOST=localhost`.

---

## 7. How to Run

### Start DB (TimescaleDB in Docker/Podman)
```bash
# Start Podman socket first
systemctl --user start podman.socket

# Then from project root
podman compose up -d
# or
podman-compose up -d
```

The `init-db/01-schema.sql` script runs **automatically** on first start and creates all 4 tables.

### Start the Node Server
```bash
pnpm run dev        # watches for file changes
# or
pnpm start          # production
```

On startup you'll see:
```
[scheduler] All cron jobs registered — AQI:15min, Weather:30min, Traffic:10min
[server] Listening on port 3000
```

Data starts flowing into TimescaleDB. Check it with:
```bash
podman exec -it anti-pollution-db psql -U postgres -d anti_pollution \
  -c "SELECT time, location_name, pm25 FROM air_quality ORDER BY time DESC LIMIT 5;"
```

---

## 8. Golden Rules

1. **Fetchers return raw JSON only** — no DB, no transformation inside a fetcher.
2. **Normaliser only converts shapes** — no API calls, no DB writes.
3. **Writer only writes to DB** — no fetching, no transforming.
4. **One DB pool** — always import from `src/db/client.js`, never create `new Pool()`.
5. **All SQL in `queries.js`** — no SQL strings inside business logic files.
6. **Always async/await** — no callbacks, no `.then()` chains.
7. **Never crash on API failure** — fetchers throw, scheduler catches and logs. App stays up.
8. **Never commit `.env`** — use `.env.example` as a template for teammates.
