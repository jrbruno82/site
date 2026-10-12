import { getElement } from '../utils.js';

export function renderStatusBadge({ kind = 'info', label = 'DADOS', message = '' } = {}) {
  const badge = getElement('data-status-badge');
  const text = getElement('data-status-text');

  if (!badge || !text) return;

  const classes = {
    info: 'bg-gray-700 text-gray-300 border-gray-600',
    success: 'bg-green-900/50 text-green-400 border-green-500',
    warn: 'bg-yellow-900/50 text-yellow-400 border-yellow-500',
    error: 'bg-red-900/50 text-red-400 border-red-500',
  };

  badge.className = `font-black text-[10px] px-2 py-0.5 rounded border ${classes[kind] || classes.info}`;
  badge.innerText = label;
  text.innerText = message;
}
