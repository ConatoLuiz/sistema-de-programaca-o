import React from 'react';
import { ContratoId } from '../types';

interface HeaderProps {
  contrato: ContratoId;
  onMudarContrato: (c: ContratoId) => void;
  onSincronizar: () => void;
  isSyncing: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onAbrirModalWindows: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  contrato,
  onMudarContrato,
  onSincronizar,
  isSyncing,
  isDark,
  onToggleTheme,
  onAbrirModalWindows,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--border-light)] border-t-4 border-t-[var(--brand-accent)] px-4 py-2.5 rounded-[var(--radius-lg)] mb-3 shadow-[var(--shadow-sm)] sticky top-2 z-[2500] transition-all">
      {/* Brand logo & title */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-lg shadow-sm">
          <i className="fa-solid fa-bolt"></i>
        </div>
        <div>
          <h1 className="text-base font-extrabold text-[var(--brand-dark)] tracking-tight leading-tight">
            Portal de Gestão Operacional &amp; Obras
          </h1>
          <p className="text-[10px] text-[var(--text-muted)] font-medium leading-none">
            Desktop &amp; Web · Angra dos Reis &amp; Magé
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={contrato}
          onChange={(e) => onMudarContrato(e.target.value as ContratoId)}
          className="bg-[var(--bg-surface)] border-2 border-[var(--brand-accent)] text-[var(--text-main)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold cursor-pointer outline-none transition-all shadow-sm focus:ring-2 focus:ring-[var(--brand-accent)]"
        >
          <option value="angra">Contrato: Angra dos Reis</option>
          <option value="mage">Contrato: Magé</option>
        </select>

        <button
          onClick={onSincronizar}
          disabled={isSyncing}
          className="bg-[var(--brand-primary)] hover:brightness-110 active:scale-95 text-white border-none px-3.5 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-70"
          title="Sincronizar planilhas Google na nuvem"
        >
          <i className={`fa-solid fa-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
          <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Planilhas'}</span>
        </button>

        <button
          onClick={onAbrirModalWindows}
          className="bg-[var(--card-subtle)] hover:bg-[var(--brand-light)] border border-[var(--border-light)] text-[var(--text-secondary)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm"
          title="Ver guia e arquivos do executável Windows (.exe)"
        >
          <i className="fa-brands fa-windows text-[#0284c7]"></i>
          <span>Gerar .EXE Windows</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm hover:border-[var(--brand-accent)]"
          title="Alternar entre tema Claro e Escuro"
        >
          <i className={`fa-solid ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-500'}`}></i>
          <span>{isDark ? 'Claro' : 'Escuro'}</span>
        </button>
      </div>
    </header>
  );
};
