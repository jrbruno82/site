export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function fmtDateBR(date) {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtNum(value, digits = 2) {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatCurrency(value, currency = 'BRL') {
  const num = Number(value) || 0;
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function formatPct(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function parseSheetDate(cell) {
  if (!cell) return null;
  const v = cell.v;
  if (typeof v === 'string') {
    const matchDate = v.match(/^Date\((\d+),\s*(\d+),\s*(\d+)/);
    if (matchDate) {
      const year = Number(matchDate[1]);
      const month = Number(matchDate[2]) + 1;
      const day = Number(matchDate[3]);
      return new Date(year, month - 1, day);
    }
  }

  const text = String(cell.f || (typeof v === 'string' ? v : '') || '').trim();
  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/);
  if (match) return new Date(2000 + Number(match[3]), Number(match[2]) - 1, Number(match[1]));

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return null;
}

export function extNum(cell) {
  if (!cell) return 0;
  if (typeof cell.v === 'number') return cell.v;
  const raw = (cell.v || cell.f || '0').toString().replace(/[R$\s]/g, '');
  const normalized = raw.includes(',') && raw.includes('.')
    ? raw.split('.').join('').replace(',', '.')
    : raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function detectCurrency(ticker, availableTickers = []) {
  const found = availableTickers.find((item) => item.code === ticker);
  if (found && found.currency) return found.currency;
  return /[0-9]$/.test(ticker) ? 'BRL' : 'USD';
}

export function savePrefs(state) {
  try {
    localStorage.setItem('nexusBrokerPrefs.v1.16', JSON.stringify(state));
  } catch (error) {
    console.warn('Não foi possível salvar preferências.', error);
  }
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem('nexusBrokerPrefs.v1.16');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function getElement(id) {
  return document.getElementById(id);
}
