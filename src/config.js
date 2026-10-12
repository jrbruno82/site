export const APP_CONFIG = {
  SHEET_ID: '1i8vuz4yLtlhhqj8iPwVOp0lj-9TxZhspgfnfl2vpjY0',
  PREFS_KEY: 'nexusBrokerPrefs.v1.16',
  STALE_DAYS: 4,
  MIN_CANDLES: 30,
  DEFAULT_CURRENT_DAYS: 180,
  chart: {
    type: 'area',
    showMA: false,
    showBB: false,
    showTrend: false,
    showMC: false,
    showPeaks: false,
    colorPeak: '#10B981',
    colorTrough: '#EF4444',
  },
};

export const DEFAULT_STATE = {
  chartInstance: null,
  globalData: [],
  globalMeta: null,
  tickersMeta: { source: 'real', reason: '' },
  availableTickers: [],
  currentDays: APP_CONFIG.DEFAULT_CURRENT_DAYS,
  dynamicDataCache: {},
  currentTicker: '',
  state: { ...APP_CONFIG.chart },
};
