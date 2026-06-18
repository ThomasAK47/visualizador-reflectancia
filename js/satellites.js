/* satellites.js — configuração dos sensores.
 * Cada satélite traz metadados, suas bandas (com `role`) e as composições RGB.
 * Os índices referenciam PAPÉIS (role: nir, red, green, swir1, swir2…), então
 * uma única função de cálculo serve a todos e um índice some sozinho quando o
 * sensor não tem a banda necessária. */

const BAND_HALFWIDTH = 20; // janela de amostragem: ±20 nm

/* Cor do chip da tabela por papel de banda (consistente entre satélites). */
const ROLE_COLOR = {
  blue: '#3b82f6', green: '#22c55e', red: '#ef4444',
  nir: '#8b5cf6', nir2: '#a855f7', swir1: '#a16207', swir2: '#78350f',
};
const b = (num, name, role, wl) => ({ num, name, role, wl, color: ROLE_COLOR[role] });

const SATELLITES = {
  S2: {
    id: 'S2', name: 'Sentinel-2', shortName: 'S2',
    agency: 'ESA (Copernicus)', resolution: '10–20 m', period: '2015 – presente',
    imagePath: 'assets/satellites/sentinel2.jpg',
    note: 'Programa Copernicus da ESA. Revisita de ~5 dias e 13 bandas espectrais. Dados gratuitos via Copernicus Data Space.',
    bands: {
      B2: b('B2', 'Blue', 'blue', 490),
      B3: b('B3', 'Green', 'green', 560),
      B4: b('B4', 'Red', 'red', 665),
      B8: b('B8', 'NIR', 'nir', 842),
      B8A: b('B8A', 'NIR-Estreito', 'nir2', 865),
      B11: b('B11', 'SWIR1', 'swir1', 1610),
      B12: b('B12', 'SWIR2', 'swir2', 2190),
    },
    compositions: {
      true: { bands: ['B4', 'B3', 'B2'] },
      falsecolor: { bands: ['B8', 'B4', 'B3'] },
      swir: { bands: ['B11', 'B8', 'B3'] },
      agri: { bands: ['B11', 'B8A', 'B2'] },
    },
  },

  L8: {
    id: 'L8', name: 'Landsat 8', shortName: 'L8',
    agency: 'NASA / USGS', resolution: '30 m', period: '2013 – presente',
    imagePath: 'assets/satellites/landsat8.jpg',
    note: 'Operado por NASA/USGS desde 2013. Referência para análises globais. Dados no USGS Earth Explorer.',
    bands: {
      B2: b('B2', 'Blue', 'blue', 482),
      B3: b('B3', 'Green', 'green', 562),
      B4: b('B4', 'Red', 'red', 655),
      B5: b('B5', 'NIR', 'nir', 865),
      B6: b('B6', 'SWIR1', 'swir1', 1609),
      B7: b('B7', 'SWIR2', 'swir2', 2201),
    },
    compositions: {
      true: { bands: ['B4', 'B3', 'B2'] },
      falsecolor: { bands: ['B5', 'B4', 'B3'] },
      swir: { bands: ['B6', 'B5', 'B3'] },
      agri: { bands: ['B6', 'B5', 'B2'] },
    },
  },

  L9: {
    id: 'L9', name: 'Landsat 9', shortName: 'L9',
    agency: 'NASA / USGS', resolution: '30 m', period: '2021 – presente',
    imagePath: 'assets/satellites/landsat9.jpg',
    note: 'Sucessor direto do Landsat 8. Bandas equivalentes, calibração aprimorada. Dados disponíveis no USGS Earth Explorer.',
    bands: {
      B2: b('B2', 'Blue', 'blue', 482),
      B3: b('B3', 'Green', 'green', 562),
      B4: b('B4', 'Red', 'red', 655),
      B5: b('B5', 'NIR', 'nir', 865),
      B6: b('B6', 'SWIR1', 'swir1', 1609),
      B7: b('B7', 'SWIR2', 'swir2', 2201),
    },
    compositions: {
      true: { bands: ['B4', 'B3', 'B2'] },
      falsecolor: { bands: ['B5', 'B4', 'B3'] },
      swir: { bands: ['B6', 'B5', 'B3'] },
      agri: { bands: ['B6', 'B5', 'B2'] },
    },
  },

  L5: {
    id: 'L5', name: 'Landsat 5 (TM)', shortName: 'L5',
    agency: 'NASA / USGS', resolution: '30 m', period: '1984 – 2013',
    imagePath: 'assets/satellites/landsat5.jpg',
    note: 'Sensor histórico de referência. Base para comparações temporais de longo prazo. Arquivo completo disponível no USGS.',
    bands: { // B6 (termal) é ignorado nos cálculos ópticos
      B1: b('B1', 'Blue', 'blue', 485),
      B2: b('B2', 'Green', 'green', 560),
      B3: b('B3', 'Red', 'red', 660),
      B4: b('B4', 'NIR', 'nir', 830),
      B5: b('B5', 'SWIR1', 'swir1', 1650),
      B7: b('B7', 'SWIR2', 'swir2', 2215),
    },
    compositions: {
      true: { bands: ['B3', 'B2', 'B1'], subtitle: 'RGB 321' },
      falsecolor: { bands: ['B4', 'B5', 'B3'], subtitle: 'Vegetação · RGB 453' },
      swir: { bands: ['B5', 'B4', 'B3'], subtitle: 'RGB 543' },
      agri: { bands: ['B7', 'B5', 'B3'], title: 'Composição Geológica', subtitle: 'RGB 753' },
    },
  },

  MODIS: {
    id: 'MODIS', name: 'MODIS (Terra/Aqua)', shortName: 'MODIS',
    agency: 'NASA', resolution: '250–500 m', period: '1999 – presente',
    imagePath: 'assets/satellites/modis.jpg',
    note: 'Resolução espacial baixa, mas revisita diária global. Ideal para monitoramento de grandes áreas e séries temporais longas.',
    bands: {
      B3: b('B3', 'Blue', 'blue', 469),
      B4: b('B4', 'Green', 'green', 555),
      B1: b('B1', 'Red', 'red', 645),
      B2: b('B2', 'NIR', 'nir', 858),
      B6: b('B6', 'SWIR1', 'swir1', 1640),
      B7: b('B7', 'SWIR2', 'swir2', 2130),
    },
    compositions: {
      true: { bands: ['B1', 'B4', 'B3'] },
      falsecolor: { bands: ['B2', 'B1', 'B4'] },
      swir: { bands: ['B6', 'B2', 'B4'] },
      agri: null, // MODIS não tem composição agrícola padrão aqui
    },
  },

  CBERS4A: {
    id: 'CBERS4A', name: 'CBERS-4A (WFI)', shortName: 'CB-4A',
    agency: 'INPE / CAST', resolution: '55 m', period: '2019 – presente',
    imagePath: 'assets/satellites/cbers4a.jpg',
    note: 'Satélite sino-brasileiro operado pelo INPE. Dados gratuitos via catálogo.cbers.inpe.br. Cobertura prioritária do território brasileiro.',
    bands: { // sensor WFI não possui bandas SWIR
      B13: b('B13', 'Blue', 'blue', 485),
      B14: b('B14', 'Green', 'green', 555),
      B15: b('B15', 'Red', 'red', 660),
      B16: b('B16', 'NIR', 'nir', 830),
    },
    compositions: {
      true: { bands: ['B15', 'B14', 'B13'] },
      falsecolor: { bands: ['B16', 'B15', 'B14'] },
      swir: null, // sem SWIR → indisponível
      agri: null,
    },
  },
};

/** Ordem de exibição no seletor. */
const SATELLITE_ORDER = ['S2', 'L8', 'L9', 'L5', 'MODIS', 'CBERS4A'];

/** Banda (objeto) de um satélite pelo seu papel; null se não existir. */
function bandByRole(satKey, role) {
  const bands = SATELLITES[satKey].bands;
  for (const k in bands) if (bands[k].role === role) return bands[k];
  return null;
}

/** Banda (objeto) de um satélite pelo id (ex.: 'B8'); null se não existir. */
function bandById(satKey, id) {
  return SATELLITES[satKey].bands[id] || null;
}

/**
 * Refletância média da curva dentro de ±BAND_HALFWIDTH nm de `centerWl`.
 * Retorna `null` se NENHUM ponto da curva cair na janela.
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
