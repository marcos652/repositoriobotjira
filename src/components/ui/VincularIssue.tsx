'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, Loader2, Search, X } from 'lucide-react';

// Campo para vincular a demanda nova a uma issue que já existe — o caso de uso é "esta demanda
// nasceu de um ticket do suporte": digita SUP-211, ele sugere, você escolhe.

export interface IssueVinculada {
  key: string;
  summary: string;
  tipoVinculo: string;
}

interface Sugestao {
  key: string;
  summary: string;
  status: string | null;
  categoria: string | null;
  tipo: string | null;
  projeto: string | null;
  exata: boolean;
}

const TIPOS = [
  { id: 'relates', label: 'Relaciona-se com' },
  { id: 'causedBy', label: 'É causada por' },
  { id: 'escalation', label: 'É escalação de' },
];

/**
 * Escolha que dispensa o vínculo. Fica no MESMO seletor dos tipos porque é a mesma pergunta
 * respondida de outra forma: "de onde veio esta demanda?" — de tal ticket, ou de lugar nenhum.
 * Separar num checkbox faria a pessoa ter que entender dois controles para uma decisão.
 */
export const SEM_VINCULO = 'naoNecessario';

export default function VincularIssue({
  vinculos,
  onChange,
  dispensado,
  onDispensadoChange,
}: {
  vinculos: IssueVinculada[];
  onChange: (v: IssueVinculada[]) => void;
  /** true quando a pessoa marcou que não há ticket de origem. */
  dispensado: boolean;
  onDispensadoChange: (v: boolean) => void;
}) {
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [chaveInexistente, setChaveInexistente] = useState(false);
  const [tipoVinculo, setTipoVinculo] = useState('relates');

  // "Não necessário" LIMPA os vínculos: manter uma pill de SUP-123 embaixo de "não há ticket de
  // origem" seria a tela afirmando duas coisas contrárias, e a demanda sairia com o vínculo que
  // a pessoa acabou de dizer que não existe.
  const trocarTipo = (valor: string) => {
    if (valor === SEM_VINCULO) {
      onDispensadoChange(true);
      if (vinculos.length > 0) onChange([]);
      setTermo('');
      setAberto(false);
      return;
    }
    onDispensadoChange(false);
    setTipoVinculo(valor);
  };
  const caixaRef = useRef<HTMLDivElement>(null);

  // Espera 350ms depois da última tecla. Sem isso cada tecla dispara uma busca no Jira, que
  // leva ~700ms: digitar "SUP-211" abriria sete chamadas e as respostas chegariam fora de
  // ordem, fazendo a lista piscar resultados de termos antigos.
  const termoLimpo = termo.trim();
  // Curto demais: some da lista SEM mexer em estado. Zerar as sugestões dentro do efeito
  // dispararia renderização em cascata (a regra set-state-in-effect do projeto), e o resultado
  // é o mesmo — derivar na renderização é mais simples e mais barato.
  const sugestoesVisiveis = termoLimpo.length < 2 ? [] : sugestoes;

  useEffect(() => {
    const q = termoLimpo;
    if (q.length < 2) return;

    let vivo = true;
    const t = setTimeout(() => {
      // setBuscando entra aqui, e não no corpo do efeito: o giro só deve aparecer quando a
      // chamada de fato começa, depois dos 350ms de espera.
      setBuscando(true);
      void fetch(`/api/jira/buscar-issue?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!vivo || !j?.success) return;
          setSugestoes(j.sugestoes || []);
          setChaveInexistente(!!j.chaveInexistente);
          setAberto(true);
        })
        .catch(() => { /* a busca é auxiliar: falhar não pode travar o formulário */ })
        .finally(() => { if (vivo) setBuscando(false); });
    }, 350);

    return () => { vivo = false; clearTimeout(t); };
  }, [termoLimpo]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const adicionar = useCallback((s: Sugestao) => {
    // Já vinculada: não duplica nem mostra erro — o resultado desejado (a issue está
    // vinculada) já está valendo, então só limpa o campo.
    if (!vinculos.some((v) => v.key === s.key)) {
      onChange([...vinculos, { key: s.key, summary: s.summary, tipoVinculo }]);
    }
    setTermo('');
    setSugestoes([]);
    setAberto(false);
  }, [vinculos, onChange, tipoVinculo]);

  return (
    <div className="vi-root" ref={caixaRef}>
      <label className="vi-label"><Link2 size={11} /> Vincular a um ticket ou demanda</label>

      <div className="vi-linha">
        <select
          value={dispensado ? SEM_VINCULO : tipoVinculo}
          onChange={(e) => trocarTipo(e.target.value)}
          className="vi-tipo"
          aria-label="Tipo de vínculo"
        >
          {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          <option value={SEM_VINCULO}>Não necessário</option>
        </select>

        <div className={`vi-campo ${dispensado ? 'vi-campo-off' : ''}`}>
          <Search size={13} aria-hidden="true" />
          <input
            disabled={dispensado}
            value={dispensado ? '' : termo}
            onChange={(e) => setTermo(e.target.value)}
            onFocus={() => { if (sugestoesVisiveis.length > 0) setAberto(true); }}
            onKeyDown={(e) => {
              // Enter escolhe a primeira sugestão. Sem interceptar, o Enter enviaria o
              // formulário e criaria a demanda no meio da busca.
              if (e.key === 'Enter') {
                e.preventDefault();
                if (sugestoesVisiveis[0]) adicionar(sugestoesVisiveis[0]);
              }
              if (e.key === 'Escape') setAberto(false);
            }}
            placeholder={dispensado ? 'Sem ticket de origem' : 'SUP-21193, ou parte do texto do ticket...'}
            autoComplete="off"
          />
          {buscando && <Loader2 size={13} className="vi-spin" aria-hidden="true" />}
        </div>
      </div>

      {!dispensado && aberto && (sugestoesVisiveis.length > 0 || chaveInexistente) && (
        <div className="vi-lista" role="listbox">
          {chaveInexistente && (
            <p className="vi-vazio">Nenhuma issue com essa chave. Confira o número.</p>
          )}
          {sugestoesVisiveis.map((s) => (
            <button
              key={s.key}
              type="button"
              className="vi-item"
              onClick={() => adicionar(s)}
              role="option"
              aria-selected={false}
            >
              <span className="vi-item-key">{s.key}</span>
              <span className="vi-item-sum">{s.summary || '(sem título)'}</span>
              {/* O status só existe na busca por chave exata: o autocompletar do Jira devolve
                  apenas chave e resumo, e inventar um status seria pior que não mostrar. */}
              {s.status && <span className="vi-item-status">{s.status}</span>}
            </button>
          ))}
        </div>
      )}

      {dispensado && (
        <p className="vi-dispensado">
          Marcado como sem ticket de origem. A demanda será criada sem vínculo.
        </p>
      )}

      {!dispensado && vinculos.length === 0 && (
        <p className="vi-exigido">
          Vincule o ticket que originou esta demanda, ou escolha <strong>Não necessário</strong>.
        </p>
      )}

      {vinculos.length > 0 && (
        <div className="vi-pills">
          {vinculos.map((v) => (
            <span key={v.key} className="vi-pill">
              <Link2 size={10} aria-hidden="true" />
              <strong>{v.key}</strong>
              <span className="vi-pill-tipo">
                {TIPOS.find((t) => t.id === v.tipoVinculo)?.label.toLowerCase()}
              </span>
              <button
                type="button"
                onClick={() => onChange(vinculos.filter((x) => x.key !== v.key))}
                aria-label={`Remover ${v.key}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <style jsx>{`
        .vi-root { position: relative; display: flex; flex-direction: column; gap: 6px; }
        .vi-label { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
        .vi-linha { display: flex; gap: 8px; }
        .vi-tipo, .vi-campo {
          min-height: 38px;
          border: 1px solid var(--border-primary);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font: inherit;
          font-size: 12px;
        }
        .vi-tipo { flex: 0 0 auto; padding: 0 8px; cursor: pointer; outline: none; }
        .vi-campo { flex: 1; min-width: 0; display: flex; align-items: center; gap: 7px; padding: 0 10px; }
        .vi-campo input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; outline: none; }
        .vi-campo input:disabled { cursor: not-allowed; }
        .vi-campo-off { opacity: .5; }
        .vi-dispensado { margin: 0; font-size: 10px; color: var(--text-tertiary); }
        .vi-exigido { margin: 0; font-size: 10px; color: var(--accent-amber); }
        .vi-exigido strong { font-weight: 700; }
        .vi-spin { animation: viSpin 1s linear infinite; }
        @keyframes viSpin { to { transform: rotate(360deg); } }
        .vi-lista {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 40;
          margin-top: 4px;
          max-height: 260px;
          overflow-y: auto;
          border: 1px solid var(--border-primary);
          border-radius: 10px;
          background: var(--bg-card-solid);
          box-shadow: 0 12px 28px rgba(0,0,0,.28);
        }
        .vi-vazio { margin: 0; padding: 12px 14px; font-size: 11px; color: var(--accent-amber); }
        .vi-item {
          width: 100%;
          display: grid;
          grid-template-columns: auto minmax(0,1fr) auto;
          gap: 9px;
          align-items: center;
          padding: 9px 12px;
          border: 0;
          border-bottom: 1px solid var(--border-secondary);
          background: transparent;
          text-align: left;
          cursor: pointer;
          font: inherit;
        }
        .vi-item:last-child { border-bottom: 0; }
        .vi-item:hover { background: var(--bg-secondary); }
        .vi-item-key { font-size: 11px; font-weight: 800; color: var(--accent-blue); }
        .vi-item-sum { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vi-item-status { font-size: 9px; font-weight: 700; color: var(--text-tertiary); white-space: nowrap; }
        .vi-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .vi-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 999px;
          background: var(--accent-blue-light);
          color: var(--accent-blue);
          font-size: 10px;
          font-weight: 700;
        }
        .vi-pill-tipo { font-weight: 500; opacity: .75; }
        .vi-pill button { display: flex; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; opacity: .7; }
        .vi-pill button:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
