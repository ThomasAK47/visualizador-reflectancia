/* ui.js — construção do DOM, render das métricas e todos os listeners.
 * Nenhum onclick inline; nenhum innerHTML com dados dinâmicos. */

/* ---- Construção dos botões de preset ------------------------------------ */
function buildPresets() {
  const grid = document.getElementById('presetsGrid');

  PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-preset';
    btn.dataset.key = p.key;
    btn.style.setProperty('--pc', p.color); // cor do preset p/ o tint (usada no CSS)

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
  const set = (id, txt) => { document.getElementById(id).textContent = txt; };

  if (!data) {
    set('statMean', '—');
    set('statPeak', '—');
    set('statPeakWl', 'nm');
    return;
  }

  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  set('statMean', mean.toFixed(3));

  let maxV = 0, maxIdx = 0;
  data.forEach((v, i) => { if (v > maxV) { maxV = v; maxIdx = i; } });
  set('statPeak', maxV.toFixed(3));
  set('statPeakWl', wavelengths[maxIdx] + ' nm');
}

/* ---- Cards de índice e composição --------------------------------------- */
const OUT_OF_RANGE = 'fora do intervalo espectral';

/** Marca no gráfico as bandas (papéis) que alimentam um índice. */
function showIndexMarkers(def) {
  const sat = state.satellite;
  const data = getStatsData(state);
  const markers = def.num.map(role => {
    const bnd = bandByRole(sat, role);
    if (!bnd) return null;
    return { x: bnd.wl, label: bnd.num, value: curveValueAt(data, bnd.wl), color: bnd.color };
  }).filter(Boolean);
  setBandMarkers(markers);
}

function buildIndexCard(def, s, data) {
  const sat = s.satellite;
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'idx-card';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = def.title;
  const sub = document.createElement('div');
  sub.className = 'card-sub';
  sub.textContent = def.subtitle;

  const valueEl = document.createElement('div');
  valueEl.className = 'card-value';
  const track = document.createElement('div');
  track.className = 'idx-track';
  const fill = document.createElement('div');
  fill.className = 'idx-fill';
  track.appendChild(fill);
  const formula = document.createElement('div');
  formula.className = 'card-formula';

  const missing = missingIndexRole(sat, def);
  if (missing) {
    // Banda ausente neste sensor → card desabilitado, sem modal.
    card.classList.add('is-disabled');
    card.setAttribute('aria-disabled', 'true');
    valueEl.textContent = '—';
    fill.style.width = '0%';
    formula.textContent = '—';
    card.title = `Indisponível: ${SATELLITES[sat].name} não possui banda ${ROLE_LABEL[missing]}`;
  } else {
    card.addEventListener('click', () => openCardModal(def, state.satellite, 'index'));
    // Hover/foco → marca no gráfico as bandas que alimentam o índice
    card.addEventListener('mouseenter', () => showIndexMarkers(def));
    card.addEventListener('mouseleave', () => setBandMarkers([]));
    card.addEventListener('focus', () => showIndexMarkers(def));
    card.addEventListener('blur', () => setBandMarkers([]));
    const value = data ? computeIndex(data, sat, def) : null;
    if (value === null) {
      valueEl.textContent = '—';
      fill.style.width = '0%';
      card.title = data ? OUT_OF_RANGE : def.tooltip;
    } else {
      valueEl.textContent = value.toFixed(3);
      const c = scaleColor(def.scale, value);
      fill.style.width = ((value + 1) / 2 * 100).toFixed(1) + '%';
      fill.style.background = `rgb(${c.r},${c.g},${c.b})`;
      card.title = def.tooltip;
    }
    formula.textContent = indexFormula(sat, def);
  }

  card.append(title, sub, valueEl, track, formula);
  return card;
}

