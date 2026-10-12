import { APP_CONFIG } from '../config.js';
import { state } from '../state.js';
import { formatCurrency, formatPct, getElement } from '../utils.js';
import { saveStateSnapshot } from '../store/store.js';

const MONTE_CARLO = { window: 120, steps: 10, simulations: 1000 };

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function calculateMonteCarlo(closes, seed) {
  if (closes.length < 2) return { upper: [], lower: [] };

  const random = seededRandom(seed);
  const returns = closes.slice(1).map((close, index) => close / closes[index] - 1);
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length;
  const deviation = Math.sqrt(variance);
  const paths = Array.from({ length: MONTE_CARLO.simulations }, () => {
    const path = [closes[closes.length - 1]];
    for (let step = 0; step < MONTE_CARLO.steps; step += 1) {
      const u1 = 1 - random();
      const u2 = random();
      const shock = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      path.push(path[path.length - 1] * (1 + mean + deviation * shock));
    }
    return path;
  });

  const percentile = (values, fraction) => {
    values.sort((left, right) => left - right);
    return values[Math.floor((values.length - 1) * fraction)];
  };
  const upper = [];
  const lower = [];

  for (let step = 0; step <= MONTE_CARLO.steps; step += 1) {
    const prices = paths.map((path) => path[step]);
    lower.push(percentile(prices, 0.05));
    upper.push(percentile(prices, 0.95));
  }

  return { upper, lower };
}

function setChartUnavailable(unavailable) {
  const message = getElement('chart-unavailable');
  if (!message) return;
  message.classList.toggle('hidden', !unavailable);
  message.classList.toggle('flex', unavailable);
}

export function syncChartControls() {
  const controls = {
    chartTypeSelect: state.state.chartType || APP_CONFIG.chart.chartType,
    toggleMA: Boolean(state.state.showMA),
    toggleBB: Boolean(state.state.showBB),
    toggleTrend: Boolean(state.state.showTrend),
    toggleMC: Boolean(state.state.showMC),
    togglePeaksTroughs: Boolean(state.state.showPeaksTroughs),
    colorPeak: state.state.colorPeak || APP_CONFIG.chart.colorPeak,
    colorTrough: state.state.colorTrough || APP_CONFIG.chart.colorTrough,
  };

  Object.entries(controls).forEach(([id, value]) => {
    const element = getElement(id);
    if (element) element[element.type === 'checkbox' ? 'checked' : 'value'] = value;
  });

  document.querySelectorAll('#time-filters [data-days]').forEach((button) => {
    button.classList.toggle('active', button.dataset.days === String(state.currentDays));
  });
}

export function renderDataStatus() {
  const box = getElement('data-status');
  const badge = getElement('data-status-badge');
  const text = getElement('data-status-text');

  if (!box || !badge || !text) return;

  const meta = state.globalMeta;
  if (!meta) {
    box.className = 'rounded-xl border px-3 py-2 text-xs bg-yellow-900/20 border-yellow-700/50';
    badge.className = 'font-black text-[10px] px-2 py-0.5 rounded border bg-yellow-900/50 text-yellow-400 border-yellow-500';
    badge.innerText = 'CARREGANDO...';
    text.innerText = 'Aguardando dados do ativo.';
    return;
  }

  const age = meta.ageDays <= 0 ? 'hoje' : `${meta.ageDays} dia(s) atrás`;
  const isOk = meta.source === 'real' && !meta.stale;

  box.className = isOk
    ? 'rounded-xl border px-3 py-2 text-xs bg-green-900/20 border-green-700/50'
    : 'rounded-xl border px-3 py-2 text-xs bg-yellow-900/20 border-yellow-700/50';
  badge.className = isOk
    ? 'font-black text-[10px] px-2 py-0.5 rounded border bg-green-900/50 text-green-400 border-green-500'
    : 'font-black text-[10px] px-2 py-0.5 rounded border bg-yellow-900/50 text-yellow-400 border-yellow-500';
  badge.innerText = isOk ? 'DADOS REAIS' : 'DADOS REAIS · DESATUALIZADOS';
  text.innerText = meta.lastDate ? `Último candle: ${meta.lastDate} (${age}) · ${meta.count} registros` : meta.reason || 'Sem dados';
}

