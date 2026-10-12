export function calculateEMA(data, period) {
  if (!data || !data.length) return Array(0).fill(null);
  const ema = Array(data.length).fill(null);
  if (data.length < period) return ema;

  let sum = 0;
  for (let index = 0; index < period; index += 1) sum += data[index];
  let current = sum / period;
  ema[period - 1] = current;

  const multiplier = 2 / (period + 1);
  for (let index = period; index < data.length; index += 1) {
    current = (data[index] - current) * multiplier + current;
    ema[index] = current;
  }

  return ema;
}

export function calculateBollingerBands(data, period = 20, multiplier = 2) {
  const upper = Array(data.length).fill(null);
  const middle = Array(data.length).fill(null);
  const lower = Array(data.length).fill(null);

  for (let index = period - 1; index < data.length; index += 1) {
    const slice = data.slice(index - period + 1, index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / period;
    const variance = slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);

    middle[index] = mean;
    upper[index] = mean + multiplier * stdDev;
    lower[index] = mean - multiplier * stdDev;
  }

  return { upper, middle, lower };
}

export function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return Array(data.length).fill(null);

  const values = Array(data.length).fill(null);
  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = data[index] - data[index - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  values[period] = 100 - 100 / (1 + rs);

  for (let index = period + 1; index < data.length; index += 1) {
    const change = data[index] - data[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    values[index] = 100 - 100 / (1 + rs);
  }

  return values;
}

export function calculateTrend(closes, windowSize = 50) {
  const slice = closes.slice(-windowSize);
  if (slice.length < 10) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  slice.forEach((value, index) => {
    sumX += index;
    sumY += value;
    sumXY += index * value;
    sumXX += index * index;
  });

  const numerator = slice.length * sumXY - sumX * sumY;
  const denominator = slice.length * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const mean = sumY / slice.length;
  const slopePct = mean > 0 ? slope / mean : 0;

  let ssTot = 0;
  let ssRes = 0;
  slice.forEach((value, index) => {
    const point = (slope * index) + (sumY / slice.length - slope * (sumX / slice.length));
    ssTot += (value - mean) ** 2;
    ssRes += (value - point) ** 2;
  });

  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  let state = 'side';
  if (r2 >= 0.3 && slopePct >= 0.0005) state = 'up';
  else if (r2 >= 0.3 && slopePct <= -0.0005) state = 'down';

  return { slope, slopePct, r2, state, points: slice.map((_, index) => (slope * index) + (sumY / slice.length - slope * (sumX / slice.length))) };
}

export function detectCandlestickPattern(data) {
  if (!data || data.length < 2) return { text: 'Sem dados suficientes', color: 'text-gray-400' };

  const current = data[data.length - 1];
  const previous = data[data.length - 2];
  const body = Math.abs(current.close - current.open);
  const topShadow = current.high - Math.max(current.open, current.close);
  const bottomShadow = Math.min(current.open, current.close) - current.low;

  if (bottomShadow > body * 2 && topShadow < body * 0.5) return { text: 'Martelo (Reversão Alta)', color: 'text-green-400' };
  if (topShadow > body * 2 && bottomShadow < body * 0.5) return { text: 'Estrela Cadente (Reversão Baixa)', color: 'text-red-400' };
  if (previous.close < previous.open && current.close > current.open && current.close > previous.open && current.open < previous.close) return { text: 'Engolfo de Alta', color: 'text-green-400' };
  if (previous.close > previous.open && current.close < current.open && current.close < previous.open && current.open > previous.close) return { text: 'Engolfo de Baixa', color: 'text-red-400' };

  return { text: 'Nenhum', color: 'text-gray-400' };
}

export function computeAnalysis(data) {
  if (!data || data.length === 0) return null;

  const closes = data.map((item) => item.close);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema200 = calculateEMA(closes, 200);
  const bb = calculateBollingerBands(closes, 20, 2);
  const rsi = calculateRSI(closes, 14);
  const last = data[data.length - 1];

  return {
    lastClose: last.close,
    lastTs: last.ts,
    ema9,
    ema21,
    ema200,
    bb,
    rsi,
    currentRSI: rsi[rsi.length - 1] ?? 50,
    trend: calculateTrend(closes, 50),
    candle: detectCandlestickPattern(data),
    insufficient: data.length < 30,
    buySignal: Boolean(last.close > ema9[ema9.length - 1] && ema9[ema9.length - 1] > ema21[ema21.length - 1]),
  };
}
