export async function buildScenarioRows(tickers, fetchSheetData) {
  const scenarioRows = [];
  const ignored = [];

  for (const item of tickers) {
    const { data, meta } = await fetchSheetData(item.code);
    if (meta.source !== 'real' || meta.stale || data.length < 30) {
      ignored.push(item.code);
      continue;
    }

    const current = data[data.length - 1];
    const ema9 = calculateEMA(data.map((point) => point.close), 9).at(-1);
    const ema21 = calculateEMA(data.map((point) => point.close), 21).at(-1);
    const buySignal = Boolean(current.close > ema9 && ema9 > ema21);

    if (buySignal) {
      scenarioRows.push({
        codigo: item.code,
        cotacao: current.close,
        moeda: item.currency || 'BRL',
        data: current.date,
      });
    }
  }

  return { scenarioRows, ignored };
}

function calculateEMA(data, period) {
  if (!data || !data.length) return Array(0).fill(null);
  const ema = Array(data.length).fill(null);
  if (data.length < period) return ema;

  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += data[i];
  let current = sum / period;
  ema[period - 1] = current;

  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i += 1) {
    current = (data[i] - current) * multiplier + current;
    ema[i] = current;
  }

  return ema;
}

export function renderScenarioTable(rows, name = 'Cenário') {
  if (!rows || !rows.length) {
    return '<tr><td colspan="5" class="p-4 text-center text-yellow-400">Nenhum ativo com sinal forte de compra.</td></tr>';
  }

  return rows
    .map((row) => `
      <tr class="border-b border-gray-800">
        <td class="p-3 text-gray-300">${name}</td>
        <td class="p-3 font-bold text-white">${row.codigo}</td>
        <td class="p-3 text-gray-300">${row.moeda === 'USD' ? '$' : 'R$'} ${Number(row.cotacao).toFixed(2)}</td>
        <td class="p-3 text-gray-300">${row.data}</td>
        <td class="p-3 text-right font-bold text-green-400">R$ 100,00</td>
      </tr>
    `)
    .join('');
}
