/* indices.js — definições declarativas dos cards de índice e composição,
 * cálculos puros e escalas de cor. Depende de satellites.js e utils.js. */

/* ---- Cards de índice (diferença normalizada, valor em [-1, 1]) ----------- *
 * bands[sat] = [A, B]  →  índice = (A - B) / (A + B)                          */
const INDEX_CARDS = [
  {
    key: 'ndvi', title: 'NDVI', subtitle: 'Vegetação', scale: 'ndvi',
    bands: { S2: ['B8', 'B4'], L8: ['B5', 'B4'] },
    tooltip: 'Índice de Vegetação por Diferença Normalizada. Valores altos (verde) indicam vegetação vigorosa; baixos indicam solo, água ou área construída.',
    whatIs: 'Índice de Vegetação por Diferença Normalizada. Mede a densidade e vigor da vegetação com base na diferença entre reflexão no infravermelho próximo e no vermelho.',
    useFor: 'Monitoramento de cobertura vegetal, detecção de estresse hídrico em culturas, mapeamento de biomassa e saúde de florestas.',
    range: '−1 (água/solo nu) → 0 (solo exposto/rocha) → 1 (vegetação densa saudável)',
  },
  {
    key: 'ndwi', title: 'NDWI', subtitle: 'Água (McFeeters)', scale: 'water',
    bands: { S2: ['B3', 'B8'], L8: ['B3', 'B5'] },
    tooltip: 'Índice de Água por Diferença Normalizada (McFeeters, 1996). Realça corpos d’água; valores positivos (azul) indicam presença de água.',
    whatIs: 'Índice de Água por Diferença Normalizada (McFeeters, 1996). Realça corpos d’água usando a banda verde e o infravermelho próximo.',
    useFor: 'Mapeamento de lagos, rios e reservatórios; monitoramento de cheias e variação de espelhos d’água.',
    range: '< 0 (vegetação/solo) → ~0 (limiar água/terra) → > 0,2 (água)',
  },
  {
    key: 'mndwi', title: 'MNDWI', subtitle: 'Água modificado', scale: 'water',
    bands: { S2: ['B3', 'B11'], L8: ['B3', 'B6'] },
    tooltip: 'NDWI Modificado (Xu, 2006), usa SWIR no lugar do NIR. Separa melhor água de áreas urbanas e solo exposto.',
    whatIs: 'Índice de Água por Diferença Normalizada Modificado (Xu, 2006). Substitui o NIR pelo SWIR1, reduzindo interferência de vegetação e áreas urbanas.',
    useFor: 'Extração de corpos d’água em áreas urbanas ou com vegetação densa onde o NDWI clássico superestima a água.',
    range: '< 0 (solo/vegetação) → > 0 (água, com menos ruído que o NDWI)',
  },
];

/* ---- Cards de composição RGB (swatch de cor simulada) ------------------- *
 * bands[sat] = [R, G, B]  →  cada canal = sample / 0.8, clamp [0,1]          */
