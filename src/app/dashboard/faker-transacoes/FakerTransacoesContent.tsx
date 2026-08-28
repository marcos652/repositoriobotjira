'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CreditCard, Loader2, Play, ShieldAlert, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

type AuthHeaderName = 'Authorization' | 'x-mvpay-token';

interface FormState {
  gatewayEndpoint: string;
  token: string;
  authHeaderName: AuthHeaderName;
  useBearer: boolean;
  numRegistros: number;
  delayMs: number;
  capturePartner: string;
  documentsList: string;
  acquirerList: string;
  brandsList: string;
  webhookUrl: string;
  customersIdList: string;
  dryRun: boolean;
}

interface ResultRow {
  index: number;
  success: boolean;
  status: number | null;
  error: string | null;
  uuid: string;
  customersId: string | null;
  documento: string;
  valor: string;
  parcelas: string;
  bandeira: string;
  adquirente: string;
  formaPagamento: string;
}

interface Summary {
  total: number;
  success: number;
  failed: number;
}

const DEFAULT_FORM: FormState = {
  gatewayEndpoint: '',
  token: '',
  authHeaderName: 'Authorization',
  useBearer: false,
  numRegistros: 10,
  delayMs: 500,
  capturePartner: 'TESTE-PERSONAL',
  documentsList: '',
  acquirerList: '18,19,20,21,22',
  brandsList: 'VISA,MASTERCARD,ELO',
  webhookUrl: '',
  customersIdList: '',
  dryRun: true,
};

