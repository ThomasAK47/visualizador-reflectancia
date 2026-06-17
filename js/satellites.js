/* satellites.js — definição dos sensores e amostragem de bandas.
 * Cada banda tem um comprimento de onda central; a refletância da banda é
 * a MÉDIA da curva dentro de ±BAND_HALFWIDTH nm desse centro. */

const BAND_HALFWIDTH = 20; // janela de amostragem: ±20 nm

const SATELLITES = {
  S2: {
    label: 'Sentinel-2',
    bands: {
      B2:  { num: 'B2',  name: 'Blue',  wl: 490 },
      B3:  { num: 'B3',  name: 'Green', wl: 560 },
      B4:  { num: 'B4',  name: 'Red',   wl: 665 },
      B8:  { num: 'B8',  name: 'NIR',   wl: 842 },
      B8A: { num: 'B8A', name: 'NIR',   wl: 865 },
      B11: { num: 'B11', name: 'SWIR1', wl: 1610 },
      B12: { num: 'B12', name: 'SWIR2', wl: 2190 },
    },
  },
  L8: {
    label: 'Landsat 8',
    bands: {
      B2: { num: 'B2', name: 'Blue',  wl: 482 },
      B3: { num: 'B3', name: 'Green', wl: 562 },
      B4: { num: 'B4', name: 'Red',   wl: 655 },
      B5: { num: 'B5', name: 'NIR',   wl: 865 },
      B6: { num: 'B6', name: 'SWIR1', wl: 1609 },
      B7: { num: 'B7', name: 'SWIR2', wl: 2201 },
    },
  },
};

/** Comprimento de onda central de uma banda do satélite ativo. */
function bandWl(satKey, bandKey) {
  return SATELLITES[satKey].bands[bandKey].wl;
}

/**
 * Refletância média da curva dentro de ±BAND_HALFWIDTH nm de `centerWl`.
 * Retorna `null` se NENHUM ponto da curva cair na janela
 * (banda fora do intervalo espectral coberto).
 * @param {number[]} data  refletâncias alinhadas a `wavelengths`
 */
function sampleBand(data, centerWl) {
  const lo = centerWl - BAND_HALFWIDTH;
  const hi = centerWl + BAND_HALFWIDTH;
  let sum = 0, n = 0;
  for (let i = 0; i < wavelengths.length; i++) {
    const wl = wavelengths[i];
    if (wl >= lo && wl <= hi) { sum += data[i]; n++; }
  }
  return n === 0 ? null : sum / n;
}
