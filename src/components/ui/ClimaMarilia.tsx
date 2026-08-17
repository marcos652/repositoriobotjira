'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudSnow, Moon, Sun } from 'lucide-react';

// Tempo agora em Marília/SP, ao lado da saudação do Overview.
//
// Falha em silêncio de propósito: se a Open-Meteo estiver fora, o componente não renderiza
// nada. É um enfeite do cabeçalho — mostrar "erro ao buscar o tempo" ao lado de "Boa tarde"
// chamaria atenção para algo que não afeta o trabalho de ninguém.

type TipoTempo = 'sol' | 'nuvem' | 'chuva' | 'tempestade' | 'neve' | 'nevoeiro';

interface Clima {
  cidade: string;
  temperatura: number;
  sensacao: number | null;
  tipo: TipoTempo;
  descricao: string;
  dia: boolean;
  velho?: boolean;
}

// Cada tipo tem ícone e cor próprios: com tudo cinza, a tempestade não se distinguiria do
// tempo nublado num relance, que é justamente para o que o indicador serve.
const VISUAL: Record<TipoTempo, { Icone: typeof Sun; cor: string }> = {
  sol: { Icone: Sun, cor: '#FBBF24' },
  nuvem: { Icone: Cloud, cor: '#94A3B8' },
  chuva: { Icone: CloudDrizzle, cor: '#38BDF8' },
  tempestade: { Icone: CloudLightning, cor: '#A78BFA' },
  neve: { Icone: CloudSnow, cor: '#BAE6FD' },
  nevoeiro: { Icone: CloudFog, cor: '#94A3B8' },
};

export default function ClimaMarilia() {
  const [clima, setClima] = useState<Clima | null>(null);

  useEffect(() => {
    let ativo = true;
    const frame = window.requestAnimationFrame(() => {
      void fetch('/api/clima')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (ativo && j?.success) setClima(j as Clima); })
        .catch(() => { /* enfeite: sem clima, sem aviso */ });
    });
    return () => { ativo = false; window.cancelAnimationFrame(frame); };
  }, []);

  if (!clima) return null;

  // Céu limpo à noite não é "sol": o ícone viraria uma mentira visual às 22h.
  const noiteLimpa = clima.tipo === 'sol' && !clima.dia;
  const { Icone, cor } = noiteLimpa ? { Icone: Moon, cor: '#A5B4FC' } : VISUAL[clima.tipo];

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
      style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)' }}
      title={
        `${clima.descricao} em ${clima.cidade}` +
        (clima.sensacao !== null ? ` · sensação de ${clima.sensacao}°C` : '') +
        (clima.velho ? ' · dado da última leitura disponível' : '')
      }
    >
      <Icone size={18} style={{ color: cor }} aria-hidden="true" />
      <div className="flex flex-col leading-none">
        <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {clima.temperatura}°C
        </span>
        <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
          {clima.cidade} · {clima.descricao}
        </span>
      </div>
    </div>
  );
}
