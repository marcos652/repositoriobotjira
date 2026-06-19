// ==========================================
// BACKOFFICE ENDPOINTS (Credenciamento, EC, Usuários, Dispositivos, Taxas, Relatórios)
// ==========================================

export const backofficeEndpoints = [
  // ── USUÁRIOS ──
  {
    id: 'listar-usuarios',
    method: 'GET',
    path: '/api/v3/usuarios',
    title: 'Listar Usuários',
    category: 'usuarios',
    description: 'Retorna a lista de usuários cadastrados na plataforma com suporte a paginação.',
    params: [
      { name: 'page', type: 'integer', desc: 'Número da página' },
      { name: 'limit', type: 'integer', desc: 'Quantidade de registros por página' },
    ],
    request: `?page=1&limit=50`,
    requestLabel: 'Query String',
    response: `{
    "total": 15,
    "page": 1,
    "perPage": 50,
    "data": [
        {
            "id": 456,
            "nome": "João",
            "sobrenome": "Silva",
            "email": "joao.silva@empresa.com",
            "cpf": "12345678900",
            "situacao": "ativo"
        }
    ]
}`,
  },
  {
    id: 'atualizar-usuario',
    method: 'PUT',
    path: '/api/v3/usuarios/atualizar',
    title: 'Atualizar Usuário',
    category: 'usuarios',
    description: 'Atualiza os dados de um usuário existente na plataforma.',
    params: [
      { name: 'usuario_id', type: 'integer', desc: 'ID do usuário a ser atualizado' },
      { name: 'nome', type: 'string', desc: 'Nome do usuário' },
      { name: 'sobrenome', type: 'string', desc: 'Sobrenome do usuário' },
      { name: 'celular', type: 'string', desc: 'Número do celular' },
      { name: 'email', type: 'string', desc: 'E-mail do usuário' },
    ],
    request: `{
    "usuario_id": 456,
    "nome": "João",
    "sobrenome": "Silva Santos",
    "celular": "11988888888",
    "email": "joao.santos@empresa.com"
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Usuário atualizado com sucesso.",
    "usuario_id": 456
}`,
  },

  // ── ESTABELECIMENTOS ──
  {
    id: 'listar-estabelecimentos',
    method: 'GET',
    path: '/api/v3/estabelecimentos',
    title: 'Listar Estabelecimentos',
    category: 'estabelecimentos',
    description: 'Retorna a lista de estabelecimentos cadastrados. Permite busca por nome, documento ou código.',
    params: [
      { name: 'search', type: 'string', desc: 'Busca por nome, documento ou código do estabelecimento' },
      { name: 'situacao', type: 'string', desc: 'Filtro por situação (ativo, inativo, bloqueado)' },
      { name: 'page', type: 'integer', desc: 'Número da página' },
      { name: 'limit', type: 'integer', desc: 'Quantidade de registros por página' },
    ],
    request: `?search=EMPRESA&situacao=ativo&page=1&limit=50`,
    requestLabel: 'Query String',
    response: `{
    "total": 120,
    "page": 1,
    "perPage": 50,
    "data": [
        {
            "id": 123456,
            "cpf_cnpj": "12345678000190",
            "razao_social": "EMPRESA EXEMPLO LTDA",
            "nome_fantasia": "LOJA EXEMPLO",
            "situacao": "ativo",
            "mcc": "5411",
            "cidade": "São Paulo",
            "uf": "SP"
        }
    ]
}`,
  },
  {
    id: 'visualizar-estabelecimento',
    method: 'GET',
    path: '/api/v3/estabelecimentos/visualizar',
    title: 'Visualizar Estabelecimento',
    category: 'estabelecimentos',
    description: 'Retorna os dados completos de um estabelecimento específico, incluindo endereços, contas bancárias e configurações.',
    params: [
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento a ser consultado' },
    ],
    request: `?estabelecimento_id=123456`,
    requestLabel: 'Query String',
    response: `{
    "id": 123456,
    "cpf_cnpj": "12345678000190",
    "razao_social": "EMPRESA EXEMPLO LTDA",
    "nome_fantasia": "LOJA EXEMPLO",
    "situacao": "ativo",
    "mcc": "5411",
    "data_fundacao": "2020-01-15",
    "nome_contato": "João Silva",
    "telefone_contato": "11999999999",
    "enderecos": [
        {
            "logradouro": "Rua Exemplo",
            "numero": "100",
            "bairro": "Centro",
            "cidade": "São Paulo",
            "uf": "SP",
            "cep": "01001000"
        }
    ],
    "contas_bancarias": [
        {
            "codigo_banco": "001",
            "banco": "BANCO DO BRASIL S.A",
            "agencia": "1234",
            "conta": "56789",
            "conta_dv": "0",
            "tipo_conta": "conta_corrente"
        }
    ]
}`,
  },
  {
    id: 'atualizar-estabelecimento',
    method: 'PUT',
    path: '/api/v3/estabelecimentos/atualizar',
    title: 'Atualizar Estabelecimento',
    category: 'estabelecimentos',
    description: 'Atualiza os dados de um estabelecimento existente. Permite alterar situação, contatos e dados básicos.',
    params: [
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento' },
      { name: 'situacao', type: 'string', desc: 'Nova situação (ativo, inativo, bloqueado)' },
      { name: 'nome_contato', type: 'string', desc: 'Nome do contato principal' },
      { name: 'telefone_contato', type: 'string', desc: 'Telefone do contato' },
      { name: 'nome_fantasia', type: 'string', desc: 'Nome fantasia do estabelecimento' },
    ],
    request: `{
    "estabelecimento_id": 123456,
    "situacao": "ativo",
    "nome_contato": "Maria Oliveira",
    "telefone_contato": "11988887777",
    "nome_fantasia": "LOJA EXEMPLO ATUALIZADA"
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Estabelecimento atualizado com sucesso.",
    "estabelecimento_id": 123456
}`,
  },

  // ── DISPOSITIVOS (CAPTURAS) ──
  {
    id: 'cadastrar-captura',
    method: 'POST',
    path: '/api/v3/capturas/cadastrar',
    title: 'Cadastrar Forma de Captura',
    category: 'dispositivos',
    description: 'Cadastra um novo provedor ou método de captura de transações na plataforma.',
    params: [
      { name: 'provedor', type: 'integer', desc: 'ID do provedor: 1=GSurf, 2=Phoebus, 3=Software Express' },
      { name: 'descricao', type: 'string', desc: 'Descrição da forma de captura' },
      { name: 'tipo', type: 'string', desc: 'Tipo de captura (POS, TEF, E-commerce)' },
    ],
    request: `{
    "provedor": 1,
    "descricao": "Terminal POS GSurf",
    "tipo": "POS"
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Forma de captura cadastrada com sucesso.",
    "captura_id": 789
}`,
  },
  {
    id: 'vincular-dispositivo',
    method: 'POST',
    path: '/api/v3/capturas/vincular',
    title: 'Vincular Dispositivo ao EC',
    category: 'dispositivos',
    description: 'Vincula um dispositivo/terminal de captura a um estabelecimento comercial. Define o MCC, tipo de conta e limites de estorno.',
    params: [
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento comercial' },
      { name: 'captura_id', type: 'integer', desc: 'ID da forma de captura' },
      { name: 'mcc', type: 'string', desc: 'MCC do terminal para este EC' },
      { name: 'tipo_conta', type: 'string', desc: 'Tipo de conta (conta_corrente, poupanca)' },
      { name: 'limite_estorno', type: 'number', desc: 'Limite de estorno permitido para o dispositivo' },
      { name: 'provedor', type: 'integer', desc: 'ID do provedor: 1=GSurf, 2=Phoebus, 3=Software Express' },
    ],
    request: `{
    "estabelecimento_id": 123456,
    "captura_id": 789,
    "mcc": "5411",
    "tipo_conta": "conta_corrente",
    "limite_estorno": 5000.00,
    "provedor": 1
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Dispositivo vinculado com sucesso.",
    "estabelecimento_id": 123456,
    "captura_id": 789
}`,
    callout: {
      type: 'info',
      icon: '📟',
      content: 'Provedores suportados: 1 = GSurf, 2 = Phoebus, 3 = Software Express. O MCC e limites de estorno são configurados por dispositivo vinculado.'
    }
  },

  // ── TAXAS ──
  {
    id: 'listar-taxas',
    method: 'GET',
    path: '/api/v3/bandeiras/taxas',
    title: 'Listar Taxas por Bandeira',
    category: 'taxas',
    description: 'Retorna as taxas MDR, taxas de antecipação, número de parcelas e dias para pagamento por bandeira de cartão e adquirente.',
    params: [
      { name: 'acquirer_id', type: 'string', desc: 'Adquirente: Rede, Adiq, PagSeguro, Cielo ou Global' },
    ],
    request: `?acquirer_id=Cielo`,
    requestLabel: 'Query String',
    response: `{
    "adquirente": "Cielo",
    "bandeiras": [
        {
            "bandeira": "VISA",
            "modalidade": "crédito à vista",
            "mdr": 2.50,
            "taxa_antecipacao": 1.80,
            "parcelas": 1,
            "dias_pagamento": 30
        },
        {
            "bandeira": "VISA",
            "modalidade": "crédito parcelado",
            "mdr": 3.20,
            "taxa_antecipacao": 1.80,
            "parcelas": 12,
            "dias_pagamento": 30
        },
        {
            "bandeira": "MASTERCARD",
            "modalidade": "débito",
            "mdr": 1.50,
            "taxa_antecipacao": 0,
            "parcelas": 1,
            "dias_pagamento": 2
        },
        {
            "bandeira": "ELO",
            "modalidade": "crédito à vista",
            "mdr": 2.80,
            "taxa_antecipacao": 1.90,
            "parcelas": 1,
            "dias_pagamento": 30
        }
    ]
}`,
  },

  // ── RELATÓRIOS ──
  {
    id: 'relatorio-faturamento',
    method: 'GET',
    path: '/api/v3/relatorio/estabelecimento/faturamento',
    title: 'Relatório de Faturamento',
    category: 'relatorios',
    description: 'Retorna o relatório de faturamento mensal consolidado dos estabelecimentos.',
    params: [
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento (opcional - todos se não informado)' },
      { name: 'start_date', type: 'date', desc: 'Data inicial do período (YYYY-MM-DD)' },
      { name: 'finish_date', type: 'date', desc: 'Data final do período (YYYY-MM-DD)' },
    ],
    request: `?estabelecimento_id=123456&start_date=2026-01-01&finish_date=2026-01-31`,
    requestLabel: 'Query String',
    response: `{
    "estabelecimento_id": 123456,
    "razao_social": "EMPRESA EXEMPLO LTDA",
    "periodo": "2026-01",
    "faturamento_bruto": 150000.00,
    "descontos": 4500.00,
    "faturamento_liquido": 145500.00,
    "total_transacoes": 320
}`,
  },
  {
    id: 'conciliacao-vendas',
    method: 'GET',
    path: '/api/v3/adquirentes/lancamentos',
    title: 'Conciliação de Vendas',
    category: 'relatorios',
    description: 'Relatório detalhado de lançamentos por adquirente e período. Utilizado para conciliação de vendas e conferência de recebíveis.',
    params: [
      { name: 'start_date', type: 'datetime', desc: 'Data e hora inicial (YYYY-MM-DD HH:MM:SS)' },
      { name: 'finish_date', type: 'datetime', desc: 'Data e hora final (YYYY-MM-DD HH:MM:SS)' },
      { name: 'adquirente', type: 'string', desc: 'Código da adquirente' },
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento' },
      { name: 'page', type: 'integer', desc: 'Número da página' },
      { name: 'limit', type: 'integer', desc: 'Registros por página' },
    ],
    request: `?start_date=2026-01-01+00:00:00
&finish_date=2026-01-31+23:59:59
&adquirente=Cielo
&estabelecimento_id=123456
&page=1
&limit=100`,
    requestLabel: 'Query String',
    response: `{
    "total": 85,
    "page": 1,
    "perPage": 100,
    "data": [
        {
            "nsu": "1234567890",
            "data_venda": "2026-01-15 14:30:00",
            "valor_bruto": 15000,
            "valor_liquido": 14250,
            "mdr": 750,
            "bandeira": "VISA",
            "modalidade": "crédito",
            "parcelas": 3,
            "adquirente": "Cielo",
            "estabelecimento_id": 123456,
            "status": "aprovada"
        }
    ]
}`,
  },
  {
    id: 'resumo-vendas',
    method: 'GET',
    path: '/api/v3/relatorio/vendas/resumo',
    title: 'Resumo de Vendas',
    category: 'relatorios',
    description: 'Visão geral consolidada das transações de vendas, com totais por bandeira e modalidade.',
    params: [
      { name: 'start_date', type: 'date', desc: 'Data inicial' },
      { name: 'finish_date', type: 'date', desc: 'Data final' },
      { name: 'estabelecimento_id', type: 'integer', desc: 'ID do estabelecimento (opcional)' },
    ],
    request: `?start_date=2026-01-01&finish_date=2026-01-31&estabelecimento_id=123456`,
    requestLabel: 'Query String',
    response: `{
    "periodo": {
        "inicio": "2026-01-01",
        "fim": "2026-01-31"
    },
    "totais": {
        "valor_bruto": 150000,
        "valor_liquido": 142500,
        "total_transacoes": 320,
        "ticket_medio": 468.75
    },
    "por_bandeira": [
        { "bandeira": "VISA", "total": 180, "valor": 85000 },
        { "bandeira": "MASTERCARD", "total": 100, "valor": 45000 },
        { "bandeira": "ELO", "total": 40, "valor": 20000 }
    ]
}`,
  },
  {
    id: 'compliance-ofac',
    method: 'GET',
    path: '/api/v3/compliance/ofac',
    title: 'Consulta OFAC (Compliance)',
    category: 'relatorios',
    description: 'Consulta de nomes em listas de restrição internacional (OFAC) para fins de compliance e prevenção à lavagem de dinheiro.',
    params: [
      { name: 'nome', type: 'string', desc: 'Nome a ser consultado nas listas de restrição' },
      { name: 'cpf_cnpj', type: 'string', desc: 'Documento para consulta (opcional)' },
    ],
    request: `?nome=João+Silva&cpf_cnpj=12345678900`,
    requestLabel: 'Query String',
    response: `{
    "consulta": "João Silva",
    "resultado": "limpo",
    "matches": [],
    "consultado_em": "2026-04-16T10:30:00Z"
}`,
  },
];

