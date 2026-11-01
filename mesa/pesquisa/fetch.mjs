// Baixa ~4000 candles de 1h (≈166 dias) dos ativos USDT mais líquidos da Binance
import fs from 'node:fs';
const BASE = 'https://data-api.binance.vision';
const STABLE = new Set(['USDC','FDUSD','TUSD','BUSD','DAI','USDP','PYUSD','USDE','USD1','BFUSD','XUSD','EUR','EURI','AEUR','TRY','BRL','GBP','AUD','UST','USTC','USDS','RLUSD','PAX','SUSD','WBTC','WBETH','BNSOL']);
const out = process.argv[2];
const j = async u => { const r = await fetch(BASE + u); if (!r.ok) throw new Error(r.status + ' ' + u); return r.json(); };
const tick = await j('/api/v3/ticker/24hr');
const syms = tick.filter(t => t.symbol.endsWith('USDT') && !STABLE.has(t.symbol.slice(0, -4)) && !/(UP|DOWN|BULL|BEAR)USDT$/.test(t.symbol))
  .sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, 70).map(t => t.symbol);
const data = {};
for (const s of syms) {
  let end = Date.now(), rows = [];
  for (let p = 0; p < 4; p++) {
    const k = await j(`/api/v3/klines?symbol=${s}&interval=1h&limit=1000&endTime=${end}`);
    if (!k.length) break;
    rows = k.concat(rows); end = k[0][0] - 1;
    if (k.length < 1000) break;
  }
  const now = Date.now();
  rows = rows.filter(r => r[6] < now).map(r => [r[0], +r[1], +r[2], +r[3], +r[4], +r[5], +r[7]]);
  if (rows.length >= 3500) data[s] = rows;
  process.stdout.write(`${s}:${rows.length} `);
}
fs.writeFileSync(out, JSON.stringify(data));
console.log('\nativos com histórico suficiente:', Object.keys(data).length);
