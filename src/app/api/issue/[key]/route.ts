import { NextRequest, NextResponse } from 'next/server';
import { getJiraClient, isJiraConfigured } from '@/lib/jira';

// Mock data for when Jira is not configured
const mockIssues: Record<string, object> = {
  'DSMM-142': {
    key: 'DSMM-142', fields: {
      summary: 'Implementar autenticação SSO',
      description: 'Implementar autenticação Single Sign-On (SSO) utilizando SAML 2.0 para permitir login corporativo. Deve suportar Azure AD e Google Workspace.',
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      priority: { name: 'High', id: '2' },
      issuetype: { name: 'Story' },
      assignee: { displayName: 'Lucas Silva', emailAddress: 'lucas@movingpay.com' },
      reporter: { displayName: 'Marcos Vinicius', emailAddress: 'marcos@movingpay.com' },
      created: '2026-05-20T10:30:00.000-0300',
      updated: '2026-05-25T14:15:00.000-0300',
      duedate: '2026-06-05',
      labels: ['sso', 'auth', 'security'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [
        { author: { displayName: 'Lucas Silva' }, body: 'Iniciando análise das opções de provider SAML.', created: '2026-05-21T09:00:00.000-0300' },
        { author: { displayName: 'Marcos Vinicius' }, body: 'Priorizar integração com Azure AD primeiro.', created: '2026-05-22T11:30:00.000-0300' },
      ]},
    }
  },
  'DSMM-139': {
    key: 'DSMM-139', fields: {
      summary: 'Corrigir bug no envio de e-mails',
      description: 'E-mails de confirmação de pagamento não estão sendo enviados para clientes com domínio @outlook.com. O problema parece estar relacionado ao servidor SMTP.',
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      priority: { name: 'Highest', id: '1' },
      issuetype: { name: 'Bug' },
      assignee: { displayName: 'Ana Pereira', emailAddress: 'ana@movingpay.com' },
      reporter: { displayName: 'Carlos Mendes', emailAddress: 'carlos@movingpay.com' },
      created: '2026-05-22T08:45:00.000-0300',
      updated: '2026-05-26T10:20:00.000-0300',
      duedate: '2026-05-28',
      labels: ['bug', 'email', 'critical'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [
        { author: { displayName: 'Ana Pereira' }, body: 'Investigando configurações do SMTP relay.', created: '2026-05-23T14:00:00.000-0300' },
      ]},
    }
  },
  'DSMM-136': {
    key: 'DSMM-136', fields: {
      summary: 'Adicionar filtros avançados no relatório',
      description: 'Permitir que o usuário filtre relatórios por período, responsável, tipo de issue e prioridade. Incluir opção de salvar filtros favoritos.',
      status: { name: 'Backlog', statusCategory: { key: 'new', name: 'To Do' } },
      priority: { name: 'Medium', id: '3' },
      issuetype: { name: 'Story' },
      assignee: null,
      reporter: { displayName: 'Marcos Vinicius', emailAddress: 'marcos@movingpay.com' },
      created: '2026-05-18T16:00:00.000-0300',
      updated: '2026-05-18T16:00:00.000-0300',
      labels: ['filters', 'reports'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [] },
    }
  },
  'DSMM-118': {
    key: 'DSMM-118', fields: {
      summary: 'Migração para TypeScript 5',
      description: 'Atualizar o projeto para TypeScript 5.x, aproveitando os novos decorators e melhorias de inferência de tipos. Garantir compatibilidade com todas as dependências.',
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
      priority: { name: 'Medium', id: '3' },
      issuetype: { name: 'Task' },
      assignee: { displayName: 'Carlos Mendes', emailAddress: 'carlos@movingpay.com' },
      reporter: { displayName: 'Lucas Silva', emailAddress: 'lucas@movingpay.com' },
      created: '2026-05-10T09:00:00.000-0300',
      updated: '2026-05-26T11:00:00.000-0300',
      duedate: '2026-05-30',
      labels: ['typescript', 'migration', 'infra'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [
        { author: { displayName: 'Carlos Mendes' }, body: 'tsconfig atualizado. Corrigindo erros de tipo em 12 arquivos.', created: '2026-05-24T10:30:00.000-0300' },
        { author: { displayName: 'Lucas Silva' }, body: 'Boa, cuidado com os decorators experimentais no módulo de pagamentos.', created: '2026-05-24T11:15:00.000-0300' },
      ]},
    }
  },
  'DSMM-115': {
    key: 'DSMM-115', fields: {
      summary: 'Redesign da tela de login',
      description: 'Redesenhar a tela de login com o novo design system. Incluir suporte a dark mode, validação inline de formulário e animações de transição.',
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
      priority: { name: 'High', id: '2' },
      issuetype: { name: 'Story' },
      assignee: { displayName: 'Marcos Vinicius', emailAddress: 'marcos@movingpay.com' },
      reporter: { displayName: 'Julia Ribeiro', emailAddress: 'julia@movingpay.com' },
      created: '2026-05-08T14:30:00.000-0300',
      updated: '2026-05-26T09:45:00.000-0300',
      labels: ['ui', 'login', 'design'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [] },
    }
  },
  'DSMM-110': {
    key: 'DSMM-110', fields: {
      summary: 'Feature de exportação CSV',
      description: 'Implementar exportação de dados em formato CSV para todas as tabelas do dashboard. O arquivo deve incluir cabeçalhos e formatação correta de datas/números.',
      status: { name: 'Code Review', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
      priority: { name: 'Medium', id: '3' },
      issuetype: { name: 'Story' },
      assignee: { displayName: 'Ana Pereira', emailAddress: 'ana@movingpay.com' },
      reporter: { displayName: 'Marcos Vinicius', emailAddress: 'marcos@movingpay.com' },
      created: '2026-05-05T10:00:00.000-0300',
      updated: '2026-05-25T16:30:00.000-0300',
      labels: ['export', 'csv', 'feature'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [
        { author: { displayName: 'Ana Pereira' }, body: 'PR aberto: #234. Pronto para review.', created: '2026-05-25T16:30:00.000-0300' },
      ]},
    }
  },
  'DSMM-108': {
    key: 'DSMM-108', fields: {
      summary: 'Validação de formulário de cadastro',
      description: 'Corrigir validação do formulário de cadastro que permite submissão com CPF inválido. Adicionar máscara e validação de dígitos verificadores.',
      status: { name: 'QA', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
      priority: { name: 'High', id: '2' },
      issuetype: { name: 'Bug' },
      assignee: { displayName: 'Julia Ribeiro', emailAddress: 'julia@movingpay.com' },
      reporter: { displayName: 'Pedro Santos', emailAddress: 'pedro@movingpay.com' },
      created: '2026-05-04T11:00:00.000-0300',
      updated: '2026-05-25T13:00:00.000-0300',
      labels: ['bug', 'validation', 'form'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [] },
    }
  },
  'DSMM-105': {
    key: 'DSMM-105', fields: {
      summary: 'Integração com gateway de pagamento',
      description: 'Integrar novo gateway de pagamento (Stripe) como alternativa ao gateway atual. Suportar PIX, cartão de crédito e boleto.',
      status: { name: 'QA', statusCategory: { key: 'indeterminate', name: 'In Progress' } },
      priority: { name: 'High', id: '2' },
      issuetype: { name: 'Story' },
      assignee: { displayName: 'Lucas Silva', emailAddress: 'lucas@movingpay.com' },
      reporter: { displayName: 'Marcos Vinicius', emailAddress: 'marcos@movingpay.com' },
      created: '2026-05-02T09:00:00.000-0300',
      updated: '2026-05-26T08:00:00.000-0300',
      duedate: '2026-05-30',
      labels: ['payment', 'stripe', 'integration'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [
        { author: { displayName: 'Lucas Silva' }, body: 'Sandbox configurado. Testes de PIX passando.', created: '2026-05-24T15:00:00.000-0300' },
        { author: { displayName: 'Pedro Santos' }, body: 'Testando cenários de timeout e retry.', created: '2026-05-26T08:00:00.000-0300' },
      ]},
    }
  },
  'DSMM-100': {
    key: 'DSMM-100', fields: {
      summary: 'Configuração de CI/CD',
      description: 'Configurar pipeline de CI/CD com GitHub Actions. Incluir etapas de lint, testes, build e deploy automático para staging.',
      status: { name: 'Done', statusCategory: { key: 'done', name: 'Done' } },
      priority: { name: 'High', id: '2' },
      issuetype: { name: 'Task' },
      assignee: { displayName: 'Carlos Mendes', emailAddress: 'carlos@movingpay.com' },
      reporter: { displayName: 'Lucas Silva', emailAddress: 'lucas@movingpay.com' },
      created: '2026-04-28T10:00:00.000-0300',
      updated: '2026-05-20T17:00:00.000-0300',
      resolutiondate: '2026-05-20T17:00:00.000-0300',
      labels: ['ci-cd', 'devops', 'github-actions'],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [] },
    }
  },
};

// Fallback for unknown keys
function getMockIssue(key: string) {
  if (mockIssues[key]) return mockIssues[key];
  return {
    key,
    fields: {
      summary: `Issue ${key}`,
      description: 'Detalhes não disponíveis no modo demo.',
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      priority: { name: 'Medium', id: '3' },
      issuetype: { name: 'Task' },
      assignee: null,
      reporter: { displayName: 'Sistema' },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      labels: [],
      project: { key: 'DSMM', name: 'DSMM' },
      comment: { comments: [] },
    }
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  try {
    if (isJiraConfigured()) {
      const client = getJiraClient();
      const issue = await client.getIssue(key, ['renderedFields']);
      return NextResponse.json(issue);
    }
  } catch (err) {
    console.error(`Failed to fetch issue ${key} from Jira:`, err);
  }

  // Fallback to mock
  return NextResponse.json(getMockIssue(key));
}
