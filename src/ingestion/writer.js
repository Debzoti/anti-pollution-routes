import pool from '../db/client.js';
import {
  INSERT_AIR_QUALITY,
  INSERT_WEATHER,
  INSERT_TRAFFIC,
} from '../db/queries.js';

/**
 * writer.js — single responsibility: take one normalised row, write it to TimescaleDB.
 * No fetching. No transforming. DB writes only.
 *
 * @param {object} row — normalised row from normaliser.js (must have .type)
 */
export async function writeRow(row) {
  switch (row.type) {
    case 'aqi':
      await pool.query(INSERT_AIR_QUALITY, [
        row.timestamp,
        row.locationId,
        row.locationName,
        row.lat,
        row.lng,
        row.pm25,
        row.pm10,
        row.no2,
        row.o3,
        row.co,
        row.so2,
        row.aqi,
        row.source,
      ]);
      break;

    case 'weather':
      await pool.query(INSERT_WEATHER, [
        row.timestamp,
        row.lat,
        row.lng,
        row.cityName,
        row.tempCelsius,
        row.humidityPct,
        row.windSpeedMs,
        row.windDeg,
        row.weatherMain,
        row.weatherDesc,
        row.visibilityM,
        row.source,
      ]);
      break;

    case 'traffic':
      await pool.query(INSERT_TRAFFIC, [
        row.timestamp,
        row.segmentId,
        row.lat,
        row.lng,
        row.freeFlowSpeed,
        row.currentSpeed,
        row.congestionLevel,
        row.travelTimeSec,
        row.source,
      ]);
      break;

    default:
      throw new Error(`[writer] Unknown row type: ${row.type}`);
  }
}
