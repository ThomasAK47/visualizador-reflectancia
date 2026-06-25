/**
 * <spectral-icon> — ícone animado de reflectância espectral.
 * Sol distante emite uma onda senoidal por vez; ao chegar na Terra,
 * uma nova onda parte rumo ao satélite. Cada ciclo usa uma das 5 cores
 * do espectro (vermelho, amarelo, verde, azul, violeta).
 *
 * Uso:
 *   <script src="spectral-icon.js"></script>
 *   <spectral-icon></spectral-icon>
 *   <spectral-icon size="48"></spectral-icon>
 *
 * Tudo encapsulado em Shadow DOM — sem conflito de CSS/ID com o site.
 * Respeita prefers-reduced-motion automaticamente.
 */
(function () {
  if (customElements.get('spectral-icon')) return;

  const COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];

  class SpectralIcon extends HTMLElement {
    connectedCallback() {
      const size = parseInt(this.getAttribute('size') || '56', 10);
      const root = this.attachShadow({ mode: 'open' });

      root.innerHTML = `
        <style>
          :host { display:inline-block; line-height:0; vertical-align:middle; }
          svg { display:block; }
          .star  { animation: twinkle 3s ease-in-out infinite; }
          .sunglow { transform-box:fill-box; transform-origin:center;
                     animation: sun 2.4s ease-in-out infinite; }
          @keyframes twinkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
          @keyframes sun { 0%,100%{transform:scale(.85);opacity:.12} 50%{transform:scale(1.15);opacity:.4} }
          @media (prefers-reduced-motion: reduce) {
            .star,.sunglow { animation:none; }
            .sunglow { opacity:0; }
          }
        </style>
        <svg width="${size}" height="${size}" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reflectância espectral">
          <g fill="#cfd8ff">
            <circle class="star" cx="22" cy="6"  r=".7" style="animation-delay:.6s"/>
            <circle class="star" cx="50" cy="32" r="1"  style="animation-delay:1.1s"/>
            <circle class="star" cx="46" cy="50" r=".7" style="animation-delay:.3s"/>
            <circle class="star" cx="6"  cy="30" r=".8" style="animation-delay:1.6s"/>
            <circle class="star" cx="4"  cy="46" r="1"  style="animation-delay:.9s"/>
            <circle class="star" cx="53" cy="12" r=".7" style="animation-delay:2s"/>
            <circle class="star" cx="16" cy="52" r=".8" style="animation-delay:1.3s"/>
            <circle class="star" cx="37" cy="53" r=".6" style="animation-delay:.5s"/>
            <circle class="star" cx="2"  cy="18" r=".7" style="animation-delay:1.8s"/>
          </g>
          <path class="legA" fill="none" stroke-width="1.8" stroke-linecap="round"/>
          <path class="legB" fill="none" stroke-width="1.8" stroke-linecap="round"/>
          <circle class="sunglow" cx="10" cy="11" r="4" fill="#ff8c00" opacity=".16"/>
          <circle cx="10" cy="11" r="2.4" fill="#ffa726"/>
          <circle cx="9.1" cy="10.1" r="1" fill="#ffe0b2" opacity=".9"/>
          <circle cx="29" cy="43" r="7" fill="#1e5fa8"/>
          <ellipse cx="26.5" cy="40.5" rx="3.4" ry="3" fill="#3d82d4" opacity=".8"/>
          <circle cx="29" cy="43" r="7" fill="none" stroke="#64b5f6" stroke-width=".8" opacity=".4"/>
          <g transform="translate(43,15) rotate(22)">
            <rect x="-5" y="-4" width="10" height="8" rx="1.4" fill="#aab4bd"/>
            <rect x="-3" y="-2" width="6" height="4" rx=".6" fill="#5e7d96"/>
            <rect x="-14" y="-1.8" width="7.5" height="3.6" rx=".7" fill="#1565c0"/>
            <line x1="-10.2" y1="-1.8" x2="-10.2" y2="1.8" stroke="#0d47a1" stroke-width=".5"/>
            <rect x="6.5" y="-1.8" width="7.5" height="3.6" rx=".7" fill="#1565c0"/>
            <line x1="10.2" y1="-1.8" x2="10.2" y2="1.8" stroke="#0d47a1" stroke-width=".5"/>
          </g>
        </svg>`;

      this._init(root);
    }

    _init(root) {
      const sine = (x1, y1, x2, y2, amp, waves) => {
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
        const px = -dy / len, py = dx / len, steps = Math.max(16, Math.round(len * 1.8));
        let d = '';
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, off = amp * Math.sin(t * waves * Math.PI * 2);
          const x = x1 + dx * t + px * off, y = y1 + dy * t + py * off;
          d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
        }
        return d;
      };

      const A = root.querySelector('.legA');
      const B = root.querySelector('.legB');
      A.setAttribute('d', sine(12, 14, 28, 42, 1.5, 2.5));
      B.setAttribute('d', sine(30, 42, 41, 19, 1.5, 2.5));

      const D = 10;
      const LA = A.getTotalLength(), LB = B.getTotalLength();
      A.style.strokeDasharray = D + ' ' + (LA * 3);
      B.style.strokeDasharray = D + ' ' + (LB * 3);
      const arriveA = -(LA - D / 2), exitA = -(LA + D);
      const arriveB = -(LB - D / 2), exitB = -(LB + D);
      A.style.strokeDashoffset = exitA;
      B.style.strokeDashoffset = exitB;

      const reduce = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !A.animate) {
        A.style.stroke = COLORS[2];
        A.style.strokeDashoffset = arriveA;
        B.style.stroke = COLORS[2];
        return;
      }

      let idx = 0;
      const cycle = () => {
        if (!this.isConnected) return;
        const color = COLORS[idx];
        idx = (idx + 1) % COLORS.length;
        A.style.stroke = color;
        B.style.stroke = color;
        B.style.strokeDashoffset = exitB;
        const a = A.animate(
          [{ strokeDashoffset: 0 }, { strokeDashoffset: arriveA }],
          { duration: 383, easing: 'ease-in' }
        );
        a.onfinish = () => {
          A.style.strokeDashoffset = exitA;
          const b = B.animate(
            [{ strokeDashoffset: 0 }, { strokeDashoffset: arriveB }],
            { duration: 383, easing: 'ease-out' }
          );
          b.onfinish = () => {
            B.style.strokeDashoffset = exitB;
            setTimeout(cycle, 133);
          };
        };
      };
      cycle();
    }
  }

  customElements.define('spectral-icon', SpectralIcon);
})();
