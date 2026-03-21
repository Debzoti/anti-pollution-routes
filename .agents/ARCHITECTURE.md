# Anti-Pollution Routes — Architecture & Codebase Guide

> **Purpose**: This document explains every file, function, and data flow in the backend.  
> Read this before touching any code.

---

## Table of Contents

1. [Big Picture](#1-big-picture)
2. [Data Flow Diagrams](#2-data-flow-diagrams)
3. [Folder Structure](#3-folder-structure)
4. [File-by-File Breakdown](#4-file-by-file-breakdown)
5. [Database Schema](#5-database-schema)
6. [Environment Variables](#6-environment-variables)
7. [How to Run](#7-how-to-run)
8. [Golden Rules](#8-golden-rules)

---

## 1. Big Picture

This backend has **two core jobs**: 
1. **Data Ingestion**: Pull air quality, weather, and traffic data from 3rd-party APIs every few minutes and store it in a TimescaleDB database augmented with PostGIS.
2. **Pollution Score Engine (PES)**: Fetch physical route polylines from OpenRouteService, sample the segments against the database using spatial queries, mathematically score the pollution exposure, and return ranked results to the client inside 2 seconds.

**Four data sources:**
| API | What we get | Flow Type |
|-----|-------------|-----------|
| [OpenAQ](https://openaq.org) | Pollutant readings (PM2.5, etc) | Background Cron (15m) |
| [OpenWeather](https://openweathermap.org) | Temp, humidity, wind | Background Cron (30m) |
| [TomTom](https://developer.tomtom.com) | Current road speed, congestion | Background Cron (10m) |
| [OpenRouteService](https://openrouteservice.org) | Physical routes & polylines | Real-time (`POST /api/score`) |

---

## 2. Data Flow Diagrams

### Data Ingestion (Background Tasks)
```
┌────────────────────────────────────────────────────────┐
│                   src/jobs/scheduler.js                │
│    ┌─────────┐  ┌──────────┐  ┌───────────┐            │
│    │ AQI 15m │  │Weath 30m │  │ Traff 10m │            │
│    └────┬────┘  └────┬─────┘  └─────┬─────┘            │
└─────────┼────────────┼──────────────┼──────────────────┘
          ▼            ▼              ▼
┌────────────────────────────────────────────────────────┐
│                 src/ingestion/                         │
│   fetchers/   →    normaliser.js      →   writer.js    │
│   (raw JSON)      (standard shape)      (SQL INSERT)   │
└─────────────────────────────────────────────┬──────────┘
                                              ▼
┌────────────────────────────────────────────────────────┐
│                   TimescaleDB + PostGIS                │
│    air_quality | weather_snapshots | traffic_conds     │
└────────────────────────────────────────────────────────┘
```

### Route Scoring Engine (Real-Time API)
```
┌────────────────────────────────────────────────────────┐
│ Client POST /api/score (origin, dest)                  │
└───────────────────┬────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────────────────┐
│          routeFetcher.js (OpenRouteService)            │
│  Fetches 3 parallel polylines for the requested trip   │
└────────┬──────────┬──────────┬─────────────────────────┘
         ▼          ▼          ▼
┌────────────────────────────────────────────────────────┐
│   segmentSampler.js & weightFactors.js (Parallel)      │
│  - Break polyline into point-to-point road segments    │
│  - POSTGIS Queries: Find nearest AQI/Traffic/Weather   │
│    within 500m uploaded in the last 15 minutes.        │
│  - Multiply: Base AQI × Traffic Congestion × Wind      │
└───────────────────┬────────────────────────────────────┘
                    ▼
┌────────────────────────────────────────────────────────┐
│                 pesCalculator.js                       │
│  Sums all segment weights and returns the final score. │
│  Routes are sorted Lowest (Best) to Highest (Worst).   │
└───────────────────┬────────────────────────────────────┘
                    ▼
          [ Ranked JSON Array sent to Client ]
```

---

## 3. Folder Structure

```
anti-pollution-routes/
│
├── init-db/
│   └── 01-schema.sql         # DB schema (Runs once when Docker starts)
│
├── src/
│   ├── db/
│   │   ├── client.js         # pg connection pool (singleton)
│   │   └── queries.js        # all SQL strings and PostGIS queries
│   │
│   ├── ingestion/            
│   │   ├── fetchers/         # OpenAQ, Weather, Traffic calls
│   │   ├── normaliser.js     # raw → standard shape converters
│   │   └── writer.js         # normalised row → DB INSERT
│   │
│   ├── jobs/
│   │   ├── scheduler.js      # cron timers that fire each fetcher
│   │
│   ├── scoring/              # (Step 4) route scoring engine
│   ├── routes/               # (Step 5) Express API endpoints
│   ├── scoring/              # The PES Routing Engine
│   │   ├── pesCalculator.js  # Parent aggregator logic
│   │   ├── routeFetcher.js   # OpenRouteService API connection
│   │   ├── segmentSampler.js # Chops polylines, queries PostGIS
│   │   └── weightFactors.js  # Pure math: wind factors, traffic multipliers
│   │
│   ├── routes/               
│   │   └── score.js          # POST /api/score Express Endpoint
│   │
│   └── notification/         # (Step 6) alert system
│
├── server.js                 # Express app entrypoint
├── test-score.js             # Local CLI script to test scoring logic
├── config.js                 # reads .env, exports typed config
├── docker-compose.yml        # TimescaleDB + PostGIS container
└── .env                      # secrets — never commit this
```

---

## 4. File-by-File Breakdown

### `server.js` & `config.js`
- **`config.js`**: Loads `.env` once at startup. All configs (`config.openRouteServiceApiKey`, `config.dbConnection`) route through here.
- **`server.js`**: Mounts CORS, starts Express, registers `/api` routers, and loops the background `scheduler.js` data fetchers.

### `config.js`

**What it does**: Loads `.env` once at startup and exports a clean config object.  
**Why it exists**: So the rest of the app never calls `process.env` directly — all config goes through here.

```js
config.port; // Express server port (default 3000)
config.openaqApiKey; // OpenAQ API key
config.openWeatherApiKey;
config.tomTomApiKey;
config.dbConnection; // Full postgres connection string
```

> **Rule**: If you add a new env variable, add it here too — never use `process.env.SOMETHING` directly in business logic.

---

### `server.js`

**What it does**: Creates the Express app, registers middleware, starts the HTTP server, and boots the scheduler.

```js
import "./src/jobs/scheduler.js"; // ← this one line starts ALL cron jobs on boot
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
### The Ingestion Loop (`src/ingestion/`)
- **fetchers/**: Independent files that grab raw JSON off OpenAQ, TomTom, and OpenWeather.
- **`normaliser.js`**: Converts raw crazy objects into one unified standard internal structure.
- **`writer.js`**: Takes the unified structure and commits it to TimescaleDB.

### The Scoring Engine (`src/scoring/`)
- **`routeFetcher.js`**: Reaches out to OpenRouteService and parses their GeoJSON response into 3 simple `[lng, lat]` arrays (polylines).
- **`segmentSampler.js`**: Iterates over polyline gaps, calculating math bounds, and hits the Database with highly efficient `ST_Distance` PostGIS spatial queries.
- **`weightFactors.js`**: Extremely fast pure-math functions evaluating physical constraints (Traffic Congestion multipliers, Headwind/Tailwind angle divergence formulas).
- **`pesCalculator.js`**: Groups everything together to emit a single integer score for a route.

### `src/routes/score.js`
- Express endpoint exposing `POST /api/score`. Runs the aforementioned Scoring Engine using Node's `Promise.all` meaning all 3 alternate routes are sliced, parsed, and DB-queried 100% in parallel. Sorts the array ascending and returns it to the client.

### `src/db/queries.js`
- **What it does**: Holds every single SQL string for the entire app.  
- **Why**: Keeps SQL entirely out of business logic files. 
- *Note: Look here to see exactly how the PostGIS `ST_DWithin` functions calculate 500 meter proximities.*

---

## 5. Database Schema

All tables are **TimescaleDB hypertables** with **PostGIS** geo-spatial extensions enabled inside the `anti_pollution` `public` schema.

### `air_quality`

| Column                                   | Type        | Description                                |
| ---------------------------------------- | ----------- | ------------------------------------------ |
| `time`                                   | TIMESTAMPTZ | Measurement timestamp (partition key)      |
| `location_id`                            | TEXT        | OpenAQ location ID                         |
| `location_name`                          | TEXT        | Human-readable name                        |
| `latitude`, `longitude`                  | DOUBLE      | GPS coordinates                            |
| `pm25`, `pm10`, `no2`, `o3`, `co`, `so2` | DOUBLE      | Pollutant readings                         |
| `aqi`                                    | INTEGER     | Composite score (filled by scoring engine) |
| `source`                                 | TEXT        | Always `'openaq'`                          |

### `weather_snapshots`

| Column                         | Type         | Description                   |
| ------------------------------ | ------------ | ----------------------------- |
| `time`                         | TIMESTAMPTZ  | Partition key                 |
| `latitude`, `longitude`        | DOUBLE       | Point queried                 |
| `temp_celsius`, `humidity_pct` | DOUBLE       | Weather values                |
| `wind_speed_ms`, `wind_deg`    | DOUBLE / INT | Wind data                     |
| `weather_main`, `weather_desc` | TEXT         | e.g. `"Rain"`, `"light rain"` |
| `visibility_m`                 | INTEGER      | Visibility in metres          |

### `traffic_conditions`

| Column                             | Type        | Description                  |
| ---------------------------------- | ----------- | ---------------------------- |
| `time`                             | TIMESTAMPTZ | Partition key                |
| `segment_id`                       | TEXT        | Road segment identifier      |
| `free_flow_speed`, `current_speed` | DOUBLE      | km/h                         |
| `congestion_level`                 | DOUBLE      | 0.0 = free, 1.0 = standstill |
| `travel_time_sec`                  | INTEGER     | Estimated travel time        |

### `route_scores` _(filled by Step 4 scoring engine)_

| Column                                        | Type        | Description                    |
| --------------------------------------------- | ----------- | ------------------------------ |
| `time`                                        | TIMESTAMPTZ | When score was computed        |
| `route_id`                                    | TEXT        | Hash of origin→destination     |
| `aqi_score`, `traffic_score`, `weather_score` | DOUBLE      | 0–100 individual scores        |
| `composite_score`                             | DOUBLE      | Weighted final score           |
| `recommended`                                 | BOOLEAN     | Whether this is the best route |
- `air_quality`: PM2.5, PM10, etc., keyed by `time` & PostGIS `latitude/longitude`.
- `weather_snapshots`: Contains wind angles necessary for `weightFactors.js`.
- `traffic_conditions`: Holds live `free_flow_speed` vs `current_speed` for congestion penalty multiplication.

---

## 6. Environment Variables

All variables live in `.env` — **never commit this file**.

```env
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=anti_pollution
DB_HOST=localhost           # Change to 'db' if spinning node inside Docker
DB_PORT=5432
DB_CONNECTION=postgresql://postgres:postgres@localhost:5432/anti_pollution

# API Keys
OPENAQ_API_KEY=...
OPENWEATHER_API_KEY=...
TOMTOM_API_KEY=...
OPENROUTESERVICE_API_KEY=...

# Server
PORT=3000
```

---

## 7. How to Run

### Start DB (TimescaleDB in Docker/Podman)

```bash
podman compose up -d
```
*Wait ~10 seconds. The DB container will automatically enable PostGIS and build the 4 tables.*

<<<<<<< HEAD:.agents/ARCHITECTURE.md
The `init-db/01-schema.sql` script runs **automatically** on first start and creates all 4 tables.

### Start the Node Server

=======
### Start the Backend
>>>>>>> 9db2a5a (redis clienrsetup):ARCHITECTURE.md
```bash
pnpm install
pnpm run dev        # Auto-restarting development server
```

<<<<<<< HEAD:.agents/ARCHITECTURE.md
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
=======
The background cron jobs will instantly start fetching data for the database, and the Express endpoint `http://localhost:3000/api/score` will unlock.
>>>>>>> 9db2a5a (redis clienrsetup):ARCHITECTURE.md

---

## 8. Golden Rules

1. **All SQL stays in `queries.js`**. Never construct raw SQL strings in the scoring engine.
2. **PostGIS is mandatory**. `segmentSampler.js` strictly relies on `ST_Distance`.
3. **No direct `process.env` calls**. Pass everything strictly through `config.js` to avoid runtime undefined bugs.
4. **Fast failures**. The Express endpoint MUST return instantly. Any heavy lifting or data ingestion is strictly reserved for the background cron workers.
