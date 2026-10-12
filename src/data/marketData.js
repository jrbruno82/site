import { APP_CONFIG } from '../config.js';
import { detectCurrency, extNum, fmtDateBR, parseSheetDate } from '../utils.js';

function friendlyReason(error, what = 'dados') {
  const message = error && error.message ? error.message : '';
  if (message === 'ACESSO_NEGADO') return `a planilha não está pública (acesso negado)`;
  if (message === 'VAZIA') return `a aba "${what}" não tem linhas válidas`;
  if (message === 'QUALIDADE') return `mais de 10% das linhas da aba "${what}" são inválidas`;
  return message || 'erro desconhecido';
}

export async function fetchTickersList() {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=Papeis`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    if (text.toLowerCase().includes('<!doctype html>')) throw new Error('ACESSO_NEGADO');

    const payload = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rows = payload.table?.rows || [];
    const tickers = [];

    rows.forEach((row) => {
      if (!row.c || !row.c[0] || !row.c[0].v) return;
      const code = String(row.c[0].v).trim();
      if (!code || code.toLowerCase() === 'codigo') return;

      const companyName = row.c[2]?.v ? String(row.c[2].v) : code;
      tickers.push({
        code,
        name: companyName,
        currency: row.c[3] ? (row.c[3].v || '').toString().trim().toUpperCase() : undefined,
      });
    });

    if (!tickers.length) throw new Error('VAZIA');
    return tickers;
  } catch (error) {
    console.warn('Using fallback tickers:', error);
    return [
      { code: 'ITUB4', name: 'Itaú Unibanco', currency: 'BRL' },
      { code: 'MELI34', name: 'Mercado Livre', currency: 'USD' },
      { code: 'SOXX', name: 'S&P Semiconductor ETF', currency: 'USD' },
    ];
  }
}

export async function fetchSheetData(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${APP_CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    if (text.toLowerCase().includes('<!doctype html>')) throw new Error('ACESSO_NEGADO');

    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const rows = json.table?.rows || [];
    const parsed = [];
    let dropped = 0;

    rows.forEach((row) => {
      if (!row.c || !row.c[0] || row.c[0].v === null || row.c[0].v === undefined || row.c[0].v === '') return;

      const dt = parseSheetDate(row.c[0]);
      const open = extNum(row.c[1]);
      const high = extNum(row.c[2]);
      const low = extNum(row.c[3]);
      const close = extNum(row.c[4]);

      const coherent = high >= low && high >= Math.max(open, close) * 0.995 && low <= Math.min(open, close) * 1.005;
      const valid = dt && [open, high, low, close].every((value) => Number.isFinite(value) && value > 0) && coherent;

      if (!valid) {
        dropped += 1;
        return;
      }

      const volumeValue = row.c[5] ? String(row.c[5].v || row.c[5].f || '0').replace(/\D/g, '') : '0';
      parsed.push({
        ts: dt.getTime(),
        date: fmtDateBR(dt),
        label: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        open,
        high,
        low,
        close,
        volume: volumeValue,
      });
    });

    if (parsed.length + dropped > 0 && dropped / (parsed.length + dropped) > 0.1) {
      throw new Error('QUALIDADE');
    }

    parsed.sort((a, b) => a.ts - b.ts);
    const clean = [];
    let dups = 0;
    parsed.forEach((item) => {
      const prev = clean[clean.length - 1];
      if (prev && prev.ts === item.ts) {
        clean[clean.length - 1] = item;
        dups += 1;
      } else {
        clean.push(item);
      }
    });

    if (!clean.length) throw new Error('VAZIA');

    const last = clean[clean.length - 1];
    const ageDays = Math.round((Date.now() - new Date(last.ts).getTime()) / 86400000);

    return {
      data: clean,
      meta: {
        source: 'real',
        reason: '',
        count: clean.length,
        lastTs: last.ts,
        lastDate: last.date,
        ageDays,
        stale: ageDays > APP_CONFIG.STALE_DAYS,
        fetchedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      data: [],
      meta: {
        source: 'indisponivel',
        reason: friendlyReason(error, sheetName),
        count: 0,
        stale: false,
        ageDays: 0,
        fetchedAt: new Date(),
      },
    };
  }
}

export async function fetchDynamicData(ticker, availableTickers = []) {
  const currency = detectCurrency(ticker, availableTickers);
  const isBrl = currency === 'BRL';
  const yahooTicker = isBrl ? `${ticker}.SA` : ticker;

  const history = [];
  const news = [];

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1mo&range=1y&events=div`;
    const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
    if (response.ok) {
      const json = await response.json();
      const dividends = json?.chart?.result?.[0]?.events?.dividends || {};

      Object.entries(dividends).forEach(([key, dividend]) => {
        if (!dividend) return;
        const date = new Date(dividend.date * 1000);
        history.push({
          type: 'Provento',
          exDate: fmtDateBR(date),
          payDate: 'Ver corretora',
          value: Number(dividend.amount) || 0,
          source: currency === 'BRL' ? 'Yahoo Finance' : 'Yahoo Finance',
        });
      });
    }
  } catch (error) {
    console.warn('Erro ao buscar proventos:', error);
  }

  try {
    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${yahooTicker}&newsCount=4`;
    const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(searchUrl)}`);
    if (response.ok) {
      const json = await response.json();
      (json.news || []).forEach((item) => {
        news.push({
          title: item.title,
          time: new Date(item.providerPublishTime * 1000).toLocaleDateString('pt-BR'),
          impact: 'Info / Global',
          desc: item.publisher || 'Yahoo Finance',
          link: item.link,
        });
      });
    }
  } catch (error) {
    console.warn('Erro ao buscar notícias:', error);
  }

  return { history, news, currency };
}
