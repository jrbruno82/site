export function createTickerSelector({ onChange } = {}) {
  const element = document.getElementById('tickerSelect');
  if (!element) return null;

  element.addEventListener('change', (event) => {
    const ticker = event.target.value;
    if (onChange) onChange(ticker);
  });

  return {
    element,
    populate(tickers, selectedValue = '') {
      element.innerHTML = '';
      tickers.forEach((ticker) => {
        const option = document.createElement('option');
        option.value = ticker.code;
        option.textContent = `${ticker.code} (${ticker.name})`;
        element.appendChild(option);
      });

      if (selectedValue) {
        element.value = selectedValue;
      }
    },
    setValue(value) {
      if (value) {
        element.value = value;
      }
    },
  };
}
