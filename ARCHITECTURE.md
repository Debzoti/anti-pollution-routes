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

### Start the Backend
```bash
pnpm install
pnpm run dev        # Auto-restarting development server
```

The background cron jobs will instantly start fetching data for the database, and the Express endpoint `http://localhost:3000/api/score` will unlock.

---

## 8. Golden Rules

1. **All SQL stays in `queries.js`**. Never construct raw SQL strings in the scoring engine.
2. **PostGIS is mandatory**. `segmentSampler.js` strictly relies on `ST_Distance`.
3. **No direct `process.env` calls**. Pass everything strictly through `config.js` to avoid runtime undefined bugs.
4. **Fast failures**. The Express endpoint MUST return instantly. Any heavy lifting or data ingestion is strictly reserved for the background cron workers.
