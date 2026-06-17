/* utils.js — funções puras, sem dependências de DOM ou estado */

/** Curva gaussiana centrada em `center` com largura `sigma`. */
function gauss(w, center, sigma) {
  return Math.exp(-Math.pow(w - center, 2) / (2 * sigma * sigma));
}

/** Sigmoide centrada em `center` com inclinação `k`. */
function sigmoid(w, center, k) {
  return 1 / (1 + Math.exp(-k * (w - center)));
}

/** Restringe `v` ao intervalo [lo, hi]. */
function clamp(v, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Aproxima o RGB visível (0–1) de um comprimento de onda em nm.
 * Baseado no mapeamento clássico de Dan Bruton (380–700 nm).
 */
function wlToRgbVisible(wl) {
  let r = 0, g = 0, b = 0;
  if (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); b = 1; }
  else if (wl >= 440 && wl < 490) { g = (wl - 440) / (490 - 440); b = 1; }
  else if (wl >= 490 && wl < 510) { g = 1; b = -(wl - 510) / (510 - 490); }
  else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1; }
  else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / (645 - 580); }
  else if (wl >= 645 && wl <= 700) { r = 1; }
  return { r, g, b };
}

/**
 * Integra a refletância na faixa visível ponderada pela cor de cada
 * comprimento de onda, devolvendo um RGB 0–255 aproximado.
 * @param {number[]} data    refletâncias
 * @param {number[]} wavelengths comprimentos de onda correspondentes
 */
function computeColor(data, wavelengths) {
  let r = 0, g = 0, b = 0, wt = 0;
  data.forEach((val, i) => {
    const wl = wavelengths[i];
    if (wl > 700) return;
    const c = wlToRgbVisible(wl);
    r += c.r * val;
    g += c.g * val;
    b += c.b * val;
    wt++;
  });
  // Guard clause: evita divisão por zero se nenhuma banda visível for somada.
  if (wt === 0) return { r: 0, g: 0, b: 0 };
  const scale = 2.8;
  return {
    r: Math.min(255, Math.round((r / wt) * 255 * scale)),
    g: Math.min(255, Math.round((g / wt) * 255 * scale)),
    b: Math.min(255, Math.round((b / wt) * 255 * scale)),
  };
}

/** Retorna uma versão de `fn` que só dispara após `wait` ms de silêncio. */
function debounce(fn, wait = 100) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Lê uma variável CSS do :root (ex.: '--accent') já com trim. */
function cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
