/* canvas.js — barra de espectro e desenho à mão livre sobre o gráfico.
 * Depende de `chart` (criado em chart.js) e do estado central.
 * As funções de interação são ativadas por `initCanvasInteractions()`,
 * chamada pela UI somente após o gráfico existir. */

/** Desenha a barra de gradiente espectral sob o gráfico. */
function buildSpectrumBar() {
  const canvas = document.getElementById('specBar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.offsetWidth;
  const cssH = 14;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reseta + escala (evita acúmulo entre resizes)

  for (let x = 0; x < cssW; x++) {
    const wl = WL_MIN + (WL_MAX - WL_MIN) * (x / cssW);
    let r, g, b, a;
    if (wl < 380) {
      r = 80; g = 0; b = 120; a = 0.3 + (wl - 300) / 80 * 0.5;
    } else if (wl <= 700) {
      const c = wlToRgbVisible(wl);
      let fade = 1;
      if (wl < 420) fade = (wl - 380) / 40;
      if (wl > 680) fade = 1 - (wl - 680) / 20;
      r = c.r * 255; g = c.g * 255; b = c.b * 255; a = fade;
    } else if (wl <= 1000) {
      const t = (wl - 700) / 300;
      r = 180 - 100 * t; g = 0; b = 0; a = 0.5 - 0.4 * t;
    } else {
      r = 40; g = 40; b = 40; a = 0.25;
    }
    ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`;
    ctx.fillRect(x, 0, 1, cssH);
  }
}

/** Rótulos do eixo da barra, posicionados na % linear real (batem com o gráfico). */
function buildAxisLabels() {
  const box = document.getElementById('axisLabels');
  if (!box) return;
  box.replaceChildren();
  const ticks = [400, 700, 1000, 1300, 1600, 1900, 2200, 2500];
  ticks.forEach(wl => {
    const span = document.createElement('span');
    span.className = 'axis-tick';
    span.textContent = wl;
    span.style.left = ((wl - WL_MIN) / (WL_MAX - WL_MIN) * 100).toFixed(2) + '%';
    box.appendChild(span);
  });
}

/** Sonda interativa: hover na barra → linha-guia no gráfico + readout (nm, cor, refletância). */
function initSpectrumProbe() {
  const canvas = document.getElementById('specBar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const readout = document.getElementById('specReadout');
  const labels = document.getElementById('axisLabels');
  const sw = document.getElementById('specSw');
  const txt = document.getElementById('specReadoutText');

  const move = (e) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const wl = Math.round(WL_MIN + (WL_MAX - WL_MIN) * (x / rect.width));

    // cor exata sob o cursor: lê o pixel da própria barra
    const dpr = window.devicePixelRatio || 1;
    const px = ctx.getImageData(
      Math.min(canvas.width - 1, Math.round(x * dpr)),
      Math.round(canvas.height / 2), 1, 1).data;

    const refl = curveValueAt(getStatsData(state), wl);
    sw.style.background = `rgb(${px[0]},${px[1]},${px[2]})`;
    txt.textContent = `λ ${wl} nm` + (refl != null ? ` · ${refl.toFixed(3)}` : '');
    readout.style.left = x + 'px';
    readout.classList.remove('is-hidden');
    labels.classList.add('is-hidden');

    setBandMarkers([{ x: wl, label: '', value: refl, color: cssVar('--ac') }]);
  };
  const leave = () => {
    readout.classList.add('is-hidden');
    labels.classList.remove('is-hidden');
    setBandMarkers([]);
  };

  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseleave', leave);
}

/** Converte um evento de mouse/touch em { wlVal, rVal } no espaço de dados. */
function getChartPoint(e) {
  const rect = chart.canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return {
    wlVal: chart.scales.x.getValueForPixel(x),
    rVal: chart.scales.y.getValueForPixel(y),
  };
}

/** Aplica um "pincel" gaussiano à curva no ponto desenhado e re-renderiza. */
function applyDraw(wlVal, rVal) {
  const idx = Math.round((wlVal - WL_MIN) / WL_STEP);
  const target = clamp(rVal);
  const radius = 8;
  const next = state.currentData.slice();
  for (let di = -radius; di <= radius; di++) {
    const i = idx + di;
    if (i < 0 || i >= N) continue;
    const falloff = 1 - Math.abs(di) / (radius + 1);
    next[i] = next[i] + (target - next[i]) * falloff * 0.6;
  }
  // Estado atualizado via função central; o render decorrente é leve
  // (sem animação) porque state.isDrawing está ativo.
  updateState({ currentData: next });
}

/** Liga os listeners de desenho ao canvas do gráfico (só no modo individual). */
function initCanvasInteractions() {
  const cv = chart.canvas;

  const startDraw = (e) => {
    if (state.mode !== 'single') return;
    updateState({ isDrawing: true }, { render: false });
    const p = getChartPoint(e);
    applyDraw(p.wlVal, p.rVal);
  };
  const moveDraw = (e, isTouch) => {
    if (!state.isDrawing || state.mode !== 'single') return;
    const p = getChartPoint(e);
    applyDraw(p.wlVal, p.rVal);
    if (isTouch) e.preventDefault();
  };
  const endDraw = () => {
    if (state.isDrawing) updateState({ isDrawing: false }, { render: false });
  };

  cv.addEventListener('mousedown', startDraw);
  cv.addEventListener('mousemove', (e) => moveDraw(e, false));
  window.addEventListener('mouseup', endDraw);

  cv.addEventListener('touchstart', startDraw, { passive: true });
  cv.addEventListener('touchmove', (e) => moveDraw(e, true), { passive: false });
  window.addEventListener('touchend', endDraw);
}
