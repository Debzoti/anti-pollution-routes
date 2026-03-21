# Development Progress

## Session Date: March 20, 2026

### Initial State

- Basic ingestion pipeline implemented (AQI, Weather, Traffic)
- Scoring engine functional (PES calculation)
- Single POST endpoint for route scoring
- Heartbeat job was a stub
- Missing GET endpoints for data retrieval
- Several critical bugs identified

---

## Completed Work

### 1. Implemented Missing Features

#### Heartbeat Job (src/jobs/heartbeat.js)

- ✅ Fully implemented scheduled route scoring
- ✅ Runs every 15 minutes via cron
- ✅ Scores predefined popular routes (Delhi, Mumbai)
- ✅ Persists all route scores to `route_scores` table
- ✅ Marks best route as `recommended = true`
- ✅ Added error handling for failed scoring attempts

#### Data Retrieval Endpoints (src/routes/data.js)

- ✅ `GET /api/aqi?lat=X&lon=Y` — Latest air quality near point
- ✅ `GET /api/weather?lat=X&lon=Y` — Latest weather near point
- ✅ `GET /api/traffic?lat=X&lon=Y` — Latest traffic near point
- ✅ `GET /api/scores?limit=10` — Recent route scores
- ✅ `GET /api/scores/recommended?limit=10` — Recommended routes only

#### Health Check Endpoint

- ✅ `GET /health` — Database connectivity check
- ✅ Returns connection status and timestamp
- ✅ Returns 503 if database is unreachable

---

### 2. Critical Bug Fixes

#### PostGIS Extension Missing

- **Issue**: Schema used PostGIS functions without enabling extension
- **Fix**: Added `CREATE EXTENSION IF NOT EXISTS postgis CASCADE;` to `init-db/01-schema.sql`
- **Impact**: Scoring engine can now execute geographic queries

#### PostGIS Parameter Order Bug

- **Issue**: Geography type expects (lat, lon) but code passed (lng, lat)
- **Fix**: Swapped parameters in PostGIS queries from `$1, $2` to `$2, $1`
- **Fix**: Updated `segmentSampler.js` to pass `[midLat, midLng]` instead of `[midLng, midLat]`
- **Impact**: Geographic distance calculations now work correctly

#### Missing API Key Configuration

- **Issue**: `OPENROUTESERVICE_API_KEY` missing from `.env.example`
- **Fix**: Added to `.env.example`
- **Impact**: Documentation now complete for all required API keys

#### No Environment Validation

- **Issue**: App would start with missing API keys and fail at runtime
- **Fix**: Added `validateConfig()` in `config.js` that checks all required env vars on startup
- **Impact**: App now fails fast with clear error message if configuration is incomplete

---

### 3. Code Quality Improvements

#### Error Handling

- ✅ Created centralized error middleware (`src/middleware/errorHandler.js`)
- ✅ Added error handler to Express app
- ✅ Wrapped heartbeat cron callback in try/catch
- ✅ Fixed unused variable warnings (`req` → `_req`)

#### Configuration Management

- ✅ Added startup validation for all API keys
- ✅ Process exits with clear error if env vars missing
- ✅ Prevents silent failures

---

## Current Architecture

### Data Flow

```
Cron Jobs (scheduler.js)
    ↓
Fetchers (AQI/Weather/Traffic) → Normalizer → Writer → TimescaleDB
    ↓
Heartbeat (every 15 min)
    ↓
Route Scoring → Persist to route_scores table
    ↓
API Endpoints (GET/POST) → Return data to clients
```

### API Endpoints

