import { renderStatusBadge } from '../components/StatusBadge.js';

export function createDashboardView() {
  return {
    setTitle(title) {
      const el = document.getElementById('chart-title');
      if (el) el.innerText = title;
    },
    setStatus(message, kind = 'info') {
      const label = kind === 'error' ? 'ERRO' : kind === 'success' ? 'DADOS' : 'DADOS';
      renderStatusBadge({ kind, label, message });
    },
  };
}
