# Docker Setup for Anti Pollution Routes

## Quick Start

### Start the Database

```bash
# Start PostgreSQL with TimescaleDB
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the database
docker-compose down
```

### Development Mode

```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `anti_pollution` | Database name |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |

### Connection String

```
postgresql://postgres:postgres@localhost:5432/anti_pollution
```

## Database Initialization

The `init-db/` directory contains SQL scripts that run automatically on first startup:

1. **01-timescaledb-extension.sql** - Enables TimescaleDB extension
2. **02-hypertable-setup.sql** - Creates example hypertable for air quality data

## Useful Commands

```bash
# Connect to the database
docker exec -it anti-pollution-db psql -U postgres -d anti_pollution

# Reset the database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d

# Check database health
docker-compose ps

# View database logs
docker-compose logs db
```

## TimescaleDB Features

The setup includes:
- **Hypertables** for time-series data
- **Compression** support (commented out by default)
- **Retention policies** support (commented out by default)
- **Continuous aggregates** support

See `init-db/02-hypertable-setup.sql` for example schema and configurations.
