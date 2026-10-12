import { APP_CONFIG } from '../config.js';
import { detectCurrency, formatCurrency } from '../utils.js';

function calculateEMA(data, period) {
  if (!data || data.length < period) return Array(data?.length || 0).fill(null);
  const ema = Array(data.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += data[i];
  let current = sum / period;
  ema[period - 1] = current;

  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i += 1) {
    current = (data[i] - current) * multiplier + current;
    ema[i] = current;
  }

  return ema;
}

function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return Array(data.length).fill(null);

  const values = Array(data.length).fill(null);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const delta = data[i] - data[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  values[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < data.length; i += 1) {
    const delta = data[i] - data[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    values[i] = 100 - 100 / (1 + rs);
  }

  return values;
}

function calculateATR(data, period = 14) {
  if (!data || data.length < period + 1) return 0;
  const trs = [];

  for (let i = 1; i < data.length; i += 1) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }

  const recent = trs.slice(-period);
  return recent.reduce((sum, value) => sum + value, 0) / recent.length;
}

function analyzeVolume(data) {
  const n = data.length;
  const volumes = data.map((item) => Number(item.volume) || 0);
  const lastVol = volumes[n - 1];
  const base = volumes.slice(Math.max(0, n - 1 - 20), n - 1).filter((value) => value > 0);

  if (!Number.isFinite(lastVol) || lastVol <= 0 || base.length < 5) {
    return { ratio: 1, text: 'Sem dados de volume', color: 'text-gray-400' };
  }

  const avg = base.reduce((sum, value) => sum + value, 0) / base.length;
  const ratio = lastVol / avg;

  let text = 'Estável';
  let color = 'text-gray-300';
  if (ratio > 1.3) {
    text = 'Acima da média';
    color = 'text-green-400';
  } else if (ratio < 0.7) {
    text = 'Abaixo da média';
    color = 'text-red-400';
  }

  return { ratio, text, color };
}

export function analyze2to7DaysStrategy(ticker, data, currency = 'BRL') {
  if (!data || data.length < APP_CONFIG.MIN_CANDLES) return null;

  const last = data[data.length - 1];
  const closes = data.map((item) => item.close);
  const ema9 = calculateEMA(closes, 9)[closes.length - 1];
  const ema21 = calculateEMA(closes, 21)[closes.length - 1];
  const rsi = calculateRSI(closes, 14)[closes.length - 1] || 50;
  const atr = calculateATR(data, 14) || last.close * 0.02;
  const recentWindow = data.slice(-15);
  const sup15 = Math.min(...recentWindow.map((item) => item.low));
  const res15 = Math.max(...recentWindow.map((item) => item.high));
  const vol = analyzeVolume(data);

  let direction = 'NEUTRAL';
  let setupName = 'Aguardar confirmação';
  let targetPrice = last.close;
  let stopLossPrice = last.close;
  let timeDays = '3 a 5 dias';
  let actionText = 'Observar';

  if (last.close >= res15 * 0.995 && vol.ratio >= 1.2 && rsi < 72) {
    direction = 'BUY';
    setupName = 'Rompimento de pivô + volume';
    targetPrice = last.close + atr * 2.5;
    stopLossPrice = Math.max(last.close - atr * 1.2, sup15);
    timeDays = '2 a 4 dias';
    actionText = 'Comprar no rompimento ou retração';
  } else if (last.close > ema9 && ema9 > ema21 && rsi >= 45 && rsi <= 68) {
    direction = 'BUY';
    setupName = 'Seguidor de tendência';
    targetPrice = last.close + atr * 2.0;
    stopLossPrice = Math.min(ema21, last.close - atr * 1.1);
    timeDays = '3 a 7 dias';
    actionText = 'Comprar buscando expansão';
  } else if (rsi <= 32 && last.close <= sup15 * 1.01) {
    direction = 'BUY';
    setupName = 'Repique sobrevendido';
    targetPrice = last.close + atr * 2.2;
    stopLossPrice = last.close - atr * 1.0;
    timeDays = '2 a 5 dias';
    actionText = 'Comprar no suporte';
  } else if (rsi >= 75 || (last.close < ema9 && ema9 < ema21)) {
    direction = 'SELL';
    setupName = 'Correção técnica / short';
    targetPrice = Math.max(last.close - atr * 2.2, sup15 * 0.95);
    stopLossPrice = last.close + atr * 1.1;
    timeDays = '2 a 5 dias';
    actionText = 'Vender ou reduzir posição';
  }

  if (direction === 'NEUTRAL') return null;

  const potentialGain = Math.abs(targetPrice - last.close);
  const risk = Math.abs(last.close - stopLossPrice);
  if (risk <= 0) return null;

  const expectedReturnPct = (potentialGain / last.close) * (direction === 'BUY' ? 1 : -1);
  const riskRewardRatio = potentialGain / risk;

  return {
    ticker,
    currency,
    direction,
    setupName,
    currentPrice: last.close,
    stopLoss: stopLossPrice,
    target: targetPrice,
    expectedReturnPct,
    riskRewardRatio,
    timeDays,
    actionText,
    volumeText: vol.text,
  };
}

export async function buildStrategyRows(tickers, fetchSheetData) {
  const rows = [];

  for (const item of tickers) {
    const { data } = await fetchSheetData(item.code);
    const currency = detectCurrency(item.code, tickers);
    const strategy = analyze2to7DaysStrategy(item.code, data, currency);
    if (strategy) rows.push(strategy);
  }

  return rows;
}

export function strategyTableHtml(rows) {
  if (!rows || !rows.length) {
    return `
      <tr>
        <td colspan="9" class="p-6 text-center text-gray-500">Nenhuma estratégia atendendo aos critérios no momento.</td>
      </tr>
    `;
  }

  return rows
    .sort((a, b) => Math.abs(b.expectedReturnPct) - Math.abs(a.expectedReturnPct))
    .map((strategy) => {
      const isBuy = strategy.direction === 'BUY';
      const badge = isBuy
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-green-900/60 text-green-300 border border-green-600/50">COMPRA</span>'
        : '<span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-900/60 text-red-300 border border-red-600/50">VENDA</span>';

      const pct = `${strategy.expectedReturnPct >= 0 ? '+' : ''}${(strategy.expectedReturnPct * 100).toFixed(2)}%`;
      const pctClass = isBuy ? 'text-green-400 font-bold' : 'text-red-400 font-bold';

      return `
        <tr class="hover:bg-gray-800/80 transition-colors">
          <td class="p-3 font-bold text-white">${strategy.ticker}</td>
          <td class="p-3">
            <div class="flex flex-col gap-1">
              ${badge}
              <span class="text-gray-300 text-[11px] font-semibold">${strategy.setupName}</span>
            </div>
          </td>
          <td class="p-3 font-bold text-gray-200">${formatCurrency(strategy.currentPrice, strategy.currency)}</td>
          <td class="p-3 font-bold text-red-400 bg-red-950/20">${formatCurrency(strategy.stopLoss, strategy.currency)}</td>
          <td class="p-3 font-bold text-green-400 bg-green-950/20">${formatCurrency(strategy.target, strategy.currency)}</td>
          <td class="p-3 text-center ${pctClass} text-sm">${pct}</td>
          <td class="p-3 text-center font-bold text-blue-400">${strategy.riskRewardRatio.toFixed(2)} : 1</td>
          <td class="p-3 text-center text-gray-400">${strategy.timeDays}</td>
          <td class="p-3 text-right">
            <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 py-1 rounded transition-colors text-[11px]">
              Ver Gráfico ↗
            </button>
          </td>
        </tr>
      `;
    })
    .join('');
}
