/* ui.js — construção do DOM, render das métricas e todos os listeners.
 * Nenhum onclick inline; nenhum innerHTML com dados dinâmicos. */

/** Refletância no comprimento de onda mais próximo de `targetWl`. */
function getAtWl(data, targetWl) {
  const idx = Math.round((targetWl - WL_MIN) / WL_STEP);
  return data[Math.max(0, Math.min(N - 1, idx))] || 0;
}

/* ---- Construção dos botões de preset ------------------------------------ */
function buildPresets() {
  const grid = document.getElementById('presetsGrid');

  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-preset';
    btn.dataset.key = p.key;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.style.background = p.color; // cor de domínio do preset
    const label = document.createElement('span');
    label.textContent = p.label;

    btn.append(icon, label);
    btn.addEventListener('click', () => loadPreset(p.key));
    grid.appendChild(btn);
  });

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn-preset btn-clear';
  const clearIcon = document.createElement('span');
  clearIcon.className = 'icon icon-clear';
  clearIcon.textContent = '✕';
  const clearLabel = document.createElement('span');
  clearLabel.textContent = 'Limpar';
  clearBtn.append(clearIcon, clearLabel);
  clearBtn.addEventListener('click', clearAll);
  grid.appendChild(clearBtn);
}

/** Marca como ativos apenas os botões cujas chaves estão em `keys`. */
function markActivePresets(keys) {
  const set = new Set(keys);
  document.querySelectorAll('.btn-preset[data-key]').forEach(btn => {
    btn.classList.toggle('active', set.has(btn.dataset.key));
  });
}

/* ---- Ações --------------------------------------------------------------- */
function loadPreset(key) {
  const preset = PRESET_BY_KEY[key];
  if (!preset) return;

  if (state.mode === 'single') {
    updateState({
      activePreset: key,
      currentData: buildPresetData(preset),
      singleColor: preset.color,
      singleLabel: preset.label,
    });
    markActivePresets([key]);
  } else {
    const next = { ...state.overlayActive };
    let idx = state.overlayColorIdx;
    if (next[key]) {
      delete next[key];
    } else {
      const color = OVERLAY_COLORS[idx % OVERLAY_COLORS.length];
      idx += 1;
      next[key] = { data: buildPresetData(preset), color };
    }
    updateState({ overlayActive: next, overlayColorIdx: idx });
    markActivePresets(Object.keys(next));
  }
}

function clearAll() {
  if (state.mode === 'single') {
    updateState({
      currentData: wavelengths.map(() => 0),
      singleColor: cssVar('--muted'),
      singleLabel: 'Vazio',
      activePreset: null,
    });
  } else {
    // Bug corrigido: em sobreposição, limpar também re-renderiza o gráfico.
    updateState({ overlayActive: {}, overlayColorIdx: 0 });
  }
  markActivePresets([]);
}

function setMode(m) {
  document.getElementById('btnSingle').classList.toggle('active', m === 'single');
  document.getElementById('btnOverlay').classList.toggle('active', m === 'overlay');
  document.getElementById('overlayLegend').classList.toggle('is-hidden', m !== 'overlay');
  document.getElementById('overlayHint').classList.toggle('is-hidden', m !== 'overlay');

  if (m === 'single') {
    updateState({ mode: m, overlayActive: {}, overlayColorIdx: 0 }, { render: false });
    loadPreset(state.activePreset || 'floresta_nativa');
  } else {
    markActivePresets([]);
    updateState({ mode: m });
  }
}

/* ---- Render central ------------------------------------------------------ */
/** Qual curva alimenta as métricas/tabela conforme o modo. */
function getStatsData(s) {
  if (s.mode === 'single') return s.currentData;
  const keys = Object.keys(s.overlayActive);
  return keys.length === 1 ? s.overlayActive[keys[0]].data : null;
}