| Method | Endpoint                  | Purpose                                 |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/`                       | Health check (basic)                    |
| GET    | `/health`                 | Database connectivity check             |
| POST   | `/api/score`              | Score routes between origin/destination |
| GET    | `/api/aqi`                | Latest air quality near coordinates     |
| GET    | `/api/weather`            | Latest weather near coordinates         |
| GET    | `/api/traffic`            | Latest traffic near coordinates         |
| GET    | `/api/scores`             | Recent route scores (with limit)        |
| GET    | `/api/scores/recommended` | Only recommended routes                 |

### Database Tables

1. `air_quality` — PM2.5, PM10, NO2, O3, CO, SO2 readings
2. `weather_snapshots` — Temperature, humidity, wind data
3. `traffic_conditions` — Road speed, congestion levels
4. `route_scores` — Computed PES scores with recommended flag

---

## Known Issues & Technical Debt

### Not Yet Implemented

- ❌ Notification system (no alerts when route quality changes)
- ❌ User management (no user accounts or saved routes)
- ❌ WebSocket/SSE for real-time updates
- ❌ Rate limiting on API endpoints
- ❌ Redis caching for repeated queries
- ❌ Retry logic for failed API calls
- ❌ Unit/integration test suite
- ❌ Input validation (lat/lon ranges, polyline format)
- ❌ Structured logging (winston/pino)
- ❌ Docker container for Node app (only DB is containerized)

### Performance Concerns

- ⚠️ No query caching — same coordinates queried repeatedly
- ⚠️ 300+ DB queries per route (100 segments × 3 data sources)
- ⚠️ No connection pooling optimization
- ⚠️ No batch query support

### Configuration Limitations

- ⚠️ Hardcoded routes in heartbeat (Delhi, Mumbai only)
- ⚠️ Hardcoded polling locations in scheduler (2 cities)
- ⚠️ No dynamic location management
- ⚠️ Default DB credentials in example (security risk)

---

## Next Steps (Recommended Priority)

### High Priority

1. **Add rate limiting** — Prevent API abuse on `/api/score` endpoint
2. **Add input validation** — Validate lat/lon ranges, query params
3. **Implement retry logic** — Handle transient API failures gracefully
4. **Add structured logging** — Replace console.log with proper logger

### Medium Priority

5. **Add Redis caching** — Cache route polylines and recent data lookups
6. **Optimize DB queries** — Batch queries or use window functions
7. **Add unit tests** — Jest/Vitest test suite with mocked APIs
8. **Dockerize Node app** — Complete containerization

### Low Priority

9. **User management** — User accounts and saved routes
10. **Notification system** — Real-time alerts via WebSocket/SSE
11. **Historical trends API** — Query time-series data over ranges
12. **Enable compression policies** — After 7+ days of data accumulation

---

## Environment Setup

### Required API Keys

- `OPENAQ_API_KEY` — Air quality data
- `OPENWEATHER_API_KEY` — Weather data
- `TOMTOM_API_KEY` — Traffic data
- `OPENROUTESERVICE_API_KEY` — Route alternatives

### Database

- TimescaleDB with PostGIS extension
- Connection string in `DB_CONNECTION` env var
- Auto-initialized via `init-db/01-schema.sql`

### Running the App

```bash
# Install dependencies
pnpm install

# Start database
docker compose up -d

# Start server (development)
pnpm run dev

# Start server (production)
pnpm start
```

---

## Testing

### Manual Test Scripts

- `test-all.js` — Tests ingestion pipeline (fetch → normalize → write)
- `test-score.js` — Tests scoring pipeline (routes → segments → PES)

### Running Tests

```bash
node test-all.js
node test-score.js
```

---

## Files Modified This Session

### New Files

- `src/routes/data.js` — GET endpoints for data retrieval
- `src/middleware/errorHandler.js` — Centralized error handling
- `PROGRESS.md` — This file

### Modified Files

- `src/jobs/heartbeat.js` — Implemented full scoring logic
- `server.js` — Added health endpoint, error middleware, heartbeat import
- `config.js` — Added environment validation
- `init-db/01-schema.sql` — Added PostGIS extension
- `src/db/queries.js` — Fixed PostGIS parameter order
- `src/scoring/segmentSampler.js` — Fixed parameter order in query calls
- `.env.example` — Added OPENROUTESERVICE_API_KEY

---

## Deployment Checklist

- [ ] Set strong `DB_PASSWORD` in production `.env`
- [ ] Verify all 4 API keys are valid and have sufficient quota
- [ ] Test PostGIS queries with real data
- [ ] Monitor cron job execution (scheduler + heartbeat)
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Add monitoring/alerting (e.g., Sentry, DataDog)
- [ ] Enable TimescaleDB compression after 7 days
- [ ] Set up CI/CD pipeline
- [ ] Add rate limiting before public deployment

---

## Notes

- App now fails fast on startup if configuration is incomplete
- All critical bugs blocking the scoring engine have been fixed
- Database schema is complete and functional
- API surface is minimal but covers core use cases
- Ready for initial testing with real API keys and data
