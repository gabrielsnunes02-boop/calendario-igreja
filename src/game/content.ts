// Conteúdo do jogo: temas, cores, clientes, níveis, conquistas e comentários do júri.

export interface NamedColor { name: string; hex: string }

export const CHALLENGE_COLORS: NamedColor[] = [
  { name: 'terracota', hex: '#c8643b' },
  { name: 'verde-oliva', hex: '#6b7a3a' },
  { name: 'azul-klein', hex: '#1f3fbf' },
  { name: 'rosa-chiclete', hex: '#f06aa8' },
  { name: 'amarelo-manteiga', hex: '#f3d97a' },
  { name: 'vinho', hex: '#6e1f34' },
  { name: 'lavanda', hex: '#b7a3e0' },
  { name: 'verde-esmeralda', hex: '#18805b' },
  { name: 'laranja-neon', hex: '#ff7a1a' },
  { name: 'off-white', hex: '#f2ece0' },
  { name: 'preto absoluto', hex: '#151313' },
  { name: 'azul-bebê', hex: '#a9cdef' },
  { name: 'caramelo', hex: '#b9763a' },
  { name: 'vermelho-cereja', hex: '#c4142c' },
  { name: 'menta', hex: '#9fe0c4' },
  { name: 'dourado', hex: '#c9a23a' },
];

export const THEMES: string[] = [
  'Anos 70 disco', 'Praia em Trancoso', 'Noite de gala', 'Streetwear urbano',
  'Festa junina chique', 'Inspirado em flores', 'Futurista', 'Romântico vitoriano',
  'Minimalista japonês', 'Casamento no campo', 'Rock dos anos 80', 'Safári',
  'Balé', 'Inspirado no mar', 'Tropical brasileiro', 'Inverno em Paris',
  'Anos 20 (melindrosa)', 'Esportivo de luxo', 'Princesa moderna', 'Boho festival',
  'Alfaiataria poderosa', 'Inspirado em doces', 'Noite de Carnaval', 'Cottagecore',
  'Inspirado no céu estrelado', 'Y2K (anos 2000)', 'Piquenique', 'Ópera e veludo',
];

export const PIECES: string[] = [
  'um vestido', 'um conjunto de duas peças', 'um macacão', 'um look com saia',
  'um look com calça', 'um look com jaqueta', 'um vestido longo', 'um look com capa',
];

export const CLIENT_NAMES = [
  'Dona Cida', 'Valentina', 'Lady Bárbara', 'Júlia (a noiva)', 'Madame Rosé',
  'Bia Influencer', 'Tia Lurdes', 'Condessa Íris', 'DJ Luna', 'Professora Helena',
  'Mel, a cantora', 'Aurora, a bailarina',
];

export const CLIENT_OCCASIONS = [
  'um casamento na praia', 'o tapete vermelho', 'um jantar romântico', 'um show de rock',
  'uma formatura', 'uma entrevista de emprego importante', 'um baile de máscaras',
  'um passeio de iate', 'a festa da firma', 'um ensaio de fotos', 'um chá da tarde',
  'um festival de música',
];

export const CLIENT_STYLES = [
  'algo bem minimalista', 'muito brilho, por favor!', 'romântico e delicado',
  'ousado e diferente', 'confortável mas elegante', 'com muita estampa',
  'clássico atemporal', 'divertido e colorido',
];

export interface Level { name: string; xp: number; unlock?: string }

export const LEVELS: Level[] = [
  { name: 'Estagiária de Ateliê', xp: 0 },
  { name: 'Aprendiz de Costura', xp: 120, unlock: 'Pose "Mão na cintura" + textura Poá' },
  { name: 'Assistente de Estilo', xp: 300, unlock: 'Corpo Curvilíneo + textura Xadrez' },
  { name: 'Estilista Júnior', xp: 600, unlock: 'Pose "Capa de revista" + Passarela Praia' },
  { name: 'Estilista', xp: 1000, unlock: 'Textura Oncinha + pincel Glitter' },
  { name: 'Estilista Sênior', xp: 1600, unlock: 'Pose "Andando" + Passarela Neon' },
  { name: 'Diretora Criativa', xp: 2400, unlock: 'Textura Renda + Passarela Paris' },
  { name: 'Ícone da Moda', xp: 3500, unlock: 'Pose "Braços abertos"' },
  { name: 'Lenda da Moda', xp: 5000, unlock: 'Uma surpresa especial 💌' },
];