// ==========================================
// PAYMENT ENDPOINTS - SLC
// ==========================================

export const slcEndpoints = [
  {
    id: 'slc-listar-pagamentos',
    method: 'GET',
    path: '/api/v3/financeiro/consolidado',
    title: 'Listar Pagamentos Disponíveis',
    category: 'slc',
    description: 'Retorna a lista consolidada de pagamentos disponíveis para liquidação, agrupados por estabelecimento.',
    params: [
      { name: 'tipo', type: 'string', desc: 'Modelo de agrupamento (ex: consolidado)' },
      { name: 'start_date', type: 'datetime', desc: 'Início do período (YYYY-MM-DD HH:MM:SS)' },
      { name: 'finish_date', type: 'datetime', desc: 'Fim do período (YYYY-MM-DD HH:MM:SS)' },
      { name: 'status', type: 'string', desc: 'Estado do pagamento (ex: waiting_funds)' },
      { name: 'adquirente', type: 'string', desc: 'Código da adquirente (opcional)' },
      { name: 'codigo_banco', type: 'string', desc: 'Código da instituição bancária (ex: 001)' },
      { name: 'merchant_id', type: 'integer', desc: 'ID do estabelecimento comercial' },
      { name: 'tipo_conta', type: 'string', desc: 'Tipo de conta (ex: conta_corrente)' },
      { name: 'recebimento_via_pix', type: 'integer', desc: 'Filtro binário para pagamentos via Pix' },
      { name: 'limit', type: 'integer', desc: 'Quantidade de registros por página' },
      { name: 'page', type: 'integer', desc: 'Número da página para paginação' },
      { name: 'brand', type: 'string', desc: 'Bandeiras de cartão (ex: VISA,MASTERCARD)' },
      { name: 'type', type: 'string', desc: 'Modalidade (PIX, CHCK, CRDT, CRDT_PARC)' },
      { name: 'tipo_pagamento', type: 'string', desc: 'Origem do recurso (antecipado, vencimento, splits)' },
    ],
    request: `?tipo=consolidado
&start_date=2026-02-25+00:00:00
&finish_date=2026-02-25+23:59:59
&status=waiting_funds
&page=1&limit=100
&codigoUnidadeNegocios=0`,
    requestLabel: 'Query String',
    response: `{
    "ValorBruto": 631808805,
    "ValorLiquido": 596641643,
    "total": 2,
    "perPage": 100,
    "page": 1,
    "data": [
        {
            "IdEstabelecimento": 999999,
            "CpfCnpj": "99999999999999",
            "RazaoSocial": "ESTABELECIMENTO UM",
            "ValorBruto": 453972138,
            "ValorLiquido": 431850711,
            "DataPagamento": "2026-02-25 03:00:00",
            "NsuParc": "1111111111;1111111112;...",
            "codigo_banco": "001",
            "banco": "BANCO DO BRASIL S.A"
        }
    ]
}`,
  },
  {
    id: 'slc-cadastrar-lote',
    method: 'POST',
    path: '/api/v3/lotes/cadastrar',
    title: 'Cadastrar Lote SLC',
    category: 'slc',
    description: 'Cria um novo lote de pagamento SLC. Retorna o hash único que será usado nas etapas seguintes.',
    params: [
      { name: 'codigo_banco', type: 'integer', desc: 'Código numérico do banco (ex: 756 - Sicoob)' },
      { name: 'data_pagamento', type: 'date', desc: 'Data prevista para pagamento (YYYY-MM-DD)' },
      { name: 'tipo_autorizacao', type: 'string', desc: 'Modelo de autorização (ex: BY_PAYMENT_SCHEME)' },
      { name: 'tipo_processamento', type: 'string', desc: 'Definir como "rtm" para fluxo SLC' },
      { name: 'version', type: 'integer', desc: 'Versão da estrutura de integração (ex: 2)' },
    ],
    request: `{
    "codigo_banco": 756,
    "data_pagamento": "2026-02-25",
    "tipo_autorizacao": "BY_PAYMENT_SCHEME",
    "tipo_processamento": "rtm",
    "version": 2
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Lote cadastrado com sucesso.",
    "hash": "1111aa22-3333-4444-55b6-c7d88ef9999g",
    "tipo_processamento": "rtm",
    "situacao": 5,
    "created_at": "2026-02-25 14:26:45"
}`,
    callout: {
      type: 'info',
      icon: '💡',
      content: 'Situação do Lote: 0 = Pendente de liquidação | 1 = Liquidado | 5 = Processando'
    }
  },
  {
    id: 'slc-cadastrar-transferencia',
    method: 'POST',
    path: '/api/v3/transferencia/v2/cadastrar',
    title: 'Cadastrar Transferência SLC',
    category: 'slc',
    description: 'Vincula pagamentos a um lote SLC existente com os dados dos estabelecimentos favorecidos e NSUs. Realizamos a criação de um novo parâmetro que deverá ser enviado no momento da criação das transferências para o envio do lote informacional para a Nuclea. Caso o cliente for seguir com o informacional, passar "informacional": true. Se não for, passar como false ou não enviar o objeto.',
    params: [
      { name: 'codigo_banco', type: 'integer', desc: 'Banco de origem do débito' },
      { name: 'conta_debito', type: 'string', desc: 'Número da conta de débito' },
      { name: 'hash_lote', type: 'string', desc: 'UUID do lote (gerado na etapa anterior)' },
      { name: 'mode', type: 'string', desc: 'Modo de operação (ex: offloaded)' },
      { name: 'tipo_processamento', type: 'string', desc: 'Definir como "rtm"' },
      { name: 'pagamentos', type: 'array', desc: 'Lista de pagamentos (merchant_id, cpf_cnpj, nsu_parcelas)' },
      { name: 'informacional', type: 'boolean', desc: 'Indica o envio do lote informacional para a Nuclea' },
    ],
    request: `{
    "signal": {},
    "codigo_banco": 1,
    "codigo_ispb": "00000000",
    "conta_debito": "1111111",
    "hash_lote": "9136135d-e6bf-4f48-8deb-6124351a5e50",
    "mode": "offloaded",
    "tipo_processamento": "rtm",
    "tipo_autorizacao": "BY_PAYMENT_SCHEME",
    "data_pagamento": "2026-05-26",
    "pagamentos": [
        {
            "merchant_id": 178930,
            "cpf_cnpj": "41016522000169",
            "nsu_parcelas": [
                "1175917379",
                "1175917217",
                "1175917212",
                "1175917201",
                "1175917168",
                "1175917111",
                "1175917044",
                "1175916763"
            ]
        }
    ],
    "informacional": true
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Processamento do lote em andamento.",
    "hash_lote": "9136135d-e6bf-4f48-8deb-6124351a5e50",
    "tipo_processamento": "rtm"
}`,
  },
  {
    id: 'slc-transmitir-lote',
    method: 'POST',
    path: '/api/v3/remessas/rtm/enviar',
    title: 'Transmitir Lote',
    category: 'slc',
    description: 'Dispara a transmissão do lote de pagamentos. Etapa final do fluxo SLC.',
    params: [
      { name: 'hash', type: 'string', desc: 'UUID do lote para transmissão', required: true },
    ],
    request: `{
    "hash": "6545b321-f497-4d76-b92a-a456a4bb3545"
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Foi solicitado o envio do lote RTM Lote e1dc018e sequencial #3 para a RTM. Aguarde o retorno."
}`,
  },
  {
    id: 'slc-listar-agrupado',
    method: 'GET',
    path: '/api/v3/transferencia/agrupado',
    title: 'Listar Transferências Agrupadas',
    category: 'slc',
    description: 'Retorna as transferências agrupadas por estabelecimento, com totais e detalhamento.',
    params: [
      { name: 'start_date / finish_date', type: 'datetime', desc: 'Filtro de período de criação' },
      { name: 'hash_lote', type: 'string', desc: 'Filtrar por lote específico' },
      { name: 'tipo_processamento', type: 'string', desc: 'Filtrar por "rtm"' },
      { name: 'situacao', type: 'string', desc: 'Estado: pendente, concluido, processando, cancelado' },
      { name: 'limit / page', type: 'integer', desc: 'Paginação' },
    ],
    request: `?page=1&start_date=2026-02-25+00:00:00
&finish_date=2026-02-25+23:59:59
&tipo_processamento=rtm
&limit=50&useModernGrouping=true`,
    requestLabel: 'Query String',
    response: `{
    "meta": { "page": 1, "total_itens": 1, "total_pages": 1 },
    "totais": {
        "valor_bruto_total": 1700837,
        "valor_liquido_total": 1685085,
        "total_transferencias": 3
    },
    "data": [...]
}`,
  },
  {
    id: 'slc-cancelar-transferencia',
    method: 'POST',
    path: '/api/v3/transferencia/cancelar',
    title: 'Cancelar Transferência',
    category: 'slc',
    methodColor: 'delete',
    description: 'Cancela uma ou mais transferências pendentes. Pode reverter os lançamentos automaticamente.',
    params: [
      { name: 'documentos', type: 'array', desc: 'Hashes/códigos das transferências a cancelar' },
      { name: 'observacao', type: 'string', desc: 'Motivo detalhado do cancelamento' },
      { name: 'reverter_lancamentos', type: 'boolean', desc: 'Se true, reverte os lançamentos' },
    ],
    request: `{
    "documentos": [
        "gs65g4ser87sdf6zfasfs78ecea8eb68d...",
        "yrtyr8t97yfh45dfgd65f4gdfgfga..."
    ],
    "observacao": "Cancelando transferências",
    "reverter_lancamentos": true
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Operação concluída com sucesso.",
    "estatisticas": {
        "transferencias_canceladas": 3,
        "payables_reagendados": 24
    }
}`,
    callout: {
      type: 'warning',
      icon: '⚠️',
      content: 'Ao definir reverter_lancamentos: true, o sistema irá reagendar os payables associados às transferências canceladas.'
    }
  },
];

