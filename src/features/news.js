export function buildNewsCards(news = []) {
  if (!news.length) {
    return '<p class="text-sm text-gray-500 text-center py-6">Sem relatórios ou notícias para este ativo.</p>';
  }

  return news
    .map((item) => `
      <div class="bg-gray-900/60 border border-gray-700/60 p-4 rounded-xl">
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded border bg-blue-900/40 text-blue-400 border-blue-500/40">${item.impact || 'Info'}</span>
          <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">${item.time || 'Recente'}</span>
        </div>
        <h4 class="font-bold text-white text-sm">${item.title}</h4>
        <p class="text-xs text-gray-400 mt-1 mb-1">${item.desc || ''}</p>
        <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer" class="text-blue-400 text-[11px] hover:underline mt-3 inline-flex items-center gap-1 font-semibold">
          Acessar na íntegra ↗
        </a>
      </div>
    `)
    .join('');
}

export function renderNewsPanel(containerId, news = []) {
  const element = document.getElementById(containerId);
  if (!element) return;
  element.innerHTML = buildNewsCards(news);
}