function renderInfo(data) {
  const swatch = document.getElementById('colorSwatch');
  const set = (id, txt) => { document.getElementById(id).textContent = txt; };

  if (!data) {
    swatch.style.background = cssVar('--surface-alt');
    set('rgbText', 'rgb(—)');
    set('statMean', '—');
    set('statPeak', '—');
    set('statPeakWl', 'nm');
    set('statNDVI', '—');
    set('statNDWI', '—');
    return;
  }

  const col = computeColor(data, wavelengths);
  swatch.style.background = `rgb(${col.r},${col.g},${col.b})`;
  set('rgbText', `rgb(${col.r}, ${col.g}, ${col.b})`);

  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  set('statMean', mean.toFixed(3));

  let maxV = 0, maxIdx = 0;
  data.forEach((v, i) => { if (v > maxV) { maxV = v; maxIdx = i; } });
  set('statPeak', maxV.toFixed(3));
  set('statPeakWl', wavelengths[maxIdx] + ' nm');

  const nir = getAtWl(data, 840);
  const red = getAtWl(data, 660);
  const grn = getAtWl(data, 560);
  set('statNDVI', ((nir + red) > 0 ? (nir - red) / (nir + red) : 0).toFixed(3));
  set('statNDWI', ((grn + nir) > 0 ? (grn - nir) / (grn + nir) : 0).toFixed(3));
}

function renderTable(data) {
  const tbody = document.getElementById('bandTableBody');
  tbody.replaceChildren();

  BANDS.forEach(b => {
    const val = data ? getAtWl(data, b.wl) : 0;
    const pct = Math.round(val * 100);
    const tr = document.createElement('tr');

    // Banda + chip de cor
    const tdName = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'band-chip';
    chip.style.background = b.color;
    tdName.append(chip, document.createTextNode(b.name));

    // λ central
    const tdWl = document.createElement('td');
    tdWl.textContent = b.wl + ' nm';

    // Barra de refletância + valor
    const tdVal = document.createElement('td');
    const flex = document.createElement('div');
    flex.className = 'bar-row';
    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.width = pct + '%';
    fill.style.background = b.color;
    track.appendChild(fill);
    const num = document.createElement('span');
    num.className = 'bar-num';
    num.textContent = data ? val.toFixed(3) : '—';
    flex.append(track, num);
    tdVal.appendChild(flex);

    // Sensor de referência
    const tdSensor = document.createElement('td');
    tdSensor.className = 'sensor-cell';
    tdSensor.textContent = b.sensor;

    tr.append(tdName, tdWl, tdVal, tdSensor);
    tbody.appendChild(tr);
  });
}

function renderLegend(s) {
  const wrap = document.getElementById('overlayLegend');
  wrap.replaceChildren();
  if (s.mode !== 'overlay') return;

  Object.entries(s.overlayActive).forEach(([key, info]) => {
    const item = document.createElement('button'); // <button> = acessível por teclado
    item.type = 'button';
    item.className = 'legend-item';

    const dot = document.createElement('span');
    dot.className = 'legend-dot';
    dot.style.background = info.color;
    const text = document.createElement('span');
    text.textContent = PRESET_BY_KEY[key].label;

    item.append(dot, text);
    item.title = 'Remover ' + PRESET_BY_KEY[key].label;
    item.addEventListener('click', () => {
      const next = { ...state.overlayActive };
      delete next[key];
      updateState({ overlayActive: next });
      markActivePresets(Object.keys(next));
    });
    wrap.appendChild(item);
  });
}

/** Render central registrado no estado. */
function render(s) {
  renderChart(s);
  const data = getStatsData(s);
  renderInfo(data);
  renderTable(data);
  renderLegend(s);
}

/* ---- Inicialização ------------------------------------------------------- */
function init() {
  // cor padrão da curva individual vem do CSS (fonte única de cor de tema)
  updateState({ singleColor: cssVar('--accent') }, { render: false });

  setRenderer(render);
  buildPresets();
  buildSpectrumBar();
  initCanvasInteractions();

  document.getElementById('btnSingle').addEventListener('click', () => setMode('single'));
  document.getElementById('btnOverlay').addEventListener('click', () => setMode('overlay'));

  window.addEventListener('resize', debounce(buildSpectrumBar, 100));

  loadPreset('floresta_nativa'); // primeira renderização
}

init();
