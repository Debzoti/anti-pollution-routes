-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Verify TimescaleDB is installed
SELECT * FROM timescaledb_information;