function buildCompositeCard(def, s, data) {
  const sat = s.satellite;
  const cfg = compositionConfig(sat, def.key);
  // Título/subtítulo podem ser sobrescritos pelo satélite (ex.: L5 "Geológica").
  const cardDef = cfg && (cfg.title || cfg.subtitle)
    ? { ...def, title: cfg.title || def.title, subtitle: cfg.subtitle || def.subtitle }
    : def;

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'idx-card';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = cardDef.title;
  const sub = document.createElement('div');
  sub.className = 'card-sub';
  sub.textContent = cardDef.subtitle;

  const swatch = document.createElement('div');
  swatch.className = 'card-swatch';
  const formula = document.createElement('div');
  formula.className = 'card-formula';

  if (!cfg) {
    // Composição indisponível neste sensor → card desabilitado, sem modal.
    card.classList.add('is-disabled');
    card.setAttribute('aria-disabled', 'true');
    swatch.classList.add('swatch-empty');
    formula.textContent = '—';
    card.title = `Composição indisponível em ${SATELLITES[sat].name}`;
  } else {
    card.addEventListener('click', () => openCardModal(cardDef, state.satellite, 'composite'));
    const rgb = data ? computeComposite(data, sat, def) : null;
    if (rgb === null) {
      swatch.classList.add('swatch-empty');
      card.title = data ? OUT_OF_RANGE : def.tooltip;
    } else {
      swatch.style.background = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
      card.title = def.tooltip;
    }
    formula.textContent = compositeFormula(sat, def);
  }

  card.append(title, sub, swatch, formula);
  return card;
}

function renderCards(s) {
  const data = getStatsData(s);
  const grid = document.getElementById('cardsGrid');
  grid.replaceChildren();
  INDEX_DEFS.forEach(def => grid.appendChild(buildIndexCard(def, s, data)));
  COMPOSITE_DEFS.forEach(def => grid.appendChild(buildCompositeCard(def, s, data)));
}

/** Curva e rótulo para a tabela de bandas conforme o modo.
 *  Overlay → última curva adicionada (com label discreto). */
function getTableData(s) {
  if (s.mode === 'single') return { data: s.currentData, label: null };
  const keys = Object.keys(s.overlayActive);
  if (keys.length === 0) return { data: null, label: null };
  const lastKey = keys[keys.length - 1];
  return { data: s.overlayActive[lastKey].data, label: PRESET_BY_KEY[lastKey].label };
}

