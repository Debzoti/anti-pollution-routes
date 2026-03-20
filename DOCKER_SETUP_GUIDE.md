# Docker Setup Guide - PostgreSQL + TimescaleDB

## What Was Done

I created a complete Docker setup for your Anti Pollution Routes project with PostgreSQL and TimescaleDB extension. Here's what each file does:

### Files Created/Modified

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main Docker configuration - defines PostgreSQL 16 with TimescaleDB |
| `docker-compose.dev.yml` | Development overrides (optional) |
| `.env` | Your local environment variables (database credentials, API keys) |
| `.env.example` | Template for environment variables (updated with DB config) |
| `.dockerignore` | Files to exclude from Docker builds |
| `init-db/01-timescaledb-extension.sql` | Auto-runs on startup - enables TimescaleDB extension |
| `init-db/02-hypertable-setup.sql` | Auto-runs on startup - creates example tables |
| `DOCKER_SETUP_GUIDE.md` | This guide |

---

## Quick Start - Run These Commands

### Step 1: Start the Database

```bash
docker-compose up -d
```

### Step 2: Check if it's running

```bash
docker-compose ps
```

### Step 3: Connect to verify

```bash
docker exec -it anti-pollution-db psql -U postgres -d anti_pollution
```

Then run:
```sql
SELECT * FROM timescaledb_information;
```

Type `\q` to exit.

---

## Configuration - What You Need to Change

### 1. Database Credentials (Optional)

Edit `.env` file:

```bash
# Change these if you want different credentials
DB_USER=postgres          # ← Change username
DB_PASSWORD=postgres      # ← Change password (RECOMMENDED)
DB_NAME=anti_pollution    # ← Change database name if needed
```

### 2. Add Your API Keys

Edit `.env` file and add your keys:

```bash
OPENAQ_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_key_here
TOMTOM_API_KEY=your_key_here
```

### 3. Update Your Application Code

Your `config.js` already reads from `.env`, so no changes needed there. Just make sure your code uses the `DB_CONNECTION` variable.

Example connection in your code:
```javascript
import pkg from 'pg';
const { Pool } = pkg;
import config from './config.js';

const pool = new Pool({
  connectionString: config.dbConnection,
});
```

---

## Common Commands

| Command | What it does |
|---------|--------------|
| `docker-compose up -d` | Start database in background |
| `docker-compose down` | Stop database |
| `docker-compose logs -f` | View logs (follow mode) |
| `docker-compose ps` | Check status |
| `docker-compose down -v` | Stop + DELETE all data (reset) |

---

## Database Schema - Customize for Your Needs

The file `init-db/02-hypertable-setup.sql` creates an example table for air quality data.

### To Modify the Schema:

1. **If starting fresh** (no data yet):
   ```bash
   docker-compose down -v
   # Edit init-db/02-hypertable-setup.sql
   docker-compose up -d
   ```

2. **If you already have data**:
   ```bash
   docker exec -it anti-pollution-db psql -U postgres -d anti_pollution
   ```
   Then run your ALTER TABLE commands manually.

### Example: Add a New Column

```sql
ALTER TABLE air_quality_measurements 
ADD COLUMN temperature DOUBLE PRECISION;
```

---

## TimescaleDB Features You Can Use

### 1. Compression (saves storage)

Uncomment in `init-db/02-hypertable-setup.sql`:
```sql
ALTER TABLE air_quality_measurements SET (timescaledb.compress = true);
SELECT add_compression_policy('air_quality_measurements', INTERVAL '7 days');
```

### 2. Data Retention (auto-delete old data)

Uncomment in `init-db/02-hypertable-setup.sql`:
```sql
SELECT add_retention_policy('air_quality_measurements', INTERVAL '1 year');
```

### 3. Continuous Aggregates (fast queries)

```sql
CREATE MATERIALIZED VIEW hourly_aq_stats
WITH (timescaledb.continuous) AS
SELECT
    location_id,
    time_bucket('1 hour', time) AS bucket,
    AVG(pm25) AS avg_pm25,
    AVG(aqi) AS avg_aqi
FROM air_quality_measurements
GROUP BY location_id, bucket;
```

---

## Troubleshooting

### Port Already in Use

If port 5432 is already in use:

1. Edit `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # ← Change 5432 to another port
   ```

2. Update `.env`:
   ```bash
   DB_PORT=5433
   DB_CONNECTION=postgresql://postgres:postgres@localhost:5433/anti_pollution
   ```

### Database Won't Start

```bash
# View logs
docker-compose logs db

# Reset completely
docker-compose down -v
docker-compose up -d
```

### Can't Connect from Application

1. Check database is running: `docker-compose ps`
2. Verify connection string in `.env`
3. Check your app is using `config.dbConnection`

---

## Development vs Production

### Development (what you have now)
- Data persists in Docker volume
- Default credentials
- Local connections only

### For Production, consider:
- Use strong passwords
- Use Docker secrets or environment management
- Add backup strategies
- Configure proper network isolation

---

## Summary - What to Do Now

1. **Run**: `docker-compose up -d`
2. **Edit `.env`**: Change `DB_PASSWORD` and add API keys
3. **Customize schema**: Edit `init-db/02-hypertable-setup.sql` for your needs
4. **Update your code**: Use `config.dbConnection` for database connections
5. **Test**: Connect with `docker exec -it anti-pollution-db psql -U postgres -d anti_pollution`
