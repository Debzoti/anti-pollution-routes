import { fetchAQI } from './src/ingestion/fetchers/aqi.js';
import { normaliseAQI } from './src/ingestion/normaliser.js';
import { fetchWeather } from './src/ingestion/fetchers/weather.js';
import { normaliseWeather } from './src/ingestion/normaliser.js';
import { fetchTraffic } from './src/ingestion/fetchers/traffic.js';
import { normaliseTraffic } from './src/ingestion/normaliser.js';
import { writeRow } from './src/ingestion/writer.js';
import pool from './src/db/client.js';

const POINTS = [
  { lat: 28.6139, lon: 77.2090, label: 'New Delhi' },
];

async function test() {
  console.log('--- Testing Weather ---');
  try {
    const w = await fetchWeather(POINTS[0].lat, POINTS[0].lon);
    if (w) { await writeRow(normaliseWeather(w)); console.log('Weather: SUCCESS (Inserted 1 row)'); }
  } catch(e) { console.log('Weather: ERR', e.message); }

  console.log('--- Testing Traffic ---');
  try {
    const t = await fetchTraffic(POINTS[0].lat, POINTS[0].lon);
    if (t) { await writeRow(normaliseTraffic(t, POINTS[0].lat, POINTS[0].lon)); console.log('Traffic: SUCCESS (Inserted 1 row)'); }
  } catch(e) { console.log('Traffic: ERR', e.message); }

  console.log('--- Testing AQI ---');
  try {
    const a = await fetchAQI();
    if (a?.results?.length > 0) {
      await writeRow(normaliseAQI(a.results[0]));
      console.log('AQI: SUCCESS (Inserted 1 row)');
    } else {
      console.log('AQI: SUCCESS (No results to insert)');
    }
  } catch(e) { console.log('AQI: ERR', e.message); }
  
  pool.end();
}
test();