const COMPOSITE_CARDS = [
  {
    key: 'true', title: 'Cor Verdadeira', subtitle: 'True Color',
    bands: { S2: ['B4', 'B3', 'B2'], L8: ['B4', 'B3', 'B2'] },
    tooltip: 'Composição em cores naturais (R=Vermelho, G=Verde, B=Azul), como o olho humano enxerga.',
    whatIs: 'Composição que replica o que o olho humano enxerga, usando as bandas vermelho, verde e azul do sensor.',
    useFor: 'Interpretação visual intuitiva da paisagem, identificação de feições como estradas, edificações e corpos d’água.',
  },
  {
    key: 'falsecolor', title: 'Falsa Cor', subtitle: 'Vegetação · RGB 453',
    bands: { S2: ['B8', 'B4', 'B3'], L8: ['B5', 'B4', 'B3'] },
    tooltip: 'Falsa cor com NIR no vermelho. Vegetação sadia aparece em tons de vermelho/magenta intensos.',
    whatIs: 'Composição clássica de falsa cor que desloca as bandas para incluir o infravermelho próximo no canal vermelho. Equivale ao RGB 453 do sensor TM (Landsat 5) e ao RGB 543 do Landsat 8.',
    useFor: 'Discriminação de tipos de vegetação, detecção de áreas desmatadas e diferenciação entre vegetação nativa e cultivada.',
    interpretation: 'Vegetação saudável aparece em tons de vermelho intenso; solo exposto em marrom/bege; água em azul escuro.',
  },
  {
    key: 'swir', title: 'Composição SWIR', subtitle: 'SWIR / NIR / Verde',
    bands: { S2: ['B11', 'B8', 'B3'], L8: ['B6', 'B5', 'B3'] },
    tooltip: 'Realça umidade e tipos de solo/rocha usando o infravermelho de ondas curtas (SWIR).',
    whatIs: 'Composição que usa a banda SWIR1 no canal vermelho, realçando feições que o visível não distingue.',
    useFor: 'Mapeamento de umidade do solo, identificação de áreas queimadas, diferenciação de tipos de rocha e mineralogia de superfície.',
    interpretation: 'Áreas úmidas em azul escuro; queimadas em vermelho/laranja; solo seco em verde claro.',
  },
  {
    key: 'agri', title: 'Composição Agrícola', subtitle: 'SWIR / NIR / Azul',
    bands: { S2: ['B11', 'B8A', 'B2'], L8: ['B6', 'B5', 'B2'] },
    tooltip: 'Composição agrícola: distingue culturas, solo e estágios de crescimento.',
    whatIs: 'Composição que combina SWIR1, NIR estreito e azul para realce de atividade agrícola.',
    useFor: 'Distinção entre culturas em diferentes estágios fenológicos, mapeamento de áreas irrigadas e monitoramento de safra.',
    interpretation: 'Culturas ativas em verde brilhante; solo exposto em magenta; água em azul escuro.',
  },
];

/**
 * Calcula um índice de diferença normalizada para o satélite ativo.
 * Retorna `null` se alguma banda estiver fora do intervalo espectral.
 */
function computeIndex(data, satKey, def) {
  const [aKey, bKey] = def.bands[satKey];
  const a = sampleBand(data, bandWl(satKey, aKey));
  const b = sampleBand(data, bandWl(satKey, bKey));
  if (a === null || b === null) return null;
  const denom = a + b;
  return denom !== 0 ? (a - b) / denom : 0;
}

/**
 * Calcula o swatch RGB (0–255) de uma composição para o satélite ativo.
 * Cada canal é normalizado por 0.8 e clampeado em [0,1].
 * Retorna `null` se alguma banda estiver fora do intervalo espectral.
 */
function computeComposite(data, satKey, def) {
  const channel = (bandKey) => {
    const v = sampleBand(data, bandWl(satKey, bandKey));
    return v === null ? null : clamp(v / 0.8, 0, 1);
  };
  const [rKey, gKey, bKey] = def.bands[satKey];
  const r = channel(rKey), g = channel(gKey), b = channel(bKey);
  if (r === null || g === null || b === null) return null;
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** Rótulo de fórmula com os números de banda do satélite ativo. */
function indexFormula(satKey, def) {
  const [a, b] = def.bands[satKey];
  return `(${a}−${b}) / (${a}+${b})`;
}
function compositeFormula(satKey, def) {
  const [r, g, b] = def.bands[satKey];
  return `R=${r}  G=${g}  B=${b}`;
}

/* ---- Escalas de cor (interpolação linear entre paradas) ------------------ */
const SCALES = {
  // vermelho (-1) → amarelo (0) → verde escuro (+1)
  ndvi: { neg: [[215, 48, 39], [255, 255, 191]], pos: [[255, 255, 191], [26, 120, 50]] },
  // marrom (-1) → branco (0) → azul (+1)
  water: { neg: [[140, 81, 10], [245, 245, 245]], pos: [[245, 245, 245], [33, 102, 172]] },
};

function lerpChannel(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpRgb(c1, c2, t) {
  return { r: lerpChannel(c1[0], c2[0], t), g: lerpChannel(c1[1], c2[1], t), b: lerpChannel(c1[2], c2[2], t) };
}

/** Cor de uma escala divergente para um valor em [-1, 1]. */
function scaleColor(scaleKey, v) {
  const s = SCALES[scaleKey];
  if (v < 0) return lerpRgb(s.neg[0], s.neg[1], clamp(v + 1, 0, 1));
  return lerpRgb(s.pos[0], s.pos[1], clamp(v, 0, 1));
}