// ==========================================
// PAYMENT ENDPOINTS - CNAB
// ==========================================

export const cnabEndpoints = [
  {
    id: 'cnab-listar-pagamentos',
    method: 'GET',
    path: '/api/v3/financeiro/consolidado',
    title: 'Listar Pagamentos Disponíveis',
    category: 'cnab',
    description: 'Retorna a lista consolidada de pagamentos disponíveis para liquidação via CNAB, agrupados por estabelecimento.',
    params: [
      { name: 'tipo', type: 'string', desc: 'Modelo de agrupamento (ex: consolidado)' },
      { name: 'start_date', type: 'datetime', desc: 'Início do período (YYYY-MM-DD HH:MM:SS)' },
      { name: 'finish_date', type: 'datetime', desc: 'Fim do período (YYYY-MM-DD HH:MM:SS)' },
      { name: 'status', type: 'string', desc: 'Estado do pagamento (ex: waiting_funds)' },
      { name: 'codigo_banco', type: 'string', desc: 'Código da instituição bancária' },
      { name: 'merchant_id', type: 'integer', desc: 'ID do estabelecimento comercial' },
      { name: 'limit', type: 'integer', desc: 'Quantidade de registros por página' },
      { name: 'page', type: 'integer', desc: 'Número da página' },
    ],
    request: `?tipo=consolidado
&start_date=2026-02-25+00:00:00
&finish_date=2026-02-25+23:59:59
&status=waiting_funds
&page=1&limit=100`,
    requestLabel: 'Query String',
    response: `{
    "ValorBruto": 631808805,
    "ValorLiquido": 596641643,
    "total": 2,
    "perPage": 100,
    "page": 1,
    "data": [
        {
            "IdEstabelecimento": 999999,
            "CpfCnpj": "99999999999999",
            "RazaoSocial": "ESTABELECIMENTO UM",
            "ValorBruto": 453972138,
            "ValorLiquido": 431850711,
            "DataPagamento": "2026-02-25 03:00:00",
            "NsuParc": "1111111111;1111111112;...",
            "codigo_banco": "001",
            "banco": "BANCO DO BRASIL S.A"
        }
    ]
}`,
  },
  {
    id: 'cnab-cadastrar-lote',
    method: 'POST',
    path: '/api/v3/lotes/cadastrar',
    title: 'Cadastrar Lote CNAB',
    category: 'cnab',
    description: 'Cria um novo lote de pagamento CNAB. Define tipo_processamento como "cnab" para gerar arquivo de remessa bancária.',
    params: [
      { name: 'codigo_banco', type: 'integer', desc: 'Código numérico do banco (ex: 001 - BB, 756 - Sicoob)' },
      { name: 'data_pagamento', type: 'date', desc: 'Data prevista para pagamento (YYYY-MM-DD)' },
      { name: 'tipo_autorizacao', type: 'string', desc: 'Modelo de autorização (ex: BY_PAYMENT_SCHEME)' },
      { name: 'tipo_processamento', type: 'string', desc: 'Definir como "cnab" para fluxo CNAB' },
      { name: 'version', type: 'integer', desc: 'Versão da estrutura de integração (ex: 2)' },
    ],
    request: `{
    "codigo_banco": 001,
    "data_pagamento": "2026-02-25",
    "tipo_autorizacao": "BY_PAYMENT_SCHEME",
    "tipo_processamento": "cnab",
    "version": 2
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Lote cadastrado com sucesso.",
    "hash": "2222bb33-4444-5555-66c7-d8e99ff0000h",
    "tipo_processamento": "cnab",
    "situacao": 5,
    "created_at": "2026-02-25 14:26:45"
}`,
    callout: {
      type: 'info',
      icon: '📄',
      content: 'No fluxo CNAB, o tipo_processamento deve ser "cnab". O arquivo de remessa será gerado após o cadastro das transferências.'
    }
  },
  {
    id: 'cnab-cadastrar-transferencia',
    method: 'POST',
    path: '/api/v3/transferencia/v2/cadastrar',
    title: 'Cadastrar Transferência CNAB',
    category: 'cnab',
    description: 'Vincula pagamentos a um lote CNAB existente. O sistema irá gerar o arquivo de remessa bancária com os dados informados.',
    params: [
      { name: 'codigo_banco', type: 'integer', desc: 'Banco de origem do débito' },
      { name: 'conta_debito', type: 'string', desc: 'Número da conta de débito' },
      { name: 'hash_lote', type: 'string', desc: 'UUID do lote CNAB' },
      { name: 'mode', type: 'string', desc: 'Modo de operação (ex: offloaded)' },
      { name: 'tipo_processamento', type: 'string', desc: 'Definir como "cnab"' },
      { name: 'pagamentos', type: 'array', desc: 'Lista de pagamentos (merchant_id, cpf_cnpj, nsu_parcelas)' },
    ],
    request: `{
    "codigo_banco": 001,
    "conta_debito": "22222",
    "hash_lote": "2222bb33-4444-5555-66c7-d8e99ff0000h",
    "mode": "offloaded",
    "tipo_processamento": "cnab",
    "tipo_autorizacao": "BY_PAYMENT_SCHEME",
    "pagamentos": [
        {
            "merchant_id": 888888,
            "cpf_cnpj": "88888888888888",
            "nsu_parcelas": ["1175946500", "1175946501"]
        }
    ]
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Processamento do lote em andamento.",
    "hash_lote": "2222bb33-4444-5555-66c7-d8e99ff0000h",
    "tipo_processamento": "cnab"
}`,
  },
  {
    id: 'cnab-gerar-remessa',
    method: 'POST',
    path: '/api/v3/remessas/cnab/gerar',
    title: 'Gerar Arquivo de Remessa CNAB',
    category: 'cnab',
    description: 'Gera o arquivo de remessa CNAB (240 ou 400 posições) para envio ao banco. Etapa final do fluxo CNAB.',
    params: [
      { name: 'hash', type: 'string', desc: 'UUID do lote para geração do arquivo', required: true },
    ],
    request: `{
    "hash": "2222bb33-4444-5555-66c7-d8e99ff0000h"
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Arquivo CNAB gerado com sucesso.",
    "hash_lote": "2222bb33-4444-5555-66c7-d8e99ff0000h",
    "arquivo": "REMESSA_20260225_001_SEQ001.rem",
    "formato": "CNAB240",
    "total_registros": 5
}`,
    callout: {
      type: 'info',
      icon: '📄',
      content: 'O arquivo CNAB gerado deve ser enviado ao banco através do canal de transmissão bancário (Van Bancária, Internet Banking ou API do banco).'
    }
  },
  {
    id: 'cnab-listar-transferencias',
    method: 'GET',
    path: '/api/v3/transferencia/agrupado',
    title: 'Listar Transferências CNAB',
    category: 'cnab',
    description: 'Retorna as transferências CNAB agrupadas por estabelecimento, com totais e detalhamento.',
    params: [
      { name: 'start_date / finish_date', type: 'datetime', desc: 'Filtro de período de criação' },
      { name: 'hash_lote', type: 'string', desc: 'Filtrar por lote específico' },
      { name: 'tipo_processamento', type: 'string', desc: 'Filtrar por "cnab"' },
      { name: 'situacao', type: 'string', desc: 'Estado: pendente, concluido, processando, cancelado' },
      { name: 'limit / page', type: 'integer', desc: 'Paginação' },
    ],
    request: `?page=1&start_date=2026-02-25+00:00:00
&finish_date=2026-02-25+23:59:59
&tipo_processamento=cnab
&limit=50&useModernGrouping=true`,
    requestLabel: 'Query String',
    response: `{
    "meta": { "page": 1, "total_itens": 1, "total_pages": 1 },
    "totais": {
        "valor_bruto_total": 2500000,
        "valor_liquido_total": 2450000,
        "total_transferencias": 5
    },
    "data": [...]
}`,
  },
  {
    id: 'cnab-cancelar-transferencia',
    method: 'POST',
    path: '/api/v3/transferencia/cancelar',
    title: 'Cancelar Transferência CNAB',
    category: 'cnab',
    methodColor: 'delete',
    description: 'Cancela transferências pendentes do lote CNAB antes do envio ao banco.',
    params: [
      { name: 'documentos', type: 'array', desc: 'Hashes/códigos das transferências a cancelar' },
      { name: 'observacao', type: 'string', desc: 'Motivo detalhado do cancelamento' },
      { name: 'reverter_lancamentos', type: 'boolean', desc: 'Se true, reverte os lançamentos' },
    ],
    request: `{
    "documentos": [
        "hash_transferencia_cnab_001...",
        "hash_transferencia_cnab_002..."
    ],
    "observacao": "Cancelando transferências CNAB",
    "reverter_lancamentos": true
}`,
    requestLabel: 'JSON Body',
    response: `{
    "mensagem": "Operação concluída com sucesso.",
    "estatisticas": {
        "transferencias_canceladas": 2,
        "payables_reagendados": 10
    }
}`,
    callout: {
      type: 'warning',
      icon: '⚠️',
      content: 'Só é possível cancelar transferências CNAB que ainda não tiveram o arquivo de remessa enviado ao banco.'
    }
  },
];

