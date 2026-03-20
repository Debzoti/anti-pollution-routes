-- Example hypertable setup for air quality data
-- This is a template - modify based on your actual schema

CREATE TABLE IF NOT EXISTS air_quality_measurements (
    time TIMESTAMPTZ NOT NULL,
    location_id INTEGER NOT NULL,
    location_name VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    no2 DOUBLE PRECISION,
    o3 DOUBLE PRECISION,
    co DOUBLE PRECISION,
    so2 DOUBLE PRECISION,
    aqi INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('air_quality_measurements', 'time');

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_location ON air_quality_measurements (location_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_aqi ON air_quality_measurements (aqi, time DESC);

-- Add compression policy (optional, for data older than 7 days)
-- ALTER TABLE air_quality_measurements SET (timescaledb.compress = true);
-- SELECT add_compression_policy('air_quality_measurements', INTERVAL '7 days');

-- Add retention policy (optional, automatically drop data older than 1 year)
-- SELECT add_retention_policy('air_quality_measurements', INTERVAL '1 year');
