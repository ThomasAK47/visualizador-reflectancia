/* indices.js — definições (descrição) dos índices e composições + cálculos.
 * As BANDAS não vivem aqui: índices referenciam papéis (role) e composições
 * vêm do satélite ativo (satellites.js). Uma única função calcula tudo. */

/* Rótulo legível de cada papel (para tooltips de indisponibilidade). */
const ROLE_LABEL = {
  blue: 'Azul', green: 'Verde', red: 'Vermelho',
  nir: 'NIR', nir2: 'NIR estreito', swir1: 'SWIR1', swir2: 'SWIR2',
};

/* ---- Índices de diferença normalizada: (A − B)/(A + B), A/B por papel ----- */
const INDEX_DEFS = [
  {
    key: 'ndvi', title: 'NDVI', subtitle: 'Vegetação', scale: 'ndvi', num: ['nir', 'red'],
    tooltip: 'Índice de Vegetação por Diferença Normalizada. Valores altos (verde) indicam vegetação vigorosa; baixos indicam solo, água ou área construída.',
    whatIs: 'Índice de Vegetação por Diferença Normalizada. Mede a densidade e vigor da vegetação com base na diferença entre reflexão no infravermelho próximo e no vermelho.',
    useFor: 'Monitoramento de cobertura vegetal, detecção de estresse hídrico em culturas, mapeamento de biomassa e saúde de florestas.',
    range: '−1 (água/solo nu) → 0 (solo exposto/rocha) → 1 (vegetação densa saudável)',
  },
  {
    key: 'ndwi', title: 'NDWI', subtitle: 'Água (McFeeters)', scale: 'water', num: ['green', 'nir'],
    tooltip: 'Índice de Água por Diferença Normalizada (McFeeters, 1996). Realça corpos d’água; valores positivos (azul) indicam presença de água.',
    whatIs: 'Índice de Água por Diferença Normalizada (McFeeters, 1996). Realça corpos d’água usando a banda verde e o infravermelho próximo.',
    useFor: 'Mapeamento de lagos, rios e reservatórios; monitoramento de cheias e variação de espelhos d’água.',
    range: '< 0 (vegetação/solo) → ~0 (limiar água/terra) → > 0,2 (água)',
  },
  {
    key: 'mndwi', title: 'MNDWI', subtitle: 'Água modificado', scale: 'water', num: ['green', 'swir1'],
    tooltip: 'NDWI Modificado (Xu, 2006), usa SWIR no lugar do NIR. Separa melhor água de áreas urbanas e solo exposto.',
    whatIs: 'Índice de Água por Diferença Normalizada Modificado (Xu, 2006). Substitui o NIR pelo SWIR1, reduzindo interferência de vegetação e áreas urbanas.',
    useFor: 'Extração de corpos d’água em áreas urbanas ou com vegetação densa onde o NDWI clássico superestima a água.',
    range: '< 0 (solo/vegetação) → > 0 (água, com menos ruído que o NDWI)',
  },
  {
    key: 'nbr', title: 'NBR', subtitle: 'Queimadas', scale: 'ndvi', num: ['nir', 'swir2'],
    tooltip: 'Razão de Queimada Normalizada. Vegetação sadia em verde; áreas queimadas em vermelho.',
    whatIs: 'Razão de Queimada Normalizada. Compara o infravermelho próximo (alto em vegetação sadia) com o SWIR2 (alto em áreas queimadas).',
    useFor: 'Detecção e mapeamento de áreas queimadas e avaliação da severidade de incêndios (sobretudo via dNBR, a diferença pré/pós-fogo).',
    range: '< 0 (queimada/solo/água) → ~0 → > 0,3 (vegetação sadia)',
  },
  {
    key: 'ndmi', title: 'NDMI', subtitle: 'Umidade da vegetação', scale: 'water', num: ['nir', 'swir1'],
    tooltip: 'Índice de Umidade por Diferença Normalizada. Relaciona NIR e SWIR1, sensível à água da vegetação.',
    whatIs: 'Índice de Umidade por Diferença Normalizada. Relaciona o NIR com o SWIR1, sensível ao conteúdo de água da vegetação.',
    useFor: 'Monitoramento do teor de umidade da vegetação, estresse hídrico em culturas e avaliação de risco de incêndio.',
    range: '< 0 (vegetação seca / estresse hídrico) → > 0 (vegetação com bastante água)',
  },
  {
    key: 'ndbi', title: 'NDBI', subtitle: 'Área construída', scale: 'urban', num: ['swir1', 'nir'],
    tooltip: 'Índice de Área Construída por Diferença Normalizada. Realça superfícies impermeáveis.',
    whatIs: 'Índice de Área Construída por Diferença Normalizada. Usa SWIR1 menos NIR para realçar superfícies impermeáveis.',
    useFor: 'Mapeamento de áreas urbanas e expansão de superfícies construídas; separação entre cidade e vegetação.',
    range: '< 0 (vegetação/água) → > 0 (área construída / solo exposto)',
  },
  {
    key: 'ndsi', title: 'NDSI', subtitle: 'Neve', scale: 'snow', num: ['green', 'swir1'],
    tooltip: 'Índice de Neve por Diferença Normalizada. Neve/gelo em tons claros.',
    whatIs: 'Índice de Neve por Diferença Normalizada. Explora a alta reflexão da neve no verde e a baixa no SWIR1.',
    useFor: 'Mapeamento de cobertura de neve e gelo; ajuda a distinguir neve de nuvens.',
    range: '< 0 (sem neve) → > 0,4 (neve / gelo)',
  },
];