// ==========================================
// CATEGORIES CONFIG
// ==========================================

export const categories = [
  {
    id: 'usuarios',
    title: 'Gestão de Usuários',
    icon: '👤',
    desc: 'Cadastro e manutenção de usuários da plataforma',
    color: 'blue',
  },
  {
    id: 'estabelecimentos',
    title: 'Estabelecimentos',
    icon: '🏢',
    desc: 'Consulta, listagem e atualização de ECs',
    color: 'purple',
  },
  {
    id: 'dispositivos',
    title: 'Dispositivos & Capturas',
    icon: '📟',
    desc: 'Cadastro e vinculação de terminais POS/TEF',
    color: 'orange',
  },
  {
    id: 'taxas',
    title: 'Taxas & Bandeiras',
    icon: '💰',
    desc: 'MDR, taxas de antecipação e configurações por bandeira',
    color: 'cyan',
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: '📊',
    desc: 'Faturamento, conciliação de vendas, compliance',
    color: 'pink',
  },
  {
    id: 'slc',
    title: 'Pagamento SLC',
    icon: '⚡',
    desc: 'Pagamentos em lote — transmissão direta à câmara de liquidação',
    color: 'blue',
  },
  {
    id: 'cnab',
    title: 'Pagamento CNAB',
    icon: '📄',
    desc: 'Pagamentos em lote via arquivo de remessa CNAB para envio bancário',
    color: 'green',
  },
];

