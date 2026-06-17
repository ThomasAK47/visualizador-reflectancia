/* state.js — fonte única de verdade da aplicação.
 * Nada muta `state` diretamente: tudo passa por `updateState()`, que
 * (opcionalmente) dispara o render registrado. */

const state = {
  mode: 'single',                 // 'single' | 'overlay'
  satellite: 'S2',                // 'S2' (Sentinel-2) | 'L8' (Landsat 8)
  activePreset: 'floresta_nativa', // preset selecionado no modo individual
  currentData: [],                // refletâncias da curva ativa (modo individual)
  singleColor: null,              // cor da linha individual (definida via CSS var na init)
  singleLabel: 'Refletância',     // rótulo da curva individual
  overlayActive: {},              // key -> { data: number[], color: string }
  overlayColorIdx: 0,             // próximo índice da paleta OVERLAY_COLORS
  isDrawing: false,               // arraste ativo no canvas
};

/** Render registrado pela camada de UI; recebe o `state` atual. */
let _renderer = null;
function setRenderer(fn) {
  _renderer = fn;
}

/**
 * Aplica `patch` ao estado e, salvo `render: false`, dispara o render.
 * É o ÚNICO ponto que muta `state`.
 * @param {object} patch  campos a sobrescrever
 * @param {{render?: boolean}} [opts]
 */
function updateState(patch, opts = {}) {
  const shouldRender = opts.render !== false;
  Object.assign(state, patch);
  if (shouldRender && typeof _renderer === 'function') _renderer(state);
}