/* ---- Composições RGB: as bandas vêm de SATELLITES[sat].compositions[key] -- */
const COMPOSITE_DEFS = [
  {
    key: 'true', title: 'Cor Verdadeira', subtitle: 'True Color',
    tooltip: 'Composição em cores naturais (R=Vermelho, G=Verde, B=Azul), como o olho humano enxerga.',
    whatIs: 'Composição que replica o que o olho humano enxerga, usando as bandas vermelho, verde e azul do sensor.',
    useFor: 'Interpretação visual intuitiva da paisagem, identificação de feições como estradas, edificações e corpos d’água.',
  },
  {
    key: 'falsecolor', title: 'Falsa Cor', subtitle: 'Vegetação',
    tooltip: 'Falsa cor com NIR no vermelho. Vegetação sadia aparece em tons de vermelho/magenta intensos.',
    whatIs: 'Composição clássica de falsa cor que inclui o infravermelho próximo no canal vermelho.',
    useFor: 'Discriminação de tipos de vegetação, detecção de áreas desmatadas e diferenciação entre vegetação nativa e cultivada.',
    interpretation: 'Vegetação saudável aparece em tons de vermelho intenso; solo exposto em marrom/bege; água em azul escuro.',
  },
  {
    key: 'swir', title: 'Composição SWIR', subtitle: 'SWIR / NIR / Verde',
    tooltip: 'Realça umidade e tipos de solo/rocha usando o infravermelho de ondas curtas (SWIR).',
    whatIs: 'Composição que usa a banda SWIR no canal vermelho, realçando feições que o visível não distingue.',
    useFor: 'Mapeamento de umidade do solo, identificação de áreas queimadas, diferenciação de tipos de rocha e mineralogia de superfície.',
    interpretation: 'Áreas úmidas em azul escuro; queimadas em vermelho/laranja; solo seco em verde claro.',
  },
  {
    key: 'agri', title: 'Composição Agrícola', subtitle: 'SWIR / NIR / Azul',
    tooltip: 'Composição agrícola: distingue culturas, solo e estágios de crescimento.',
    whatIs: 'Composição que combina SWIR, NIR e azul para realce de atividade agrícola.',
    useFor: 'Distinção entre culturas em diferentes estágios fenológicos, mapeamento de áreas irrigadas e monitoramento de safra.',
    interpretation: 'Culturas ativas em verde brilhante; solo exposto em magenta; água em azul escuro.',
  },
];