export function renderEmptyState(ticker) {
  const ids = ['kpi-close', 'kpi-open', 'kpi-high', 'kpi-low', 'kpi-maxmin-pct'];
  ids.forEach((id) => {
    const element = getElement(id);
    if (element) element.innerText = id.includes('pct') ? '—' : '—';
  });

  const badge = getElement('expert-badge');
  const reason = getElement('expert-reason');
  const insight = getElement('dt-insight');

  if (badge) {
    badge.innerText = 'SEM DADOS';
    badge.className = 'inline-block px-4 py-2 rounded-lg text-lg font-black bg-gray-800 text-gray-300 border border-gray-600';
  }

  if (reason) reason.innerText = `Nenhuma cotação disponível para ${ticker}.`;
  if (insight) insight.innerHTML = '<div>Sem dados suficientes para análise técnica.</div>';

  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }
}

export function renderDashboard() {
  const ticker = state.currentTicker || 'ITUB4';
  const data = state.globalData;

  if (!data || data.length === 0) {
    renderEmptyState(ticker);
    return;
  }

  const analysis = state.analysis || {
    lastClose: data[data.length - 1].close,
    currentRSI: 50,
    candle: { text: 'Sem dados', color: 'text-gray-400' },
    trend: { state: 'side' },
  };

  const last = data[data.length - 1];
  const first = data[0];
  const currentCurrency = 'BRL';

  getElement('kpi-close').innerText = formatCurrency(last.close, currentCurrency);
  getElement('kpi-open').innerText = formatCurrency(first.open, currentCurrency);
  getElement('kpi-high').innerText = formatCurrency(Math.max(...data.map((item) => item.high)), currentCurrency);
  getElement('kpi-low').innerText = formatCurrency(Math.min(...data.map((item) => item.low)), currentCurrency);

  const max = Math.max(...data.map((item) => item.high));
  const min = Math.min(...data.map((item) => item.low));
  const pctFromMin = min === 0 ? 0 : ((last.close - min) / min);
  const pctFromMax = max === 0 ? 0 : ((last.close - max) / max);
  getElement('kpi-maxmin-pct').innerHTML = `
    <span class="${pctFromMin >= 0 ? 'text-green-400' : 'text-red-400'}">${pctFromMin >= 0 ? '+' : ''}${formatPct(pctFromMin)} da Mín</span>
    <span class="text-gray-600 mx-1">|</span>
    <span class="${pctFromMax >= 0 ? 'text-green-400' : 'text-red-400'}">${pctFromMax >= 0 ? '+' : ''}${formatPct(pctFromMax)} da Máx</span>
  `;

  const trendText = analysis.trend?.state === 'up' ? 'Alta' : analysis.trend?.state === 'down' ? 'Baixa' : 'Neutro';
  const trendColor = analysis.trend?.state === 'up' ? 'text-green-400' : analysis.trend?.state === 'down' ? 'text-red-400' : 'text-yellow-400';
  getElement('dt-trend-status').innerText = trendText;
  getElement('dt-trend-status').className = `mt-1 text-sm font-bold ${trendColor}`;

  getElement('dt-candle-pattern').innerText = analysis.candle?.text || '—';
  getElement('dt-candle-pattern').className = `mt-1 text-sm font-bold ${analysis.candle?.color || 'text-gray-200'}`;
  getElement('dt-volume-status').innerText = 'Estável';

  const expertBadge = getElement('expert-badge');
  const expertReason = getElement('expert-reason');
  const recommendationTimestamp = getElement('recommendation-timestamp');
  const insight = getElement('dt-insight');

  if (analysis.buySignal) {
    expertBadge.innerText = 'TENDÊNCIA DE ALTA';
    expertBadge.className = 'inline-block px-4 py-2 rounded-lg text-lg font-black bg-green-900/50 text-green-400 border border-green-500';
    expertReason.innerText = `Preço acima da média e com tendência favorável para o ativo ${ticker}.`;
    insight.innerHTML = '<div><strong>Ação:</strong> manter foco em alinhamento técnico e risco controlado.</div>';
  } else {
    expertBadge.innerText = 'AGUARDAR';
    expertBadge.className = 'inline-block px-4 py-2 rounded-lg text-lg font-black bg-gray-800 text-gray-300 border border-gray-600';
    expertReason.innerText = 'Sem confirmação clara de tendência forte no momento.';
    insight.innerHTML = '<div><strong>Ação:</strong> monitorar retrações e indicadores de tendência antes de operar.</div>';
  }

  recommendationTimestamp.innerText = `Última análise: ${new Date().toLocaleString('pt-BR')}`;

  const chartCtx = getElement('mainChart');
  if (!chartCtx) return;

  if (typeof Chart === 'undefined') {
    if (state.chartInstance) {
      state.chartInstance.destroy();
      state.chartInstance = null;
    }
    setChartUnavailable(true);
    return;
  }

  setChartUnavailable(false);

  if (state.chartInstance) {
    state.chartInstance.destroy();
    state.chartInstance = null;
  }

  const dayCount = state.currentDays === 'all' ? data.length : Number(state.currentDays);
  const startIndex = Math.max(0, data.length - dayCount);
  const visibleData = data.slice(startIndex);
  const labels = visibleData.map((item) => item.label);
  const chartType = state.state.chartType || APP_CONFIG.chart.chartType;
  const candleChart = chartType === 'candle';
  const datasets = [];

  if (candleChart) {
    datasets.push({
      label: 'Vela (OHLC)',
      data: visibleData.map((item) => [item.open, item.close]),
      backgroundColor: visibleData.map((item) => item.close >= item.open ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
      borderColor: visibleData.map((item) => item.close >= item.open ? '#10B981' : '#EF4444'),
      borderWidth: 1,
      order: 10,
    });
  } else {
    datasets.push({
      label: 'Preço',
      data: visibleData.map((item) => item.close),
      borderColor: '#3B82F6',
      backgroundColor: chartType === 'area' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
      borderWidth: 2,
      fill: chartType === 'area',
      tension: 0.1,
      pointRadius: 0,
      order: 10,
    });
  }

  if (!candleChart && state.state.showPeaksTroughs && analysis.pivots) {
    const addPivots = (values, label, color) => {
      const pivotValues = values.slice(startIndex);
      const pointRadius = pivotValues.map((value) => value === null ? 0 : 5);
      const pointData = [...pivotValues];
      const visibleCloses = visibleData.map((item) => item.close);
      if (pointData.length && pointData[0] === null) pointData[0] = visibleCloses[0];
      if (pointData.length && pointData[pointData.length - 1] === null) pointData[pointData.length - 1] = visibleCloses[visibleCloses.length - 1];
      datasets.push({
        label,
        data: pointData,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius,
        pointHoverRadius: 7,
        pointBackgroundColor: color,
        fill: false,
        spanGaps: true,
        order: 1,
      });
    };

    addPivots(analysis.pivots.peaks, 'Topos', state.state.colorPeak || APP_CONFIG.chart.colorPeak);
    addPivots(analysis.pivots.troughs, 'Fundos', state.state.colorTrough || APP_CONFIG.chart.colorTrough);
  }

  if (!candleChart && state.state.showMA) {
    [
      { label: 'MME 9', values: analysis.ema9, color: '#F59E0B', dash: [5, 5], width: 1.5 },
      { label: 'MME 21', values: analysis.ema21, color: '#EC4899', dash: [2, 2], width: 1.5 },
      { label: 'MME 200', values: analysis.ema200, color: '#8B5CF6', dash: [], width: 2 },
    ].forEach(({ label, values, color, dash, width }) => {
      if (!values) return;
      datasets.push({
        label,
        data: values.slice(startIndex),
        borderColor: color,
        borderWidth: width,
        borderDash: dash,
        pointRadius: 0,
        order: 5,
      });
    });
  }

  if (!candleChart && state.state.showBB && analysis.bb) {
    [
      { label: 'BB Sup (20,2)', values: analysis.bb.upper, color: 'rgba(156, 163, 175, 0.4)', dash: [2, 2] },
      { label: 'BB Inf (20,2)', values: analysis.bb.lower, color: 'rgba(156, 163, 175, 0.4)', dash: [2, 2], fill: '-1' },
      { label: 'BB Média (20)', values: analysis.bb.middle, color: 'rgba(156, 163, 175, 0.6)', dash: [4, 4] },
    ].forEach(({ label, values, color, dash, fill }) => {
      datasets.push({
        label,
        data: values.slice(startIndex),
        borderColor: color,
        borderWidth: 1,
        borderDash: dash,
        pointRadius: 0,
        fill: fill || false,
        backgroundColor: fill ? 'rgba(255, 255, 255, 0.05)' : undefined,
        order: 7,
      });
    });
  }

  if (!candleChart && state.state.showTrend && analysis.trend) {
    const trendStart = data.length - analysis.trend.n;
    const trendValues = Array(data.length).fill(null);
    analysis.trend.points.forEach((point, index) => {
      trendValues[trendStart + index] = point;
    });
    datasets.push({
      label: 'Tendência',
      data: trendValues.slice(startIndex),
      borderColor: 'rgba(255, 255, 255, 0.55)',
      borderWidth: 1.5,
      pointRadius: 0,
      order: 2,
    });
  }

  if (!candleChart && state.state.showMC) {
    const closes = data.slice(-MONTE_CARLO.window).map((item) => item.close);
    const prediction = calculateMonteCarlo(
      closes,
      hashSeed(`${state.currentTicker}|${analysis.lastTs}|${analysis.lastClose.toFixed(4)}|${MONTE_CARLO.window}`),
    );
    const padding = Array(Math.max(0, visibleData.length - 1)).fill(null);
    const forecastLabels = Array.from({ length: MONTE_CARLO.steps }, (_, index) => `D+${index + 1}`);
    labels.push(...forecastLabels);
    datasets.push({
      label: 'MC P95',
      data: [...padding, ...prediction.upper],
      borderColor: 'rgba(16, 185, 129, 0.5)',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      order: 3,
    });
    datasets.push({
      label: 'MC P5',
      data: [...padding, ...prediction.lower],
      borderColor: 'rgba(239, 68, 68, 0.5)',
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: '-1',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      order: 4,
    });
  }

  const candleWickPlugin = {
    id: 'candleWicks',
    afterDatasetsDraw(chart) {
      const metadata = chart.options.plugins?.candleWicks;
      if (!metadata) return;
      const chartMeta = chart.getDatasetMeta(0);
      chart.ctx.save();
      chartMeta.data.forEach((bar, index) => {
        const candle = metadata.ohlc[index];
        if (!candle || !bar) return;
        chart.ctx.strokeStyle = candle.close >= candle.open ? '#10B981' : '#EF4444';
        chart.ctx.lineWidth = 1;
        chart.ctx.beginPath();
        chart.ctx.moveTo(bar.x, chart.scales.y.getPixelForValue(candle.high));
        chart.ctx.lineTo(bar.x, chart.scales.y.getPixelForValue(candle.low));
        chart.ctx.stroke();
      });
      chart.ctx.restore();
    },
  };

  state.chartInstance = new Chart(chartCtx, {
    type: candleChart ? 'bar' : 'line',
    data: { labels, datasets },
    plugins: candleChart ? [candleWickPlugin] : [],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        candleWicks: candleChart ? { ohlc: visibleData } : null,
        tooltip: { filter: (item) => !(Array.isArray(item.dataset.pointRadius) && item.dataset.pointRadius[item.dataIndex] === 0) },
      },
      scales: {
        x: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', maxTicksLimit: 12 } },
        y: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', callback: (value) => formatCurrency(value, currentCurrency) } },
      },
    },
  });
}

export function bindUiControls() {
  const controlBindings = [
    ['chartTypeSelect', 'chartType', 'change'],
    ['toggleMA', 'showMA', 'change'],
    ['toggleBB', 'showBB', 'change'],
    ['toggleTrend', 'showTrend', 'change'],
    ['toggleMC', 'showMC', 'change'],
    ['togglePeaksTroughs', 'showPeaksTroughs', 'change'],
    ['colorPeak', 'colorPeak', 'input'],
    ['colorTrough', 'colorTrough', 'input'],
  ];

  controlBindings.forEach(([id, property, eventName]) => {
    const element = getElement(id);
    if (!element) return;
    element.addEventListener(eventName, (event) => {
      state.state[property] = element.type === 'checkbox' ? event.target.checked : event.target.value;
      saveStateSnapshot();
      renderDashboard();
    });
  });

  document.querySelectorAll('#time-filters [data-days]').forEach((button) => {
    button.addEventListener('click', () => {
      state.currentDays = button.dataset.days === 'all' ? 'all' : Number(button.dataset.days);
      saveStateSnapshot();
      syncChartControls();
      renderDashboard();
    });
  });

  syncChartControls();
}