function formatValor(valorCentavos: string): string {
  const n = Number(valorCentavos);
  if (!Number.isFinite(n)) return valorCentavos;
  return (n / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FakerTransacoesContent() {
  const { addToast } = useToast();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [showToken, setShowToken] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasServerToken, setHasServerToken] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Pré-preenche com os defaults fixos no servidor (.env.local) — o token em si nunca
  // vem nessa resposta, só um flag indicando que existe um default configurado.
  useEffect(() => {
    fetch('/api/faker-transacoes')
      .then(res => res.ok ? res.json() : null)
      .then(defaults => {
        if (!defaults) return;
        setHasServerToken(Boolean(defaults.hasToken));
        setForm(prev => ({
          ...prev,
          gatewayEndpoint: prev.gatewayEndpoint || defaults.gatewayEndpoint || '',
          authHeaderName: (defaults.authHeaderName as AuthHeaderName) || prev.authHeaderName,
          customersIdList: prev.customersIdList || defaults.customersIdList || '',
          acquirerList: prev.acquirerList || defaults.acquirerList || prev.acquirerList,
          brandsList: prev.brandsList || defaults.brandsList || prev.brandsList,
          documentsList: prev.documentsList || defaults.documentsList || '',
          webhookUrl: prev.webhookUrl || defaults.webhookUrl || '',
          capturePartner: defaults.capturePartner || prev.capturePartner,
        }));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResults([]);
    setSummary(null);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/faker-transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || `Falha ao iniciar (HTTP ${resp.status})`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'result') {
            setResults(prev => [...prev, evt]);
          } else if (evt.type === 'done') {
            setSummary(evt.summary);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error
        ? (err.name === 'AbortError' ? 'Execução cancelada.' : err.message)
        : 'Erro ao gerar transações.';
      setFormError(message);
      addToast({ type: 'error', title: 'Falha no gerador de transações', message });
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [form, addToast]);

  React.useEffect(() => {
    if (summary) {
      const allOk = summary.failed === 0;
      addToast({
        type: allOk ? 'success' : 'warning',
        title: form.dryRun ? 'Simulação concluída' : 'Envio concluído',
        message: `${summary.success}/${summary.total} transações com sucesso${summary.failed ? `, ${summary.failed} falharam` : ''}.`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  const cancelRun = () => abortRef.current?.abort();

  return (
    <div className="ft-root">
      <div className="ft-hero">
        <div className="ft-hero-icon"><CreditCard size={24} /></div>
        <div>
          <h1 className="ft-hero-title">Faker de Transações</h1>
          <p className="ft-hero-subtitle">Gera transações fictícias e envia ao Gateway MovingPay — uso para QA e testes.</p>
        </div>
      </div>

      <div className="ft-warning">
        <ShieldAlert size={16} />
        <span>Ferramenta simula transações fictícias. Confirme o endpoint antes de desativar o modo simulação — nunca use contra produção sem aprovação.</span>
      </div>

      <div className="ft-body">
        <form onSubmit={handleSubmit} className="ft-form">
          <div className="ft-section-title">Conexão com o Gateway</div>
          <div className="ft-grid">
            <label className="ft-field ft-field-wide">
              <span>Endpoint do Gateway</span>
              <input
                type="url"
                placeholder="https://gateway.movingpay.com.br/push/transaction"
                value={form.gatewayEndpoint}
                onChange={e => update('gatewayEndpoint', e.target.value)}
                disabled={running}
              />
            </label>
            <label className="ft-field ft-field-wide">
              <span>Token de Acesso{hasServerToken && <em className="ft-hint"> — deixe vazio para usar o padrão configurado no servidor</em>}</span>
              <div className="ft-token-row">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={hasServerToken ? 'Usando token padrão do .env.local' : 'Token gerado em Operacional > Usuários > Tokens de Acesso'}
                  value={form.token}
                  onChange={e => update('token', e.target.value)}
                  disabled={running}
                  autoComplete="off"
                />
                <button type="button" className="ft-token-toggle" onClick={() => setShowToken(v => !v)} tabIndex={-1} aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}>
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            <label className="ft-field">
              <span>Header de autenticação</span>
              <select value={form.authHeaderName} onChange={e => update('authHeaderName', e.target.value as AuthHeaderName)} disabled={running}>
                <option value="Authorization">Authorization</option>
                <option value="x-mvpay-token">x-mvpay-token</option>
              </select>
            </label>
            <label className="ft-field ft-checkbox">
              <input type="checkbox" checked={form.useBearer} onChange={e => update('useBearer', e.target.checked)} disabled={running} />
              <span>Enviar com prefixo &quot;Bearer &quot;</span>
            </label>
          </div>

          <div className="ft-section-title">Parâmetros de Geração</div>
          <div className="ft-grid">
            <label className="ft-field">
              <span>Nº de registros (máx. 100)</span>
              <input type="number" min={1} max={100} value={form.numRegistros} onChange={e => update('numRegistros', Number(e.target.value))} disabled={running} />
            </label>
            <label className="ft-field">
              <span>Intervalo entre envios (ms)</span>
              <input type="number" min={0} max={5000} step={100} value={form.delayMs} onChange={e => update('delayMs', Number(e.target.value))} disabled={running} />
            </label>
            <label className="ft-field">
              <span>Parceiro de captura</span>
              <input type="text" value={form.capturePartner} onChange={e => update('capturePartner', e.target.value)} disabled={running} />
            </label>
            <label className="ft-field ft-field-wide">
              <span>Customers ID (separados por vírgula — sorteado por transação)</span>
              <input type="text" placeholder="137, 129, 142" value={form.customersIdList} onChange={e => update('customersIdList', e.target.value)} disabled={running} />
            </label>
            <label className="ft-field ft-field-wide">
              <span>Documentos / MIDs (separados por vírgula)</span>
              <input type="text" placeholder="99999999999999, 10101010101010" value={form.documentsList} onChange={e => update('documentsList', e.target.value)} disabled={running} />
            </label>
            <label className="ft-field">
              <span>Adquirentes (separados por vírgula)</span>
              <input type="text" value={form.acquirerList} onChange={e => update('acquirerList', e.target.value)} disabled={running} />
            </label>
            <label className="ft-field">
              <span>Bandeiras (separadas por vírgula)</span>
              <input type="text" value={form.brandsList} onChange={e => update('brandsList', e.target.value)} disabled={running} />
            </label>
            <label className="ft-field ft-field-wide">
              <span>Webhook de callback (opcional)</span>
              <input type="text" placeholder="https://webhook.site/..." value={form.webhookUrl} onChange={e => update('webhookUrl', e.target.value)} disabled={running} />
            </label>
          </div>

          <div className="ft-action-bar">
            <label className="ft-field ft-checkbox ft-dryrun">
              <input type="checkbox" checked={form.dryRun} onChange={e => update('dryRun', e.target.checked)} disabled={running} />
              <span>Modo simulação (gera os payloads sem enviar ao gateway)</span>
            </label>
            <div className="ft-action-buttons">
              {running && (
                <button type="button" className="ft-cancel-btn" onClick={cancelRun}>Cancelar</button>
              )}
              <button type="submit" disabled={running} className="ft-submit-btn">
                {running ? <><Loader2 size={16} className="ft-spin" /> Gerando...</> : <><Play size={16} /> {form.dryRun ? 'Simular' : 'Gerar e Enviar'}</>}
              </button>
            </div>
          </div>

          {formError && <div className="ft-error">{formError}</div>}
        </form>

        <div className="ft-results">
          <div className="ft-results-header">
            <h3>Resultados</h3>
            {summary && (
              <div className="ft-summary">
                <span className="ft-summary-chip ft-summary-total">{summary.total} total</span>
                <span className="ft-summary-chip ft-summary-success"><CheckCircle2 size={13} /> {summary.success}</span>
                {summary.failed > 0 && <span className="ft-summary-chip ft-summary-failed"><XCircle size={13} /> {summary.failed}</span>}
              </div>
            )}
            {running && !summary && (
              <span className="ft-progress-label">{results.length}/{form.numRegistros}</span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="ft-empty">Nenhuma transação gerada ainda. Configure os parâmetros e clique em {form.dryRun ? '"Simular"' : '"Gerar e Enviar"'}.</div>
          ) : (
            <div className="ft-table-wrap">
              <table className="ft-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>UUID</th>
                    <th>Customer</th>
                    <th>Documento</th>
                    <th>Valor</th>
                    <th>Parc.</th>
                    <th>Bandeira</th>
                    <th>Adquirente</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.index} className={r.success ? '' : 'ft-row-error'}>
                      <td>{r.index}</td>
                      <td className="ft-mono" title={r.uuid}>{r.uuid.slice(0, 8)}…</td>
                      <td className="ft-mono">{r.customersId ?? '—'}</td>
                      <td className="ft-mono">{r.documento}</td>
                      <td>{formatValor(r.valor)}</td>
                      <td>{r.parcelas}</td>
                      <td>{r.bandeira}</td>
                      <td>{r.adquirente}</td>
                      <td>
                        {r.success ? (
                          <span className="ft-status ft-status-ok"><CheckCircle2 size={13} /> {r.status ?? 'OK'}</span>
                        ) : (
                          <span className="ft-status ft-status-fail" title={r.error ?? undefined}><XCircle size={13} /> {r.status ?? 'Erro'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .ft-root { display: flex; flex-direction: column; gap: 20px; }
        .ft-hero { display: flex; align-items: center; gap: 14px; }
        .ft-hero-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: var(--accent-blue-light); color: var(--accent-blue); flex-shrink: 0; }
        .ft-hero-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .ft-hero-subtitle { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }

        .ft-warning { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--accent-amber-light); color: var(--accent-amber); font-size: 12.5px; line-height: 1.5; }

        .ft-body { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
        @media (max-width: 1024px) { .ft-body { grid-template-columns: 1fr; } }

        .ft-form { background: var(--bg-card-solid); border: 1px solid var(--border-primary); border-radius: var(--radius-surface); padding: 22px; display: flex; flex-direction: column; gap: 8px; }
        .ft-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-tertiary); margin: 14px 0 4px; }
        .ft-section-title:first-child { margin-top: 0; }
        .ft-hint { font-style: normal; font-weight: 400; color: var(--accent-emerald); }

        .ft-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ft-field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--text-secondary); }
        .ft-field-wide { grid-column: 1 / -1; }
        .ft-field input[type="text"], .ft-field input[type="url"], .ft-field input[type="number"], .ft-field input[type="password"], .ft-field select {
          background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 9px 11px; font-size: 13px; color: var(--text-primary); outline: none;
        }
        .ft-field input:focus, .ft-field select:focus { border-color: var(--accent-blue); }
        .ft-field input:disabled, .ft-field select:disabled { opacity: 0.6; }
        .ft-checkbox { flex-direction: row; align-items: center; gap: 8px; font-size: 12.5px; }
        .ft-checkbox input { width: 15px; height: 15px; }
        .ft-token-row { display: flex; gap: 6px; }
        .ft-token-row input { flex: 1; }
        .ft-token-toggle { background: var(--bg-primary); border: 1px solid var(--border-primary); border-radius: 10px; padding: 0 10px; color: var(--text-tertiary); cursor: pointer; }

        .ft-action-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-primary); flex-wrap: wrap; }
        .ft-dryrun { font-weight: 600; color: var(--text-primary); }
        .ft-action-buttons { display: flex; gap: 8px; }
        .ft-submit-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--accent-blue); color: #fff; border: none; border-radius: 12px; padding: 10px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
        .ft-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ft-cancel-btn { background: transparent; border: 1px solid var(--border-primary); color: var(--text-secondary); border-radius: 12px; padding: 10px 16px; font-size: 13px; cursor: pointer; }
        .ft-spin { animation: ft-spin 0.8s linear infinite; }
        @keyframes ft-spin { to { transform: rotate(360deg); } }

        .ft-error { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: var(--accent-rose-light); color: var(--accent-rose); font-size: 12.5px; }

        .ft-results { background: var(--bg-card-solid); border: 1px solid var(--border-primary); border-radius: var(--radius-surface); padding: 22px; display: flex; flex-direction: column; gap: 12px; min-height: 320px; }
        .ft-results-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .ft-results-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .ft-summary { display: flex; gap: 6px; }
        .ft-summary-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
        .ft-summary-total { background: var(--bg-secondary); color: var(--text-secondary); }
        .ft-summary-success { background: var(--accent-emerald-light, var(--accent-emerald)); color: var(--accent-emerald); background: color-mix(in srgb, var(--accent-emerald) 15%, transparent); }
        .ft-summary-failed { background: color-mix(in srgb, var(--accent-rose) 15%, transparent); color: var(--accent-rose); }
        .ft-progress-label { font-size: 12px; color: var(--text-tertiary); font-variant-numeric: tabular-nums; }

        .ft-empty { flex: 1; display: flex; align-items: center; justify-content: center; text-align: center; color: var(--text-tertiary); font-size: 13px; padding: 30px 10px; }

        .ft-table-wrap { overflow-x: auto; }
        .ft-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .ft-table th { text-align: left; color: var(--text-tertiary); font-weight: 600; padding: 6px 8px; border-bottom: 1px solid var(--border-primary); white-space: nowrap; }
        .ft-table td { padding: 7px 8px; border-bottom: 1px solid var(--border-primary); color: var(--text-primary); white-space: nowrap; }
        .ft-row-error td { color: var(--accent-rose); }
        .ft-mono { font-family: monospace; font-size: 11.5px; }
        .ft-status { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; }
        .ft-status-ok { color: var(--accent-emerald); }
        .ft-status-fail { color: var(--accent-rose); }
      `}</style>
    </div>
  );
}