/* Acesso rápido por chave. */
const INDEX_BY_KEY = Object.fromEntries(INDEX_DEFS.map(d => [d.key, d]));
const COMPOSITE_BY_KEY = Object.fromEntries(COMPOSITE_DEFS.map(d => [d.key, d]));

/** Papel ausente (string) que impede o índice neste satélite, ou null. */
function missingIndexRole(satKey, def) {
  return def.num.find(role => bandByRole(satKey, role) === null) || null;
}

/**
 * Calcula um índice de diferença normalizada para o satélite ativo.
 * Retorna `null` se faltar banda (papel) ou se estiver fora do intervalo.
 */
function computeIndex(data, satKey, def) {
  const ba = bandByRole(satKey, def.num[0]);
  const bb = bandByRole(satKey, def.num[1]);
  if (!ba || !bb) return null;
  const a = sampleBand(data, ba.wl);
  const b = sampleBand(data, bb.wl);
  if (a === null || b === null) return null;
  const denom = a + b;
  return denom !== 0 ? (a - b) / denom : 0;
}

/** Config da composição do satélite ativo (com bandas), ou null se indisponível. */
function compositionConfig(satKey, key) {
  return SATELLITES[satKey].compositions[key] || null;
}

/**
 * Swatch RGB (0–255) de uma composição para o satélite ativo.
 * Cada canal = sample / 0.8, clamp [0,1]. `null` se indisponível.
 */
function computeComposite(data, satKey, def) {
  const cfg = compositionConfig(satKey, def.key);
  if (!cfg) return null;
  const channel = (bandKey) => {
    const bnd = bandById(satKey, bandKey);
    if (!bnd) return null;
    const v = sampleBand(data, bnd.wl);
    return v === null ? null : clamp(v / 0.8, 0, 1);
  };
  const [rKey, gKey, bKey] = cfg.bands;
  const r = channel(rKey), g = channel(gKey), b = channel(bKey);
  if (r === null || g === null || b === null) return null;
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** Fórmula do índice com os números de banda do satélite ativo, ou null. */
function indexFormula(satKey, def) {
  const ba = bandByRole(satKey, def.num[0]);
  const bb = bandByRole(satKey, def.num[1]);
  if (!ba || !bb) return null;
  return `(${ba.num}−${bb.num}) / (${ba.num}+${bb.num})`;
}

/** Fórmula da composição (R/G/B) do satélite ativo, ou null. */
function compositeFormula(satKey, def) {
  const cfg = compositionConfig(satKey, def.key);
  if (!cfg) return null;
  const [r, g, b] = cfg.bands;
  return `R=${r}  G=${g}  B=${b}`;
}

/* ---- Escalas de cor (interpolação linear entre paradas) ------------------ */
const SCALES = {
  // vermelho (-1) → amarelo (0) → verde escuro (+1)
  ndvi: { neg: [[215, 48, 39], [255, 255, 191]], pos: [[255, 255, 191], [26, 120, 50]] },
  // marrom (-1) → branco (0) → azul (+1)
  water: { neg: [[140, 81, 10], [245, 245, 245]], pos: [[245, 245, 245], [33, 102, 172]] },
  // verde (-1) → cinza (0) → magenta (+1) — área construída
  urban: { neg: [[26, 120, 50], [180, 190, 195]], pos: [[180, 190, 195], [192, 38, 211]] },
  // azul escuro (-1) → cinza-azulado (0) → branco (+1) — neve/gelo
  snow: { neg: [[40, 80, 120], [150, 170, 185]], pos: [[150, 170, 185], [240, 248, 255]] },
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
