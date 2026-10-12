import { getElement } from '../utils.js';
import { createTickerSelector } from '../components/TickerSelector.js';
import { createDashboardView } from '../views/DashboardView.js';
import { DashboardViewModel } from '../viewModels/DashboardViewModel.js';

export class DashboardPage {
  constructor() {
    this.view = createDashboardView();
    this.selector = createTickerSelector();
    this.viewModel = new DashboardViewModel(this);
  }

  bindTickerSelector(tickers, onChange) {
    if (!this.selector) return;

    const saved = JSON.parse(localStorage.getItem('nexusBrokerPrefs.v1.16') || 'null');
    const preferred = saved?.ticker || tickers[0]?.code;
    this.selector.populate(tickers, preferred);
    this.selector.element.onchange = (event) => onChange(event.target.value);
  }

  updateTitle(title) {
    this.view.setTitle(title);
  }

  bindRefresh(handler) {
    const refreshBtn = getElement('refreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => handler();
    }
  }

  bindChartType(handler) {
    const chartTypeSelect = getElement('chartTypeSelect');
    if (chartTypeSelect) {
      chartTypeSelect.onchange = (event) => handler(event.target.value);
    }
  }

  async init() {
    this.view.setStatus('Arquitetura por pages e view-model ativada.', 'success');
    await this.viewModel.init();
  }
}
