import { APP_CONFIG } from '../config.js';
import { state } from '../state.js';
import { formatCurrency, formatPct, getElement } from '../utils.js';

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
    getElement('chart-unavailable').classList.remove('hidden');
    getElement('chart-unavailable').classList.add('flex');
    return;
  }

  getElement('chart-unavailable').classList.add('hidden');
  getElement('chart-unavailable').classList.remove('flex');

  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  const labels = data.map((item) => item.label);
  const values = data.map((item) => item.close);
  const chartType = state.state.chartType || 'area';
  const showMA = Boolean(state.state.showMA);
  const showBB = Boolean(state.state.showBB);

  const datasets = [{
    label: 'Preço',
    data: values,
    borderColor: '#3B82F6',
    backgroundColor: chartType === 'area' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
    borderWidth: 2,
    fill: chartType === 'area',
    tension: 0.1,
    pointRadius: 0,
  }];

  if (showMA && analysis.ema9) {
    datasets.push({
      label: 'MME 9',
      data: analysis.ema9,
      borderColor: '#F59E0B',
      borderWidth: 1.5,
      pointRadius: 0,
      borderDash: [4, 4],
    });
  }

  if (showBB && analysis.bb) {
    datasets.push({
      label: 'BB Upper',
      data: analysis.bb.upper,
      borderColor: 'rgba(156, 163, 175, 0.8)',
      borderDash: [3, 3],
      pointRadius: 0,
    });
    datasets.push({
      label: 'BB Lower',
      data: analysis.bb.lower,
      borderColor: 'rgba(156, 163, 175, 0.8)',
      borderDash: [3, 3],
      pointRadius: 0,
    });
  }

  state.chartInstance = new Chart(chartCtx, {
    type: chartType === 'candle' ? 'bar' : 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF' } },
        y: { grid: { color: '#374151' }, ticks: { color: '#9CA3AF', callback: (value) => formatCurrency(value, currentCurrency) } },
      },
    },
  });
}

export function bindUiControls() {
  const select = getElement('tickerSelect');
  const chartTypeSelect = getElement('chartTypeSelect');
  const toggleMA = getElement('toggleMA');
  const toggleBB = getElement('toggleBB');

  if (chartTypeSelect) {
    chartTypeSelect.addEventListener('change', (event) => {
      state.state.chartType = event.target.value;
      renderDashboard();
    });
  }

  if (toggleMA) {
    toggleMA.addEventListener('change', (event) => {
      state.state.showMA = event.target.checked;
      renderDashboard();
    });
  }

  if (toggleBB) {
    toggleBB.addEventListener('change', (event) => {
      state.state.showBB = event.target.checked;
      renderDashboard();
    });
  }

  if (select) {
    select.addEventListener('change', (event) => {
      const value = event.target.value;
      if (!value) return;
      state.currentTicker = value;
      renderDashboard();
    });
  }
}
