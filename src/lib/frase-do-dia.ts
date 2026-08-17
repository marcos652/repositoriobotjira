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

/**
 * Tom: voz de gente, não de pôster de escritório. Vale imagem, ironia e humor, desde que
 * sobre algo para pensar depois de fechar a aba. Nada de "acredite em você".
 *
 * Regra prática ao acrescentar: se a frase caberia num quadro de aeroporto, não serve. Ela
 * tem que dizer algo que só quem já apagou o próprio código entenderia.
 */
export const FRASES: string[] = [
  'Você não está preso no bug. O bug está preso com você.',
  'Todo sistema legado foi, um dia, a solução esperta de alguém com prazo curto.',
  'Debugar é arqueologia: você escava decisões, não linhas.',
  'Não existe "só mais um if". Existe uma árvore crescendo no escuro.',
  'O código roda na máquina, mas mora na cabeça de quem vai ler daqui a seis meses.',
  'Deletar código é a única refatoração que nunca introduziu um bug.',
  'Café não desentorta lógica. Só ilumina onde ela torceu.',
  'A pressa constrói atalhos. O cuidado constrói estrada. Os dois chegam — um volta.',
  'Se você tem medo de mexer, o problema não é coragem. É a ausência de teste.',
  'Aquele TODO de dois anos atrás também era "rapidinho".',
  'Otimizar sem medir é decorar o escuro.',
  'Nome ruim de variável é dívida com juros: cobra em toda leitura.',
  'O melhor commit do dia costuma ser o que apaga coisa.',
  'Bug que você não reproduz não está resolvido. Está de férias.',
  'Complexidade acidental é a que você inventou — e essa dá para devolver.',
  'Toda abstração cobra aluguel. Só vale se você usa o espaço.',
  'Log escrito hoje é uma lanterna que alguém vai agradecer às três da manhã.',
  'Simples não é o que sai rápido. É o que sobra quando você entendeu o problema.',
  'Duplicar código é barato. Duplicar decisão é que sai caro.',
  'Um teste que nunca falhou talvez nunca tenha testado nada.',
  'Documentação é uma carta para o seu eu de daqui a seis meses. Ele esqueceu tudo.',
  'Deploy pequeno, susto pequeno.',
  '"Funciona na minha máquina" é uma hipótese, não um resultado.',
  'Erro engolido em silêncio é armadilha embalada para presente.',
  'Revisar código é ensinar e aprender ao mesmo tempo, dos dois lados da tela.',
  'Leia o código antes de julgar quem escreveu. Havia um motivo, mesmo que ruim.',
  'Perguntar leva cinco minutos. Adivinhar levou a tarde inteira.',
  'O usuário não quer o seu recurso. Quer o problema dele fora do caminho.',
  'Refatorar não é enfeitar. É deixar a próxima mudança mais fácil que esta.',
  'Automatize na terceira vez. Na primeira, entenda. Na segunda, desconfie.',
  'Fazer funcionar, deixar claro, deixar rápido. Nessa ordem, sempre nessa ordem.',
  'Se você não explica em uma frase, ainda não terminou de pensar.',
  'Escopo que cresce sozinho no meio da tarefa merece conversa, não herói.',
  'Estimativa é previsão do tempo, não contrato. Diga a chance de chuva.',
  'Descansar é parte do trabalho: bug caçado de madrugada custa dois dias de dia.',
  'A build quebrada é sempre a prioridade. O resto é opinião.',
  'Código esperto impressiona uma vez. Código óbvio ajuda todo dia.',
  'Ninguém elogia a ponte que não caiu. Construa assim mesmo.',
  'Todo sistema conta uma história. A sua está legível?',
  'O prazo aperta a mão de todo mundo. A qualidade é a única que continua depois.',
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
