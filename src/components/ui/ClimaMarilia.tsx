'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudSnow, Moon, Sun, Umbrella } from 'lucide-react';

// Tempo em Marília/SP no cabeçalho do Overview, no formato do widget de tempo do iPhone:
// fundo em degradê que muda com a condição, temperatura grande e leve, máx/mín, e uma faixa
// com as próximas horas.
//
// Falha em silêncio de propósito: se a Open-Meteo estiver fora, o componente não renderiza
// nada. É um indicador de cabeçalho — "erro ao buscar o tempo" ao lado de "Boa tarde" chamaria
// atenção para algo que não afeta o trabalho de ninguém.

type TipoTempo = 'sol' | 'nuvem' | 'chuva' | 'tempestade' | 'neve' | 'nevoeiro';

interface HoraPrevista {
  hora: string;
  temperatura: number;
  chuva: number;
  tipo: TipoTempo;
  dia: boolean;
}

interface Clima {
  cidade: string;
  temperatura: number;
  sensacao: number | null;
  tipo: TipoTempo;
  descricao: string;
  dia: boolean;
  vento: number | null;
  umidade: number | null;
  minima: number | null;
  maxima: number | null;
  horas: HoraPrevista[];
  alertaChuva: { hora: string; probabilidade: number } | null;
  velho?: boolean;
}

const ICONE: Record<TipoTempo, typeof Sun> = {
  sol: Sun,
  nuvem: Cloud,
  chuva: CloudDrizzle,
  tempestade: CloudLightning,
  neve: CloudSnow,
  nevoeiro: CloudFog,
};

// O degradê é o que dá a cara do widget do iPhone: o fundo conta a condição antes de qualquer
// texto ser lido. Cada par tem versão de dia e de noite — o mesmo azul claro às 23h pareceria
// um card quebrado.
const FUNDO: Record<TipoTempo, { dia: string; noite: string }> = {
  sol:        { dia: 'linear-gradient(160deg,#3B82F6 0%,#60A5FA 55%,#93C5FD 100%)', noite: 'linear-gradient(160deg,#0F172A 0%,#1E293B 55%,#334155 100%)' },
  nuvem:      { dia: 'linear-gradient(160deg,#64748B 0%,#94A3B8 100%)',             noite: 'linear-gradient(160deg,#1E293B 0%,#475569 100%)' },
  chuva:      { dia: 'linear-gradient(160deg,#1E4E79 0%,#3B82A6 100%)',             noite: 'linear-gradient(160deg,#0C1A2B 0%,#1E3A54 100%)' },
  tempestade: { dia: 'linear-gradient(160deg,#312E5B 0%,#5B4B8A 100%)',             noite: 'linear-gradient(160deg,#1A1633 0%,#3B2F63 100%)' },
  neve:       { dia: 'linear-gradient(160deg,#64748B 0%,#CBD5E1 100%)',             noite: 'linear-gradient(160deg,#1E293B 0%,#64748B 100%)' },
  nevoeiro:   { dia: 'linear-gradient(160deg,#6B7280 0%,#9CA3AF 100%)',             noite: 'linear-gradient(160deg,#1F2937 0%,#4B5563 100%)' },
};

export default function ClimaMarilia() {
  const [clima, setClima] = useState<Clima | null>(null);

  useEffect(() => {
    let ativo = true;
    const frame = window.requestAnimationFrame(() => {
      void fetch('/api/clima')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (ativo && j?.success) setClima(j as Clima); })
        .catch(() => { /* indicador: sem clima, sem aviso */ });
    });
    return () => { ativo = false; window.cancelAnimationFrame(frame); };
  }, []);

  if (!clima) return null;

  // Céu limpo à noite não é "sol": o ícone viraria uma mentira visual às 22h.
  const noiteLimpa = clima.tipo === 'sol' && !clima.dia;
  const Icone = noiteLimpa ? Moon : ICONE[clima.tipo];
  const fundo = clima.dia ? FUNDO[clima.tipo].dia : FUNDO[clima.tipo].noite;

  const dica = [
    `${clima.descricao} em ${clima.cidade}`,
    clima.sensacao !== null ? `sensação ${clima.sensacao}°C` : null,
    clima.vento !== null ? `vento ${clima.vento} km/h` : null,
    clima.umidade !== null ? `umidade ${clima.umidade}%` : null,
    clima.velho ? 'dado da última leitura disponível' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-3xl select-none"
      style={{
        width: '272px',
        background: fundo,
        // Texto branco fixo, e não var(--text-*): o fundo é sempre escuro/saturado, então ele
        // não deve seguir o tema claro/escuro do painel.
        color: '#fff',
        boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
      }}
      title={dica}
    >
      {/* Topo: cidade + condição de um lado, ícone grande do outro */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate" style={{ opacity: 0.95 }}>
            {clima.cidade}
          </p>
          <p className="text-[11px] leading-tight mt-0.5 truncate" style={{ opacity: 0.75 }}>
            {clima.descricao}
          </p>
          {/* font-light e tamanho grande: é o que faz o número parecer o do app do iPhone. */}
          <p className="text-[40px] font-light leading-none tabular-nums mt-1.5">
            {clima.temperatura}°
          </p>
        </div>
        <Icone size={44} strokeWidth={1.5} style={{ opacity: 0.95, flexShrink: 0 }} aria-hidden="true" />
      </div>

      {/* Máx/mín: contexto que a temperatura sozinha não dá — 30° subindo é diferente de 30° caindo */}
      {clima.maxima !== null && clima.minima !== null && (
        <p className="text-[11px] font-semibold tabular-nums" style={{ opacity: 0.85 }}>
          Máx {clima.maxima}°   Mín {clima.minima}°
          {clima.sensacao !== null && (
            <span style={{ opacity: 0.75 }}>   Sensação {clima.sensacao}°</span>
          )}
        </p>
      )}

      {/* Aviso de chuva só acima de 50%: abaixo disso é curiosidade, e um aviso que aparece
          sempre deixa de ser aviso. */}
      {clima.alertaChuva && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
          style={{ background: 'rgba(255,255,255,0.18)' }}
        >
          <Umbrella size={13} aria-hidden="true" />
          {clima.alertaChuva.probabilidade}% de chuva às {clima.alertaChuva.hora}
        </div>
      )}

      {/* Faixa das próximas horas, como a do app: hora, ícone, temperatura */}
      {clima.horas.length > 0 && (
        <div
          className="flex items-start justify-between gap-1 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.22)' }}
        >
          {clima.horas.slice(0, 5).map((h) => {
            const IconeHora = h.tipo === 'sol' && !h.dia ? Moon : ICONE[h.tipo];
            return (
              <div key={h.hora} className="flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] font-semibold tabular-nums" style={{ opacity: 0.8 }}>
                  {h.hora}
                </span>
                <IconeHora size={15} strokeWidth={1.8} style={{ opacity: 0.95 }} aria-hidden="true" />
                <span className="text-[11px] font-bold tabular-nums">{h.temperatura}°</span>
                {/* A porcentagem aparece só quando existe: uma coluna de "0%" repetido seria
                    ruído numa faixa desse tamanho. */}
                {h.chuva > 0 && (
                  <span className="text-[9px] font-semibold tabular-nums" style={{ opacity: 0.8 }}>
                    {h.chuva}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
