/* modal.js — modal explicativo único, reaproveitado por todos os cards.
 * O template é fixo (innerHTML permitido); todo conteúdo dinâmico entra
 * via textContent. Inclui foco gerenciado, Esc, clique-fora e armadilha
 * de foco enquanto aberto. Depende de indices.js (indexFormula/compositeFormula). */

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

let _modalEl = null;       // .modal-overlay
let _prevFocus = null;     // elemento que tinha foco antes de abrir
let _closeTimer = null;

/** Monta o esqueleto fixo do modal uma única vez e liga os listeners globais. */
function initModal() {
  if (_modalEl) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'cardModal';
  overlay.setAttribute('hidden', '');
  // Template FIXO (sem dados do usuário) — innerHTML permitido aqui.
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1">
      <button type="button" class="modal-close" aria-label="Fechar">×</button>
      <h2 id="modalTitle" class="modal-title"></h2>
      <p class="modal-subtitle"></p>
      <div class="modal-block">
        <span class="modal-label">O que é</span>
        <p class="modal-text" data-field="whatIs"></p>
      </div>
      <div class="modal-block">
        <span class="modal-label">Para que serve</span>
        <p class="modal-text" data-field="useFor"></p>
      </div>
      <div class="modal-block">
        <span class="modal-label">Fórmula <span class="modal-sat" data-field="sat"></span></span>
        <p class="modal-formula" data-field="formula"></p>
      </div>
      <div class="modal-block" data-block="extra">
        <span class="modal-label" data-field="extraLabel"></span>
        <p class="modal-text" data-field="extra"></p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  _modalEl = overlay;

  overlay.querySelector('.modal-close').addEventListener('click', closeModal);
  // Clique fora da caixa fecha
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
  // Esc e armadilha de foco
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') trapFocus(_modalEl, e);
  });
}

/** Mantém o Tab/Shift+Tab dentro de `modalEl` enquanto aberto. */
function trapFocus(modalEl, e) {
  const items = modalEl.querySelectorAll(FOCUSABLE);
  if (!items.length) { e.preventDefault(); return; }
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Liga os comportamentos de modal (fechar por ×, clique-fora, Esc, foco e
 * armadilha de foco) a um overlay ESTÁTICO já presente no HTML.
 * Reusa a mesma lógica do modal dos cards. Retorna { open, close }.
 */
function attachModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return { open() {}, close() {} };
  let prevFocus = null;
  let timer = null;

  const open = () => {
    clearTimeout(timer);
    prevFocus = document.activeElement;
    overlay.removeAttribute('hidden');
    void overlay.offsetWidth; // reflow p/ a transição rodar
    overlay.classList.add('is-open');
    (overlay.querySelector('.modal-close') || overlay.querySelector('.modal') || overlay).focus();
  };
  const close = () => {
    if (overlay.hasAttribute('hidden')) return;
    overlay.classList.remove('is-open');
    timer = setTimeout(() => overlay.setAttribute('hidden', ''), 200);
    if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    prevFocus = null;
  };

  overlay.querySelector('.modal-close')?.addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') trapFocus(overlay, e);
  });
  return { open, close };
}

/* Modal de créditos (overlay estático #modal-creditos). */
let _creditsModal = null;
function initCreditsModal() {
  if (!_creditsModal) _creditsModal = attachModal('modal-creditos');
}
function openCreditsModal() {
  initCreditsModal();
  _creditsModal.open();
}

/**
 * Abre o modal para um card.
 * @param {object} def   definição do card (INDEX_CARDS/COMPOSITE_CARDS)
 * @param {string} sat   satélite ativo no clique ('S2'|'L8')
 * @param {'index'|'composite'} kind
 */
function openCardModal(def, sat, kind) {
  initModal();
  clearTimeout(_closeTimer);

  const q = (sel) => _modalEl.querySelector(sel);
  q('.modal-title').textContent = def.title;
  q('.modal-subtitle').textContent = def.subtitle;
  q('[data-field="whatIs"]').textContent = def.whatIs;
  q('[data-field="useFor"]').textContent = def.useFor;
  q('[data-field="sat"]').textContent = `(${SATELLITES[sat].name})`;
  q('[data-field="formula"]').textContent =
    kind === 'index' ? indexFormula(sat, def) : compositeFormula(sat, def);

  // Bloco extra: "Faixa de valores" (índice) ou "Interpretação" (composição)
  const extraBlock = q('[data-block="extra"]');
  const extraText = kind === 'index' ? def.range : def.interpretation;
  if (extraText) {
    q('[data-field="extraLabel"]').textContent =
      kind === 'index' ? 'Faixa de valores' : 'Interpretação';
    q('[data-field="extra"]').textContent = extraText;
    extraBlock.classList.remove('is-hidden');
  } else {
    extraBlock.classList.add('is-hidden');
  }

  _prevFocus = document.activeElement;
  _modalEl.removeAttribute('hidden');
  // força reflow antes de adicionar a classe para a transição rodar
  void _modalEl.offsetWidth;
  _modalEl.classList.add('is-open');
  q('.modal-close').focus();
}

function closeModal() {
  if (!_modalEl || _modalEl.hasAttribute('hidden')) return;
  _modalEl.classList.remove('is-open');
  _closeTimer = setTimeout(() => _modalEl.setAttribute('hidden', ''), 200);
  if (_prevFocus && typeof _prevFocus.focus === 'function') _prevFocus.focus();
  _prevFocus = null;
}