function renderTable(s) {
  const { data, label } = getTableData(s);

  // Nota discreta no overlay indicando qual curva a tabela reflete
  const note = document.getElementById('bandTableNote');
  note.textContent = label ? `· última curva: ${label}` : '';

  const tbody = document.getElementById('bandTableBody');
  tbody.replaceChildren();

  Object.values(SATELLITES[s.satellite].bands).forEach(b => {
    const sampled = data ? sampleBand(data, b.wl) : null;
    const pct = sampled === null ? 0 : Math.round(clamp(sampled) * 100);
    const tr = document.createElement('tr');

    // Banda (número) + chip de cor
    const tdNum = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'band-chip';
    chip.style.background = b.color;
    tdNum.append(chip, document.createTextNode(b.num));

    // Nome
    const tdName = document.createElement('td');
    tdName.textContent = b.name;

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
    num.textContent = sampled === null ? '—' : sampled.toFixed(3);
    flex.append(track, num);
    tdVal.appendChild(flex);

    tr.append(tdNum, tdName, tdWl, tdVal);
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

/* ---- Seletor de satélite (grid de cards) + painel de info --------------- */
function buildSatelliteSelector() {
  const grid = document.getElementById('satGrid');
  SATELLITE_ORDER.forEach(id => {
    const sat = SATELLITES[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sat-card';
    btn.dataset.sat = id;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', sat.name);
    btn.title = sat.name;

    const ic = document.createElement('span');
    ic.className = 'sat-ic';
    ic.textContent = '🛰';
    ic.setAttribute('aria-hidden', 'true');
    const nm = document.createElement('span');
    nm.className = 'sat-card-name';
    nm.textContent = sat.shortName;

    btn.append(ic, nm);
    btn.addEventListener('click', () => setSatellite(id));
    grid.appendChild(btn);
  });
}

/** Destaca o satélite ativo no seletor. */
function markActiveSatellite(id) {
  document.querySelectorAll('.sat-card[data-sat]').forEach(btn => {
    const on = btn.dataset.sat === id;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

/** Painel inline com imagem e metadados do satélite ativo (fade ao trocar). */
function renderSatInfo(s) {
  const sat = SATELLITES[s.satellite];
  const box = document.getElementById('satInfo');
  box.replaceChildren();

  // Foto com fallback para placeholder (sem imagem quebrada)
  const wrap = document.createElement('div');
  wrap.className = 'sat-photo-wrap';
  const img = document.createElement('img');
  img.className = 'sat-photo';
  img.src = sat.imagePath;
  img.alt = `Ilustração do satélite ${sat.name} — ${sat.agency}`;
  const ph = document.createElement('div');
  ph.className = 'sat-photo sat-photo-ph';
  ph.textContent = sat.shortName;
  ph.hidden = true;
  ph.setAttribute('aria-hidden', 'true');
  img.addEventListener('error', () => { img.hidden = true; ph.hidden = false; });
  wrap.append(img, ph);

  const name = document.createElement('div');
  name.className = 'sat-name';
  name.textContent = sat.name;
  const agency = document.createElement('div');
  agency.className = 'sat-meta';
  agency.textContent = sat.agency;

  const specs = document.createElement('div');
  specs.className = 'sat-specs';
  const chip = (txt) => { const c = document.createElement('span'); c.className = 'sat-chip'; c.textContent = txt; return c; };
  specs.append(chip(sat.resolution), chip(sat.period));

  const note = document.createElement('p');
  note.className = 'sat-note';
  note.textContent = sat.note;

  box.append(wrap, name, agency, specs, note);

  // fade de entrada (150ms)
  box.classList.remove('sat-fade');
  void box.offsetWidth;
  box.classList.add('sat-fade');
}

function setSatellite(id) {
  if (!SATELLITES[id]) return;
  if (state.satellite === id) return;
  updateState({ satellite: id }); // recálculo de tudo via render central
  flashRecalc();                  // feedback visual de que tudo foi recalculado
}

/** Pisca cards e tabela para sinalizar recálculo (após troca de satélite). */
function flashRecalc() {
  ['cardsGrid', 'bandTableBody'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('recalc-flash');
    void el.offsetWidth;          // força reflow p/ reiniciar a animação
    el.classList.add('recalc-flash');
  });
}

/** Render central registrado no estado. */
function render(s) {
  renderChart(s);
  const data = getStatsData(s);
  renderInfo(data);
  renderTable(s);
  renderCards(s);
  renderLegend(s);
  // sincroniza o seletor de satélite e o painel de info
  markActiveSatellite(s.satellite);
  renderSatInfo(s);
}

/* ---- Inicialização ------------------------------------------------------- */
function init() {
  // cor padrão da curva individual vem do CSS (fonte única de cor de tema)
  updateState({ singleColor: cssVar('--accent') }, { render: false });

  setRenderer(render);
  initModal();
  initCreditsModal();
  document.getElementById('btnCreditos').addEventListener('click', openCreditsModal);
  buildSatelliteSelector();
  buildPresets();
  buildSpectrumBar();
  buildAxisLabels();
  initSpectrumProbe();
  initCanvasInteractions();

  document.getElementById('btnSingle').addEventListener('click', () => setMode('single'));
  document.getElementById('btnOverlay').addEventListener('click', () => setMode('overlay'));

  window.addEventListener('resize', debounce(buildSpectrumBar, 100));

  loadPreset('floresta_nativa'); // primeira renderização
}

init();