export const slcFlowSteps = [
  {
    step: 1,
    method: 'GET',
    title: 'Listar Pagamentos',
    description: 'Consulte os pagamentos consolidados com status waiting_funds disponíveis para liquidação.',
    endpoint: '/api/v3/financeiro/consolidado',
  },
  {
    step: 2,
    method: 'POST',
    title: 'Cadastrar Lote SLC',
    description: 'Crie um lote de pagamento SLC. Receba o hash único do lote.',
    endpoint: '/api/v3/lotes/cadastrar',
  },
  {
    step: 3,
    method: 'POST',
    title: 'Cadastrar Transferências',
    description: 'Vincule os pagamentos ao lote, informando merchant_id, documentos e NSUs.',
    endpoint: '/api/v3/transferencia/v2/cadastrar',
  },
  {
    step: 4,
    method: 'POST',
    title: 'Transmitir Lote',
    description: 'Transmita o lote para liquidação automática pela câmara.',
    endpoint: '/api/v3/remessas/rtm/enviar',
  },
];

export const cnabFlowSteps = [
  {
    step: 1,
    method: 'GET',
    title: 'Listar Pagamentos',
    description: 'Consulte os pagamentos consolidados disponíveis para geração de arquivo CNAB.',
    endpoint: '/api/v3/financeiro/consolidado',
  },
  {
    step: 2,
    method: 'POST',
    title: 'Cadastrar Lote (CNAB)',
    description: 'Crie um lote com tipo_processamento: "cnab". Receba o hash único do lote.',
    endpoint: '/api/v3/lotes/cadastrar',
  },
  {
    step: 3,
    method: 'POST',
    title: 'Cadastrar Transferências',
    description: 'Vincule os pagamentos ao lote CNAB com os dados dos favorecidos.',
    endpoint: '/api/v3/transferencia/v2/cadastrar',
  },
  {
    step: 4,
    method: 'POST',
    title: 'Gerar Arquivo CNAB',
    description: 'Gere o arquivo de remessa CNAB (240/400) para envio ao banco.',
    endpoint: '/api/v3/remessas/cnab/gerar',
  },
];

// All endpoints combined
export const allEndpoints = [...backofficeEndpoints, ...slcEndpoints, ...cnabEndpoints];
