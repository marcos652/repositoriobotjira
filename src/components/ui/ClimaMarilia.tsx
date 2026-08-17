'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudSnow, Moon, Sun, Umbrella } from 'lucide-react';

// Tempo agora em Marília/SP, ao lado da saudação do Overview.
//
// Falha em silêncio de propósito: se a Open-Meteo estiver fora, o componente não renderiza
// nada. É um indicador de cabeçalho — mostrar "erro ao buscar o tempo" ao lado de "Boa tarde"
// chamaria atenção para algo que não afeta o trabalho de ninguém.

type TipoTempo = 'sol' | 'nuvem' | 'chuva' | 'tempestade' | 'neve' | 'nevoeiro';

interface HoraPrevista {
  hora: string;
  temperatura: number;
  chuva: number;
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
        .catch(() => { /* indicador: sem clima, sem aviso */ });
    });
    return () => { ativo = false; window.cancelAnimationFrame(frame); };
  }, []);

  if (!clima) return null;

  // Céu limpo à noite não é "sol": o ícone viraria uma mentira visual às 22h.
  const noiteLimpa = clima.tipo === 'sol' && !clima.dia;
  const { Icone, cor } = noiteLimpa ? { Icone: Moon, cor: '#A5B4FC' } : VISUAL[clima.tipo];

  const dica = [
    `${clima.descricao} em ${clima.cidade}`,
    clima.sensacao !== null ? `sensação ${clima.sensacao}°C` : null,
    clima.vento !== null ? `vento ${clima.vento} km/h` : null,
    clima.umidade !== null ? `umidade ${clima.umidade}%` : null,
    clima.horas.length > 0
      ? `Próximas horas: ${clima.horas.map((h) => `${h.hora} ${h.temperatura}°${h.chuva > 0 ? ` (${h.chuva}% chuva)` : ''}`).join(' · ')}`
      : null,
    clima.velho ? 'dado da última leitura disponível' : null,
  ].filter(Boolean).join(' · ');

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
        style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border-primary)' }}
        title={dica}
      >
        <Icone size={18} style={{ color: cor }} aria-hidden="true" />
        <span className="flex flex-col leading-none">
          <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {clima.temperatura}°C
            {/* Máx/mín dá o contexto que a temperatura sozinha não dá: 30°C subindo é
                diferente de 30°C caindo. */}
            {clima.maxima !== null && clima.minima !== null && (
              <span className="font-semibold ml-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {clima.maxima}° / {clima.minima}°
              </span>
            )}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {clima.cidade} · {clima.descricao}
          </span>
        </span>
      </span>

      {/* Sobe para a área visível só acima de 50%: abaixo disso é curiosidade, e um aviso que
          aparece sempre deixa de ser aviso. */}
      {clima.alertaChuva && (
        <span
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
          style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8' }}
          title={`${clima.alertaChuva.probabilidade}% de chance de chuva às ${clima.alertaChuva.hora}`}
        >
          <Umbrella size={13} aria-hidden="true" />
          {clima.alertaChuva.probabilidade}% às {clima.alertaChuva.hora}
        </span>
      )}
    </span>
  );
}
