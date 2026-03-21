-- ============================================================
-- Anti-Pollution Routes — TimescaleDB Schema
-- ============================================================

-- Enable TimescaleDB and PostGIS
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis CASCADE;

-- ============================================================
-- 1. AQI / Air Quality measurements (from OpenAQ)
-- ============================================================
CREATE TABLE IF NOT EXISTS air_quality (
    time            TIMESTAMPTZ     NOT NULL,
    location_id     TEXT            NOT NULL,
    location_name   TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    pm25            DOUBLE PRECISION,
    pm10            DOUBLE PRECISION,
    no2             DOUBLE PRECISION,
    o3              DOUBLE PRECISION,
    co              DOUBLE PRECISION,
    so2             DOUBLE PRECISION,
    aqi             INTEGER,
    source          TEXT            DEFAULT 'openaq'
);

SELECT create_hypertable('air_quality', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_aq_location_time
    ON air_quality (location_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_aq_coords
    ON air_quality (latitude, longitude, time DESC);

-- ============================================================
-- 2. Weather snapshots (from OpenWeather)
-- ============================================================
CREATE TABLE IF NOT EXISTS weather_snapshots (
    time            TIMESTAMPTZ     NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    city_name       TEXT,
    temp_celsius    DOUBLE PRECISION,
    humidity_pct    DOUBLE PRECISION,
    wind_speed_ms   DOUBLE PRECISION,
    wind_deg        INTEGER,
    weather_main    TEXT,           -- e.g. "Rain", "Clear"
    weather_desc    TEXT,           -- e.g. "light rain"
    visibility_m    INTEGER,
    source          TEXT            DEFAULT 'openweather'
);

SELECT create_hypertable('weather_snapshots', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_weather_coords_time
    ON weather_snapshots (latitude, longitude, time DESC);

-- ============================================================
-- 3. Traffic conditions (from TomTom)
-- ============================================================
CREATE TABLE IF NOT EXISTS traffic_conditions (
    time                TIMESTAMPTZ     NOT NULL,
    segment_id          TEXT            NOT NULL,   -- route or road segment id
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    free_flow_speed     DOUBLE PRECISION,           -- km/h
    current_speed       DOUBLE PRECISION,           -- km/h
    congestion_level    DOUBLE PRECISION,           -- 0.0 (free) → 1.0 (standstill)
    travel_time_sec     INTEGER,
    source              TEXT            DEFAULT 'tomtom'
);

SELECT create_hypertable('traffic_conditions', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_traffic_segment_time
    ON traffic_conditions (segment_id, time DESC);

-- ============================================================
-- 4. Route scores — computed by the scoring engine (Step 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS route_scores (
    time            TIMESTAMPTZ     NOT NULL,
    route_id        TEXT            NOT NULL,
    origin_lat      DOUBLE PRECISION,
    origin_lng      DOUBLE PRECISION,
    dest_lat        DOUBLE PRECISION,
    dest_lng        DOUBLE PRECISION,
    aqi_score       DOUBLE PRECISION,       -- 0–100, lower is better
    traffic_score   DOUBLE PRECISION,       -- 0–100, lower is better
    weather_score   DOUBLE PRECISION,       -- 0–100, lower is better
    composite_score DOUBLE PRECISION,       -- weighted final score
    recommended     BOOLEAN         DEFAULT FALSE
);

SELECT create_hypertable('route_scores', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_route_scores_route_time
    ON route_scores (route_id, time DESC);

-- ============================================================
-- Compression policies (uncomment when you have 7+ days of data)
-- ============================================================
-- ALTER TABLE air_quality SET (timescaledb.compress, timescaledb.compress_segmentby = 'location_id');
-- SELECT add_compression_policy('air_quality', INTERVAL '7 days');

-- ALTER TABLE weather_snapshots SET (timescaledb.compress, timescaledb.compress_segmentby = 'city_name');
-- SELECT add_compression_policy('weather_snapshots', INTERVAL '7 days');

-- ALTER TABLE traffic_conditions SET (timescaledb.compress, timescaledb.compress_segmentby = 'segment_id');
-- SELECT add_compression_policy('traffic_conditions', INTERVAL '7 days');
