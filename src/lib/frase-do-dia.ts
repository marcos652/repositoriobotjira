// ============================================
//  Frase do dia para quem desenvolve
// ============================================
//
// Uma por dia, igual para todo mundo, trocando à meia-noite.
//
// Determinística de propósito, sem sorteio: com Math.random() a frase mudaria a cada
// renderização e a cada aba aberta, o que destrói a ideia de "frase DO DIA" — e duas pessoas
// olhando a mesma tela veriam coisas diferentes.
//
// O dia é o de São Paulo, não o UTC: com new Date().getDate() num servidor em UTC (a Vercel), a
// frase trocaria às 21h. Mesmo cuidado que a data de início da demanda e a faixa de horas do
// clima exigiram.

/** Tom: animado e direto, mas com algo para pensar — nada de motivacional vazio. */
export const FRASES: string[] = [
  'Código que ninguém entende amanhã é dívida, não talento.',
  'Se está difícil de testar, provavelmente está difícil de usar.',
  'O melhor commit do dia costuma ser o que apaga código.',
  'Bug reproduzido é bug quase resolvido. Corra atrás da receita, não do palpite.',
  'Nomear bem é metade do design. A outra metade é ter coragem de renomear.',
  'Otimizar sem medir é decorar o escuro.',
  'Aquele TODO de dois anos atrás também era "rapidinho".',
  'Quem escreve o log de hoje salva a madrugada de alguém amanhã.',
  'Simples é o que sobra depois de você entender o problema de verdade.',
  'Duplicar código é barato. Duplicar decisão é que sai caro.',
  'Revisar código é ensinar e aprender ao mesmo tempo — dos dois lados.',
  'Se a build quebrou, a prioridade é a build. O resto pode esperar.',
  'Documentação é uma carta para o você de daqui a seis meses.',
  'Deploy pequeno, susto pequeno.',
  'Não confie no "funciona na minha máquina" — confie no que você provou.',
  'Toda abstração cobra aluguel. Vale a pena só se você usa o espaço.',
  'A pressa que economiza uma hora hoje costuma cobrar um dia depois.',
  'Perguntar cedo é mais rápido que adivinhar por três horas.',
  'Um teste que nunca falha talvez não esteja testando nada.',
  'Refatorar não é enfeitar: é deixar a próxima mudança mais fácil.',
  'Erro tratado em silêncio é armadilha embalada para presente.',
  'O usuário não quer seu recurso, quer o problema dele resolvido.',
  'Leia o código antes de julgar quem escreveu. Havia um motivo.',
  'Escopo que cresce sozinho no meio da tarefa merece uma conversa, não um herói.',
  'Automatize na terceira vez. Na primeira, entenda.',
  'Fazer funcionar, deixar claro, deixar rápido — nessa ordem.',
  'Se você não sabe explicar em uma frase, ainda não terminou de pensar.',
  'Feito e entregue vale mais que perfeito e parado — mas feito não é remendado.',
  'Complexidade acidental é a que você inventou. Essa dá para devolver.',
  'Descansar também é parte do trabalho: bug de madrugada custa dois dias de dia.',
  'Todo sistema conta uma história. Deixe a sua legível.',
];

/**
 * Data de hoje em Marília/SP no formato AAAA-MM-DD, independente do fuso do servidor.
 *
 * en-CA porque o formato dele já é AAAA-MM-DD, o que evita montar a string na mão.
 */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/**
 * Índice estável para uma data: dias corridos desde 1970 contados a partir da data LOCAL já
 * resolvida. Assim dias consecutivos dão índices consecutivos (a frase realmente muda no dia
 * seguinte, e não repete por acaso).
 */
function diasDesde1970(dataISO: string): number {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  return Math.floor(Date.UTC(ano, mes - 1, dia) / 86400000);
}

export interface FraseDoDia {
  texto: string;
  /** A data (em São Paulo) a que a frase corresponde — deixa o rodízio auditável. */
  dia: string;
  indice: number;
}

export function fraseDoDia(agora: Date = new Date()): FraseDoDia {
  const dia = hojeEmSaoPaulo(agora);
  const indice = ((diasDesde1970(dia) % FRASES.length) + FRASES.length) % FRASES.length;
  return { texto: FRASES[indice], dia, indice };
}