export interface Achievement { id: string; name: string; desc: string; icon: string }

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'Primeiro Croqui', desc: 'Salve seu primeiro look', icon: '✏️' },
  { id: 'five', name: 'Mãos de Fada', desc: 'Crie 5 looks', icon: '🧚' },
  { id: 'ten', name: 'Coleção Cápsula', desc: 'Crie 10 looks', icon: '👗' },
  { id: 'twentyfive', name: 'Semana de Moda', desc: 'Crie 25 looks', icon: '🏆' },
  { id: 'challenge', name: 'Topo o Desafio', desc: 'Complete um desafio do dia', icon: '🎯' },
  { id: 'streak3', name: 'Inspiração em Dia', desc: '3 dias seguidos de desafio', icon: '🔥' },
  { id: 'streak7', name: 'Semana Perfeita', desc: '7 dias seguidos de desafio', icon: '🌟' },
  { id: 'client', name: 'Cliente Satisfeita', desc: 'Atenda um pedido de cliente', icon: '💼' },
  { id: 'clients5', name: 'Agenda Lotada', desc: 'Atenda 5 pedidos de clientes', icon: '📒' },
  { id: 'colors', name: 'Arco-íris', desc: 'Use 6 cores ou mais em um look', icon: '🌈' },
  { id: 'textures', name: 'Tecelã', desc: 'Use 3 texturas em um look', icon: '🧵' },
  { id: 'symmetry', name: 'Espelho, Espelho Meu', desc: 'Desenhe com a simetria ligada', icon: '🪞' },
  { id: 'stars5', name: 'Nota Máxima', desc: 'Receba 5 estrelas de todo o júri', icon: '⭐' },
  { id: 'night', name: 'Coruja Criativa', desc: 'Crie um look depois da meia-noite', icon: '🦉' },
  { id: 'secret', name: 'Segredinho', desc: '???', icon: '💌' },
];

export const JURY = [
  { name: 'Madame Chiffon', emoji: '👒' },
  { name: 'Ricardo Alfaiate', emoji: '🎩' },
  { name: 'Nina Vogue', emoji: '🕶️' },
];

export const JURY_COMMENTS = {
  colors: [
    'Que paleta! Isso é cor de editorial.', 'As cores conversam lindamente.',
    'Esse jogo de cores me deixou sem ar!',
  ],
  textures: [
    'A mistura de texturas é de quem entende de tecido.', 'Eu consigo sentir o tecido daqui!',
    'Texturas com personalidade. Amei!',
  ],
  challenge: [
    'Interpretou o tema com perfeição.', 'Isso é exatamente o que o desafio pedia — e mais.',
    'Tema dominado, com um toque autoral!',
  ],
  detail: [
    'Os detalhes fazem toda a diferença.', 'Dá pra ver o cuidado em cada traço.',
    'Riqueza de detalhes absurda.',
  ],
  minimal: [
    'Menos é mais — e você sabe disso.', 'Elegância pura na simplicidade.',
    'Um minimalismo muito sofisticado.',
  ],
  general: [
    'Eu usaria isso amanhã!', 'Já consigo ver isso numa vitrine.', 'Isso tem cara de capa de revista.',
    'Uma silhueta que ninguém esquece.', 'Ousado na medida certa.', 'Isso é moda de verdade!',
    'Eu pagaria caro por esse look.', 'A passarela inteira parou pra ver.',
  ],
};

export function pick<T>(arr: T[], rnd: () => number = Math.random): T {
  return arr[Math.floor(rnd() * arr.length) % arr.length];
}

/** PRNG determinístico (mulberry32) — usado para o desafio do dia ser igual o dia todo. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
