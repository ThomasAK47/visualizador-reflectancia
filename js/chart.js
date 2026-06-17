/* chart.js — criação e atualização do gráfico Chart.js.
 * Executa após o DOM (script defer). Expõe `chart` e funções de render
 * consumidas pela camada de UI. */

const chart = new Chart(document.getElementById('mainChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: wavelengths,
    datasets: [{
      label: 'Refletância',
      data: [],
      borderColor: cssVar('--accent'),
      borderWidth: 2.5,
      pointRadius: 0,
      fill: true,
      backgroundColor: cssVar('--accent-fill'),
      tension: 0.35,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    scales: {
      x: {
        type: 'linear',
        min: WL_MIN, max: WL_MAX,
        title: { display: true, text: 'Comprimento de onda (nm)', font: { size: 12 } },
        ticks: { stepSize: 200, callback: v => v + ' nm', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      y: {
        min: 0, max: 1,
        title: { display: true, text: 'Refletância', font: { size: 12 } },
        ticks: { stepSize: 0.1, callback: v => v.toFixed(1), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: items => items[0].label + ' nm',
          label: item => ' ' + item.dataset.label + ': ' + item.raw.toFixed(4),
        },
      },
    },
  },
});

/** Converte uma cor hex (#rgb ou #rrggbb) numa rgba com alpha. */
function hexToRgba(hex, alpha) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Renderiza o gráfico no modo individual (uma curva preenchida). */
function setSingleChart(data, color, label, animate) {
  const c = color || cssVar('--accent');
  chart.data.datasets = [{
    label: label || 'Refletância',
    data,
    borderColor: c,
    borderWidth: 2.5,
    pointRadius: 0,
    fill: true,
    backgroundColor: hexToRgba(c, 0.09),
    tension: 0.35,
  }];
  chart.update(animate ? undefined : 'none');
}

/** Renderiza o gráfico no modo sobreposição (N curvas em linha). */
function setOverlayChart(overlayActive) {
  chart.data.datasets = Object.entries(overlayActive).map(([key, info]) => ({
    label: PRESET_BY_KEY[key].label,
    data: info.data,
    borderColor: info.color,
    borderWidth: 2,
    pointRadius: 0,
    fill: false,
    tension: 0.35,
  }));
  chart.update();
}

/** Sincroniza o gráfico com o estado atual (chamado pelo render central). */
function renderChart(s) {
  if (s.mode === 'overlay') {
    setOverlayChart(s.overlayActive);
  } else {
    setSingleChart(s.currentData, s.singleColor, s.singleLabel, !s.isDrawing);
  }
}
