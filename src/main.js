import { DashboardPage } from './pages/DashboardPage.js';
import { safeAsyncRun } from './services/errorHandler.js';
import { getElement } from './utils.js';
import { bindUiControls } from './ui/render.js';

window.__nexusBrokerModuleBootstrapped__ = true;

async function initDashboard() {
  const page = new DashboardPage();

  const result = await safeAsyncRun('initDashboard', async () => {
    page.bindRefresh(() => page.viewModel.onRefresh());
    bindUiControls();
    await page.init();
  });

  if (!result.ok) {
    const badge = getElement('data-status-badge');
    const text = getElement('data-status-text');
    if (badge) {
      badge.innerText = 'ERRO DE INICIALIZAÇÃO';
      badge.className = 'font-black text-[10px] px-2 py-0.5 rounded border bg-red-900/50 text-red-400 border-red-500';
    }
    if (text) {
      text.innerText = result.error || 'Não foi possível inicializar o dashboard.';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});
