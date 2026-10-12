import { fetchSheetData, fetchTickersList } from '../data/marketData.js';
import { computeAnalysis } from '../analysis/technical.js';
import { buildStrategyRows } from '../analysis/strategies.js';
import { buildScenarioRows } from '../features/scenarios.js';
import { renderNewsPanel } from '../features/news.js';
import { renderDashboard, renderDataStatus } from '../ui/render.js';
import { state, setAvailableTickers, setCurrentTicker, setGlobalData, hydrateStateFromPrefs, saveStateSnapshot } from '../store/store.js';
import { getElement, loadPrefs } from '../utils.js';
import { clearCache } from '../services/cache.js';

export class DashboardViewModel {
  constructor(page) {
    this.page = page;
    this.currentTicker = '';
  }

  async init() {
    this.applySavedPrefs();
    const tickers = await fetchTickersList();
    setAvailableTickers(tickers);
    this.page.bindTickerSelector(tickers, (ticker) => this.loadTicker(ticker));

    const strategyRows = await buildStrategyRows(tickers, fetchSheetData);
    const scenario = await buildScenarioRows(tickers, fetchSheetData);
    renderNewsPanel('news-container', [{ title: 'Módulo de notícias pronto', time: 'Agora', impact: 'Arquitetura', desc: 'Sistema de notícias desacoplado da UI.', link: '#' }]);

    console.info('Strategy rows:', strategyRows.length);
    console.info('Scenario rows:', scenario.scenarioRows.length);

    const saved = loadPrefs();
    const preferred = saved?.ticker || tickers[0]?.code;
    this.loadTicker(preferred);
  }

  applySavedPrefs() {
    const prefs = loadPrefs();
    hydrateStateFromPrefs(prefs);
  }

  async loadTicker(ticker) {
    if (!ticker) return;
    this.currentTicker = ticker;
    setCurrentTicker(ticker);
    saveStateSnapshot();

    const select = getElement('tickerSelect');
    if (select) select.value = ticker;

    const { data, meta } = await fetchSheetData(ticker);
    setGlobalData(data, meta);
    state.analysis = computeAnalysis(data);

    renderDataStatus();
    renderDashboard();
    this.page.updateTitle(`${ticker} · NexusBroker`);
  }

  onRefresh() {
    clearCache();
    this.init();
  }
}
