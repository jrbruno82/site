import { DEFAULT_STATE } from '../config.js';
import { APP_CONFIG } from '../config.js';

export const store = { ...DEFAULT_STATE };
export const state = store;

export function setState(patch) {
  Object.assign(store, patch);
}

export function hydrateStateFromPrefs(prefs = null) {
  if (!prefs || !prefs.state) return;
  Object.assign(store.state, prefs.state);
  if (typeof prefs.currentDays !== 'undefined') {
    store.currentDays = prefs.currentDays;
  }
}

export function saveStateSnapshot() {
  const snapshot = {
    state: { ...store.state },
    currentDays: store.currentDays,
    ticker: store.currentTicker,
  };

  try {
    localStorage.setItem(APP_CONFIG.PREFS_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Não foi possível persistir as preferências do dashboard.', error);
  }
}

export function setGlobalData(data, meta = null) {
  store.globalData = data;
  store.globalMeta = meta;
}

export function setAvailableTickers(list) {
  store.availableTickers = list;
}

export function setCurrentTicker(ticker) {
  store.currentTicker = ticker;
}

export function getStore() {
  return store;
}
