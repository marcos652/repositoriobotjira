'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GitBranch, Link2, Loader2, Search, X } from 'lucide-react';

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

/**
 * Caixa de busca de issue com sugestões. Compartilhada pelos dois usos da tela — vincular um
 * ticket de origem e escolher a demanda pai — porque a mecânica é idêntica: digita, espera,
 * escolhe. O que muda é o `alvo`, que diz ao servidor quais issues podem aparecer.
 */
export function BuscaIssue({
  alvo,
  placeholder,
  desabilitado,
  onEscolher,
}: {
  alvo?: 'pai';
  placeholder: string;
  desabilitado?: boolean;
  onEscolher: (s: Sugestao) => void;
}) {
  const [termo, setTermo] = useState('');
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [chaveInexistente, setChaveInexistente] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState<string | null>(null);
  const caixaRef = useRef<HTMLDivElement>(null);

  const termoLimpo = termo.trim();
  const visiveis = termoLimpo.length < 2 ? [] : sugestoes;

  useEffect(() => {
    const q = termoLimpo;
    if (q.length < 2) return;

    let vivo = true;
    const t = setTimeout(() => {
      setBuscando(true);
      const url = `/api/jira/buscar-issue?q=${encodeURIComponent(q)}${alvo ? `&alvo=${alvo}` : ''}`;
      void fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!vivo || !j?.success) return;
          setSugestoes(j.sugestoes || []);
          setChaveInexistente(!!j.chaveInexistente);
          setMotivoRecusa(j.motivoRecusa || null);
          setAberto(true);
        })
        .catch(() => { /* a busca é auxiliar: falhar não pode travar o formulário */ })
        .finally(() => { if (vivo) setBuscando(false); });
    }, 350);

    return () => { vivo = false; clearTimeout(t); };
  }, [termoLimpo, alvo]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const escolher = (s: Sugestao) => {
    onEscolher(s);
    setTermo('');
    setSugestoes([]);
    setAberto(false);
  };

  return (
    <div className="vi-busca" ref={caixaRef}>
      <div className={`vi-campo ${desabilitado ? 'vi-campo-off' : ''}`}>
        <Search size={13} aria-hidden="true" />
        <input
          disabled={desabilitado}
          value={desabilitado ? '' : termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => { if (visiveis.length > 0) setAberto(true); }}
          onKeyDown={(e) => {
            // Enter escolhe a primeira sugestão. Sem interceptar, enviaria o formulário e
            // criaria a demanda no meio da busca.
            if (e.key === 'Enter') {
              e.preventDefault();
              if (visiveis[0]) escolher(visiveis[0]);
            }
            if (e.key === 'Escape') setAberto(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {buscando && <Loader2 size={13} className="vi-spin" aria-hidden="true" />}
      </div>

      {!desabilitado && aberto && (visiveis.length > 0 || chaveInexistente || motivoRecusa) && (
        <div className="vi-lista" role="listbox">
          {/* Motivo da recusa vem antes: dizer "essa é subtarefa e não pode ser pai" é mais útil
              que uma lista vazia. */}
          {motivoRecusa && <p className="vi-vazio">{motivoRecusa}</p>}
          {chaveInexistente && !motivoRecusa && <p className="vi-vazio">Nenhuma issue com essa chave. Confira o número.</p>}
          {visiveis.map((s) => (
            <button key={s.key} type="button" className="vi-item" onClick={() => escolher(s)} role="option" aria-selected={false}>
              <span className="vi-item-key">{s.key}</span>
              <span className="vi-item-sum">{s.summary || '(sem título)'}</span>
              {(s.tipo || s.status) && <span className="vi-item-status">{s.tipo || s.status}</span>}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .vi-busca { position: relative; flex: 1; min-width: 0; }
        .vi-campo {
          min-height: 38px; display: flex; align-items: center; gap: 7px; padding: 0 10px;
          border: 1px solid var(--border-primary); border-radius: 8px;
          background: var(--bg-primary); color: var(--text-primary); font-size: 12px;
        }
        .vi-campo input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; outline: none; }
        .vi-campo input:disabled { cursor: not-allowed; }
        .vi-campo-off { opacity: .5; }
        .vi-spin { animation: viSpin 1s linear infinite; }
        @keyframes viSpin { to { transform: rotate(360deg); } }
        .vi-lista {
          position: absolute; top: 100%; left: 0; right: 0; z-index: 40; margin-top: 4px;
          max-height: 260px; overflow-y: auto; border: 1px solid var(--border-primary);
          border-radius: 10px; background: var(--bg-card-solid); box-shadow: 0 12px 28px rgba(0,0,0,.28);
        }
        .vi-vazio { margin: 0; padding: 12px 14px; font-size: 11px; color: var(--accent-amber); }
        .vi-item {
          width: 100%; display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 9px;
          align-items: center; padding: 9px 12px; border: 0; border-bottom: 1px solid var(--border-secondary);
          background: transparent; text-align: left; cursor: pointer; font: inherit;
        }
        .vi-item:last-child { border-bottom: 0; }
        .vi-item:hover { background: var(--bg-secondary); }
        .vi-item-key { font-size: 11px; font-weight: 800; color: var(--accent-blue); }
        .vi-item-sum { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vi-item-status { font-size: 9px; font-weight: 700; color: var(--text-tertiary); white-space: nowrap; }
      `}</style>
    </div>
  );
}

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
  const [tipoVinculo, setTipoVinculo] = useState('relates');

  // "Não necessário" LIMPA os vínculos: manter uma pill de SUP-123 embaixo de "não há ticket de
  // origem" seria a tela afirmando duas coisas contrárias, e a demanda sairia com o vínculo que
  // a pessoa acabou de dizer que não existe.
  const trocarTipo = (valor: string) => {
    if (valor === SEM_VINCULO) {
      onDispensadoChange(true);
      if (vinculos.length > 0) onChange([]);
      return;
    }
    onDispensadoChange(false);
    setTipoVinculo(valor);
  };

  const adicionar = (s: Sugestao) => {
    // Já vinculada: não duplica nem mostra erro — o resultado desejado (a issue está
    // vinculada) já está valendo.
    if (!vinculos.some((v) => v.key === s.key)) {
      onChange([...vinculos, { key: s.key, summary: s.summary, tipoVinculo }]);
    }
  };

  return (
    <div className="vi-root">
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

        <BuscaIssue
          placeholder={dispensado ? 'Sem ticket de origem' : 'SUP-21193, ou parte do texto do ticket...'}
          desabilitado={dispensado}
          onEscolher={adicionar}
        />
      </div>

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

// ─── Demanda pai ───────────────────────────────────────────────────────────────

export interface DemandaPai {
  key: string;
  summary: string;
  tipo: string | null;
}

/**
 * Escolhe a demanda PAI da que está sendo criada.
 *
 * O aviso sobre virar Subtarefa não é enfeite: no DSMM a única hierarquia existente é Subtarefa
 * (nível -1) sob um item de nível 0 — o projeto não tem tipo Épico. Então escolher um pai
 * SOBRESCREVE o tipo que a IA sugeriu, e quem cria precisa saber disso antes de enviar, não
 * depois de ver a demanda no board como subtarefa.
 */
export function VincularPai({
  pai,
  onChange,
  carregando,
  erro,
}: {
  pai: DemandaPai | null;
  onChange: (p: DemandaPai | null) => void;
  /** true enquanto um pai vindo da URL está sendo conferido no Jira. */
  carregando?: boolean;
  /** Motivo de um pai vindo da URL ter sido recusado. */
  erro?: string | null;
}) {
  if (carregando) {
    return (
      <div className="vp-root">
        <label className="vp-label"><GitBranch size={11} /> Demanda pai (opcional)</label>
        <div className="vp-carregando">
          <Loader2 size={12} className="vi-spin" aria-hidden="true" />
          Conferindo a demanda pai no Jira...
        </div>
        <style jsx>{`
          .vp-root { display: flex; flex-direction: column; gap: 6px; }
          .vp-label { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
          .vp-carregando { display: flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 10px; border: 1px solid var(--border-primary); border-radius: 8px; font-size: 11px; color: var(--text-tertiary); }
          .vi-spin { animation: viSpin 1s linear infinite; }
          @keyframes viSpin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="vp-root">
      <label className="vp-label"><GitBranch size={11} /> Demanda pai (opcional)</label>

      {pai ? (
        <div className="vp-escolhida">
          <GitBranch size={12} aria-hidden="true" />
          <div className="vp-info">
            <span className="vp-key">{pai.key}{pai.tipo ? ` · ${pai.tipo}` : ''}</span>
            <span className="vp-sum">{pai.summary || '(sem título)'}</span>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Remover demanda pai">
            <X size={11} />
          </button>
        </div>
      ) : (
        <BuscaIssue
          alvo="pai"
          placeholder="DSMM-202, ou parte do título da demanda pai..."
          onEscolher={(s) => onChange({ key: s.key, summary: s.summary, tipo: s.tipo })}
        />
      )}

      {/* Recusa de um pai vindo da URL: sem isso a tela abriria sem pai e sem explicação, e a
          pessoa acharia que o botão "Criar item filho" não funcionou. */}
      {erro && <p className="vp-erro">{erro}</p>}

      {pai && (
        <p className="vp-aviso">
          Esta demanda será criada como <strong>Subtarefa</strong> de {pai.key} — é o único nível
          do DSMM que aceita uma demanda comum como pai, então o tipo sugerido pela IA é
          substituído.
        </p>
      )}

      <style jsx>{`
        .vp-root { display: flex; flex-direction: column; gap: 6px; }
        .vp-label { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .04em; }
        .vp-escolhida {
          display: flex; align-items: center; gap: 9px; min-height: 38px; padding: 6px 10px;
          border: 1px solid var(--accent-violet-light); border-radius: 8px;
          background: var(--accent-violet-light); color: var(--accent-violet);
        }
        .vp-info { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
        .vp-key { font-size: 11px; font-weight: 800; }
        .vp-sum { font-size: 10px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vp-escolhida button { display: flex; margin-left: auto; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; opacity: .7; }
        .vp-escolhida button:hover { opacity: 1; }
        .vp-aviso { margin: 0; font-size: 10px; line-height: 15px; color: var(--text-tertiary); }
        .vp-aviso strong { color: var(--accent-violet); }
        .vp-erro { margin: 0; font-size: 10px; line-height: 15px; color: var(--accent-rose); }
      `}</style>
    </div>
  );
}
