/* chart.js — criação e atualização do gráfico Chart.js.
 * Executa após o DOM (script defer). Expõe `chart` e funções de render
 * consumidas pela camada de UI. */

/* Cores/fonte do gráfico vêm do tema (CSS vars) — fonte única de verdade. */
const CHART_GRID = cssVar('--bd2');        // linhas de grade (visíveis no fundo escuro)
const CHART_TEXT = cssVar('--tx2');        // ticks e títulos dos eixos
const CHART_FONT = cssVar('--font-mono');  // fonte mono do tema (fonte única)

/* Marcadores de banda desenhados ao passar o mouse num card de índice.
 * Cada item: { x: wl, label: 'B8', value: number|null, color: '#hex' }. */
let bandMarkers = [];

const bandMarkerPlugin = {
  id: 'bandMarkers',
  afterDatasetsDraw(chart) {
    if (!bandMarkers.length) return;
    const { ctx, chartArea, scales } = chart;
    const { top, bottom } = chartArea;

    const chip = (text, cx, cy, bg, fg) => {
      ctx.font = '700 11px ' + CHART_FONT;
      const w = ctx.measureText(text).width;
      const padX = 5, h = 16;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(cx - w / 2 - padX, cy - h / 2, w + padX * 2, h, 4);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, cy + 0.5);
    };

    ctx.save();
    bandMarkers.forEach(m => {
      const x = scales.x.getPixelForValue(m.x);
      if (x < chartArea.left || x > chartArea.right) return;

      // linha vertical tracejada na cor da banda
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = m.color;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // valor onde a linha cruza a curva
      if (m.value != null) {
        const y = scales.y.getPixelForValue(m.value);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = cssVar('--panel');
        ctx.stroke();
        chip(m.value.toFixed(3), x, y - 14, cssVar('--panel2'), cssVar('--tx'));
      }

      // rótulo da banda abaixo da linha
      chip(m.label, x, bottom + 11, m.color, cssVar('--bg'));
    });
    ctx.restore();
  },
};

/* Alinha a barra de espectro à área de plotagem do gráfico (descontando o
 * eixo Y à esquerda), para que o gradiente mapeie 400–2500 nm exatamente
 * sobre o eixo X. Roda após o layout (init e resize). */
let _specKey = '';
const spectrumAlignPlugin = {
  id: 'spectrumAlign',
  afterLayout(chart) {
    const a = chart.chartArea;
    const key = `${Math.round(a.left)}_${Math.round(a.right)}_${Math.round(chart.width)}`;
    if (key === _specKey) return; // sem mudança de layout → nada a fazer
    _specKey = key;

    const wrap = document.querySelector('.spectrum-bar-wrap');
    if (!wrap) return;
    const canvasRect = chart.canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const left = Math.max(0, Math.round(canvasRect.left + a.left - wrapRect.left));
    const right = Math.max(0, Math.round(wrapRect.right - (canvasRect.left + a.right)));
    wrap.style.paddingLeft = left + 'px';
    wrap.style.paddingRight = right + 'px';
    if (typeof buildSpectrumBar === 'function') buildSpectrumBar();
  },
};

const chart = new Chart(document.getElementById('mainChart').getContext('2d'), {
  type: 'line',
  plugins: [bandMarkerPlugin, spectrumAlignPlugin],
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
        title: { display: true, text: 'Comprimento de onda (nm)', color: CHART_TEXT, font: { size: 12 } },
        ticks: { stepSize: 200, callback: v => v + ' nm', color: CHART_TEXT, font: { size: 11, family: CHART_FONT } },
        grid: { color: CHART_GRID },
        border: { color: CHART_GRID },
      },
      y: {
        min: 0, max: 1,
        title: { display: true, text: 'Refletância', color: CHART_TEXT, font: { size: 12 } },
        ticks: { stepSize: 0.1, callback: v => v.toFixed(1), color: CHART_TEXT, font: { size: 11, family: CHART_FONT } },
        grid: { color: CHART_GRID },
        border: { color: CHART_GRID },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: cssVar('--panel2'),
        borderColor: cssVar('--bd2'),
        borderWidth: 1,
        titleColor: cssVar('--tx'),
        bodyColor: cssVar('--tx2'),
        titleFont: { family: CHART_FONT },
        bodyFont: { family: CHART_FONT },
        padding: 10,
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

/** Valor da curva no comprimento de onda mais próximo (ponto exato da grade). */
function curveValueAt(data, wl) {
  if (!data) return null;
  const idx = Math.round((wl - WL_MIN) / WL_STEP);
  if (idx < 0 || idx >= data.length) return null;
  return data[idx];
}

/** Define (ou limpa, com []) os marcadores de banda e redesenha. */
function setBandMarkers(markers) {
  bandMarkers = markers || [];
  chart.update('none');
}

/** Sincroniza o gráfico com o estado atual (chamado pelo render central). */
function renderChart(s) {
  if (s.mode === 'overlay') {
    setOverlayChart(s.overlayActive);
  } else {
    setSingleChart(s.currentData, s.singleColor, s.singleLabel, !s.isDrawing);
  }
}
