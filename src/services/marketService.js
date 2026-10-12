import { APP_CONFIG } from '../config.js';
import { withCache } from './cache.js';
import { handleServiceError } from './errorHandler.js';

export async function fetchGoogleSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

  return withCache(`sheet:${sheetName}`, async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP_${response.status}`);

      const text = await response.text();
      if (text.toLowerCase().includes('<!doctype html>')) throw new Error('ACESSO_NEGADO');

      const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
      return json;
    } catch (error) {
      handleServiceError('fetchGoogleSheetData', error);
      return { table: { rows: [] } };
    }
  }, 600000);
}

export async function fetchGoogleTickers() {
  return withCache('tickers:list', async () => {
    try {
      const payload = await fetchGoogleSheetData('Papeis');
      const rows = payload.table?.rows || [];
      return rows
        .filter((row) => row.c && row.c[0] && row.c[0].v && String(row.c[0].v).trim() !== 'codigo')
        .map((row) => ({
          code: String(row.c[0].v).trim(),
          name: row.c[2]?.v ? String(row.c[2].v) : String(row.c[0].v).trim(),
          currency: row.c[3]?.v ? String(row.c[3].v).trim().toUpperCase() : 'BRL',
        }));
    } catch (error) {
      handleServiceError('fetchGoogleTickers', error);
      return [
        { code: 'ITUB4', name: 'Itaú Unibanco', currency: 'BRL' },
      ];
    }
  }, 600000);
}
