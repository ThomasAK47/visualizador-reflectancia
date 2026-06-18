/* presets.js — definição declarativa das assinaturas espectrais.
 * Cada preset é descrito por uma LISTA DE TERMOS compostos; não há
 * lógica duplicada — todos passam pelo mesmo avaliador `spectrumAt`. */

const WL_MIN = 400;
const WL_MAX = 2500;
const WL_STEP = 5;

const wavelengths = [];
for (let w = WL_MIN; w <= WL_MAX; w += WL_STEP) wavelengths.push(w);
const N = wavelengths.length;

/* ---- Avaliador de termos --------------------------------------------------
 * Tipos suportados:
 *   const     → valor fixo
 *   gauss      → amp * gauss(w, center, sigma)
 *   sigmoid    → amp * sigmoid(w, center, k)
 *   powerBase  → offset + amp * ((w - WL_MIN) / (WL_MAX - WL_MIN))^exp
 *   plateau    → dentro de [lo, hi]: amp * gauss(w, center, sigma); fora: 0
 *   swirSlope  → se w > start: amp * (1 - ((w - start) / span)^exp); senão 0
 * --------------------------------------------------------------------------*/
function evalTerm(term, w) {
  switch (term.type) {
    case 'const':
      return term.value;
    case 'gauss':
      return term.amp * gauss(w, term.center, term.sigma);
    case 'sigmoid':
      return term.amp * sigmoid(w, term.center, term.k);
    case 'powerBase':
      return term.offset + term.amp * Math.pow((w - WL_MIN) / (WL_MAX - WL_MIN), term.exp);
    case 'plateau':
      return (w >= term.lo && w <= term.hi)
        ? term.amp * gauss(w, term.center, term.sigma)
        : 0;
    case 'swirSlope':
      return (w > term.start)
        ? term.amp * (1 - Math.pow((w - term.start) / term.span, term.exp))
        : 0;
    default:
      return 0;
  }
}

/** Refletância (0–1) de um preset num comprimento de onda. */
function spectrumAt(preset, w) {
  let sum = 0;
  for (const term of preset.terms) sum += evalTerm(term, w);
  return clamp(sum);
}

/** Gera o array de refletâncias do preset ao longo de `wavelengths`. */
function buildPresetData(preset) {
  return wavelengths.map(w => spectrumAt(preset, w));
}

/* Atalhos para deixar as definições abaixo legíveis. */
const g = (amp, center, sigma) => ({ type: 'gauss', amp, center, sigma });
const sig = (amp, center, k) => ({ type: 'sigmoid', amp, center, k });
const k = (value) => ({ type: 'const', value });
const pbase = (offset, amp, exp) => ({ type: 'powerBase', offset, amp, exp });
const plat = (amp, center, sigma, lo, hi) => ({ type: 'plateau', amp, center, sigma, lo, hi });
const swir = (amp, start, span, exp) => ({ type: 'swirSlope', amp, start, span, exp });

/** Lista declarativa de presets (ordem = ordem de exibição). */
const PRESETS = [
  {
    key: 'agua_limpa', label: 'Água limpa', color: '#1e88e5',
    terms: [g(0.07, 470, 40), g(0.04, 540, 50), k(0.01)],
  },
  {
    key: 'agua_turva', label: 'Água turva', color: '#4dd0e1',
    terms: [g(0.10, 480, 50), g(0.12, 570, 60), g(0.08, 650, 60),
            plat(0.03, 730, 30, 725, Infinity), k(0.02)],
  },
  {
    key: 'solo_seco', label: 'Solo seco', color: '#d4a35a',
    terms: [pbase(0.12, 0.30, 0.8), g(-0.08, 1400, 40), g(-0.12, 1900, 50), g(-0.15, 2200, 60)],
  },
  {
    key: 'solo_umido', label: 'Solo úmido', color: '#6d4c41',
    terms: [pbase(0.05, 0.12, 0.9), g(-0.06, 1400, 40), g(-0.09, 1900, 50), g(-0.12, 2200, 60)],
  },
  {
    key: 'floresta_nativa', label: 'Floresta nativa', color: '#2e7d32',
    terms: [k(0.03), g(-0.12, 450, 30), g(-0.15, 670, 25), g(0.10, 540, 35),
            sig(0.35, 715, 0.15), plat(0.45, 900, 250, 730, 1300),
            swir(0.25, 1300, 1200, 0.6),
            g(-0.08, 1400, 50), g(-0.10, 1900, 60), g(-0.12, 2200, 70)],
  },
  {
    key: 'floresta_plantada', label: 'Floresta plantada', color: '#388e3c',
    terms: [k(0.04), g(-0.09, 450, 30), g(-0.12, 670, 25), g(0.12, 545, 35),
            sig(0.28, 720, 0.12), plat(0.38, 900, 250, 730, 1300),
            swir(0.22, 1300, 1200, 0.6),
            g(-0.06, 1400, 50), g(-0.08, 1900, 60), g(-0.10, 2200, 70)],
  },
  {
    key: 'campo', label: 'Campo / pastagem', color: '#7cb342',
    terms: [k(0.04), g(-0.05, 450, 30), g(-0.07, 670, 25), g(0.14, 548, 40),
            sig(0.22, 720, 0.10), plat(0.32, 880, 230, 730, 1300),
            swir(0.20, 1300, 1200, 0.6),
            g(-0.04, 1400, 50), g(-0.05, 1900, 55), g(-0.08, 2200, 65)],
  },
  {
    key: 'agricultura', label: 'Agricultura (cultivo ativo)', color: '#9ccc65',
    terms: [k(0.04), g(-0.06, 450, 30), g(-0.09, 670, 25), g(0.16, 545, 40),
            sig(0.30, 718, 0.13), plat(0.40, 870, 240, 730, 1300),
            swir(0.18, 1300, 1200, 0.6),
            g(-0.05, 1400, 50), g(-0.07, 1900, 60), g(-0.09, 2200, 65)],
  },
];

/** Acesso rápido por chave. */
const PRESET_BY_KEY = Object.fromEntries(PRESETS.map(p => [p.key, p]));

/** Paleta para curvas sobrepostas (distingue presets parecidos). */
const OVERLAY_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
                        '#10b981', '#f97316', '#06b6d4', '#ec4899'];
