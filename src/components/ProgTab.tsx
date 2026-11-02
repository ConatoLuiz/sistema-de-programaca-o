import React, { useState, useMemo } from 'react';
import { ProgItem, ContratoId } from '../types';
import {
  money,
  brl,
  classificarStatusProg,
  formatarDataBR,
  esc,
} from '../utils/dataParser';

interface ProgTabProps {
  dados: ProgItem[];
  contrato: ContratoId;
  isConnected: boolean;
}

export const ProgTab: React.FC<ProgTabProps> = ({ dados, contrato, isConnected }) => {
  const [subTab, setSubTab] = useState<'dash' | 'week' | 'hist'>('dash');

  // Week calendar navigation
  const [semanaInicio, setSemanaInicio] = useState<Date>(() => {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() - hoje.getDay());
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  });

  // History filtering & pagination
  const [buscaHist, setBuscaHist] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroPrio, setFiltroPrio] = useState('');
  const [itensPorPagina, setItensPorPagina] = useState(50);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // SOB Detail Modal
  const [itemDetalhe, setItemDetalhe] = useState<ProgItem | null>(null);

  // Calculations for Prog Dashboard
  const dashInfo = useMemo(() => {
    const porDia: Record<
      string,
      {
        total: number;
        status: Record<string, number>;
        mk: number;
        cesto: number;
        lv: number;
        poda: number;
        custo: number;
        baremo: number;
      }
    > = {};

    let totalCusto = 0;
    let totalBaremo = 0;
    let totalMK = 0;
    let totalCesto = 0;
    let totalLV = 0;
    let totalPoda = 0;

    dados.forEach((x) => {
      const k = x.iso;
      if (!porDia[k]) {
        porDia[k] = {
          total: 0,
          status: {},
          mk: 0,
          cesto: 0,
          lv: 0,
          poda: 0,
          custo: 0,
          baremo: 0,
        };
      }
      porDia[k].total++;
      const c = classificarStatusProg(x.st);
      porDia[k].status[c] = (porDia[k].status[c] || 0) + 1;
      porDia[k].mk += x.mk;
      porDia[k].cesto += x.cesto;
      porDia[k].lv += x.lv;
      porDia[k].poda += x.poda;

      const cp = money(x.custoProg);
      const bp = money(x.baremoProg);
      porDia[k].custo += cp;
      porDia[k].baremo += bp;

      totalCusto += cp;
      totalBaremo += bp;
      totalMK += x.mk;
      totalCesto += x.cesto;
      totalLV += x.lv;
      totalPoda += x.poda;
    });

    const diasOrdenados = Object.keys(porDia).sort();
    const ultimosDias = diasOrdenados.slice(-14);

    const maxQtd = Math.max(1, ...ultimosDias.map((d) => porDia[d].total));
    const maxRec = Math.max(
      1,
      ...ultimosDias.map((d) => porDia[d].mk + porDia[d].cesto + porDia[d].lv + porDia[d].poda)
    );
    const maxCusto = Math.max(
      1,
      ...ultimosDias.map((d) => Math.max(porDia[d].custo, porDia[d].baremo))
    );

    const concluidas = dados.filter((x) => classificarStatusProg(x.st) === 'CONCLUÍDO').length;
    const canceladas = dados.filter((x) => classificarStatusProg(x.st) === 'CANCELADO').length;
    const adiadas = dados.filter((x) => classificarStatusProg(x.st) === 'ADIADO').length;

    return {
      porDia,
      ultimosDias,
      maxQtd,
      maxRec,
      maxCusto,
      totalCusto,
      totalBaremo,
      totalMK,
      totalCesto,
      totalLV,
      totalPoda,
      concluidas,
      canceladas,
      adiadas,
    };
  }, [dados]);

  // Unique options for history
  const { statusUnicos, tiposUnicos, prioridadesUnicas } = useMemo(() => {
    const sSet = new Set<string>();
    const tSet = new Set<string>();
    const pSet = new Set<string>();
    dados.forEach((x) => {
      if (x.st) sSet.add(x.st);
      if (x.tipo) tSet.add(x.tipo);
      if (x.prioridade) pSet.add(x.prioridade);
    });
    return {
      statusUnicos: Array.from(sSet).sort(),
      tiposUnicos: Array.from(tSet).sort(),
      prioridadesUnicas: Array.from(pSet).sort(),
    };
  }, [dados]);

  // Filtered history
  const historicoFiltrado = useMemo(() => {
    const q = buscaHist.toLowerCase().trim();
    return dados.filter((x) => {
      if (q && !(x.sob + x.base + x.tipo + x.resp + x.mun).toLowerCase().includes(q)) return false;
      if (filtroStatus && x.st !== filtroStatus) return false;
      if (filtroTipo && x.tipo !== filtroTipo) return false;
      if (filtroPrio && x.prioridade !== filtroPrio) return false;
      return true;
    });
  }, [dados, buscaHist, filtroStatus, filtroTipo, filtroPrio]);

  const totalPaginas = Math.ceil(historicoFiltrado.length / itensPorPagina) || 1;
  const paginados = historicoFiltrado.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  // Week calendar days
  const diasDaSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(semanaInicio);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [semanaInicio]);

  const hojeIso = useMemo(() => {
    const hoje = new Date();
    return (
      hoje.getFullYear() +
      '-' +
      String(hoje.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(hoje.getDate()).padStart(2, '0')
    );
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between bg-[var(--bg-surface)] p-2.5 rounded-[var(--radius-md)] border border-[var(--border-light)] shadow-[var(--shadow-sm)]">
        <div className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 font-bold ${
              isConnected ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            <i className="fa-solid fa-circle text-[9px]"></i>{' '}
            {isConnected ? 'Planilha Conectada' : 'Sem Conexão'}
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>
            Programação <b className="uppercase">{contrato}</b>
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>
            <b>{dados.length}</b> registros (≥ 2026)
          </span>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex gap-1 border-b-2 border-transparent">
          <button
            onClick={() => setSubTab('dash')}
            className={`px-3 py-1 text-xs font-bold rounded-t-md cursor-pointer transition-all border-b-2 ${
              subTab === 'dash'
                ? 'text-[var(--brand-dark)] border-[var(--brand-accent)] bg-emerald-500/10'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setSubTab('week')}
            className={`px-3 py-1 text-xs font-bold rounded-t-md cursor-pointer transition-all border-b-2 ${
              subTab === 'week'
                ? 'text-[var(--brand-dark)] border-[var(--brand-accent)] bg-emerald-500/10'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)]'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setSubTab('hist')}
            className={`px-3 py-1 text-xs font-bold rounded-t-md cursor-pointer transition-all border-b-2 ${
              subTab === 'hist'
                ? 'text-[var(--brand-dark)] border-[var(--brand-accent)] bg-emerald-500/10'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)]'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-12 text-center text-[var(--text-muted)] text-sm shadow-sm">
          {isConnected === false
            ? `A planilha de programação de ${contrato.toUpperCase()} está inacessível ou sem link publicado.`
            : 'Nenhum registro encontrado a partir de 2026.'}
        </div>
      ) : (
        <>
          {/* Sub-tab: DASHBOARD */}
          {subTab === 'dash' && (
            <div className="flex flex-col gap-3">
              {/* KPIs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--brand-accent)] shadow-xs">
                  <b className="block text-xl text-[var(--brand-dark)] font-extrabold">{dados.length}</b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Total Programadas
                  </span>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--status-green)] shadow-xs">
                  <b className="block text-sm text-[var(--brand-dark)] font-extrabold truncate" title={brl(dashInfo.totalCusto)}>
                    {brl(dashInfo.totalCusto)}
                  </b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Custo Programado
                  </span>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--brand-accent)] shadow-xs">
                  <b className="block text-sm text-[var(--brand-dark)] font-extrabold truncate" title={brl(dashInfo.totalBaremo)}>
                    {brl(dashInfo.totalBaremo)}
                  </b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Baremo Programado
                  </span>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[#047857] shadow-xs">
                  <b className="block text-xl text-[#047857] font-extrabold">{dashInfo.totalMK}</b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Total MK
                  </span>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[#10B981] shadow-xs">
                  <b className="block text-xl text-[#10B981] font-extrabold">{dashInfo.totalCesto}</b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Total Cesto
                  </span>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[#3B82F6] shadow-xs">
                  <b className="block text-xl text-[#3B82F6] font-extrabold">{dashInfo.totalLV}</b>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    Total Linha Viva
                  </span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Chart 1: Projetos por Dia e Status */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
                    <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-chart-column text-[var(--brand-accent)]"></i> Projetos por Dia por Status
                    </h4>
                  </div>
                  <div className="text-[10px] flex flex-wrap gap-2 mb-2 text-[var(--text-muted)] font-semibold">
                    <span className="text-emerald-500">■ Concluído</span>
                    <span className="text-sky-500">■ Parcial</span>
                    <span className="text-amber-500">■ Adiado</span>
                    <span className="text-rose-500">■ Cancelado</span>
                  </div>
                  <div className="flex items-end gap-2 h-44 overflow-x-auto border-b-2 border-[var(--border-light)] pb-1 px-1">
                    {dashInfo.ultimosDias.map((d) => {
                      const o = dashInfo.porDia[d];
                      const h = (o.total / dashInfo.maxQtd) * 110;
                      return (
                        <div
                          key={d}
                          className="flex-1 min-w-[38px] flex flex-col justify-end items-center h-full text-[10px] text-center"
                          title={`${d}: ${o.total} obras`}
                        >
                          <b className="text-[10px] text-[var(--text-main)] mb-1">{o.total}</b>
                          <div
                            className="w-5 flex flex-col-reverse rounded-t overflow-hidden bg-black/5"
                            style={{ height: `${h}px` }}
                          >
                            <div
                              style={{
                                height: `${((o.status['CONCLUÍDO'] || 0) / o.total) * 100}%`,
                                backgroundColor: 'var(--status-green)',
                              }}
                            ></div>
                            <div
                              style={{
                                height: `${((o.status['PARCIAL'] || 0) / o.total) * 100}%`,
                                backgroundColor: '#0284C7',
                              }}
                            ></div>
                            <div
                              style={{
                                height: `${((o.status['ADIADO'] || 0) / o.total) * 100}%`,
                                backgroundColor: 'var(--status-amber)',
                              }}
                            ></div>
                            <div
                              style={{
                                height: `${((o.status['CANCELADO'] || 0) / o.total) * 100}%`,
                                backgroundColor: 'var(--status-red)',
                              }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold mt-1.5">
                            {d.slice(8)}/{d.slice(5, 7)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 2: Recursos Diários */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
                    <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-truck-pickup text-[var(--brand-accent)]"></i> Recursos Diários (Estruturas)
                    </h4>
                  </div>
                  <div className="text-[10px] flex flex-wrap gap-2 mb-2 text-[var(--text-muted)] font-semibold">
                    <span className="text-emerald-800">■ MK ({dashInfo.totalMK})</span>
                    <span className="text-emerald-500">■ Cesto ({dashInfo.totalCesto})</span>
                    <span className="text-blue-500">■ Linha Viva ({dashInfo.totalLV})</span>
                    <span className="text-yellow-500">■ Poda ({dashInfo.totalPoda})</span>
                  </div>
                  <div className="flex items-end gap-2 h-44 overflow-x-auto border-b-2 border-[var(--border-light)] pb-1 px-1">
                    {dashInfo.ultimosDias.map((d) => {
                      const o = dashInfo.porDia[d];
                      const sum = o.mk + o.cesto + o.lv + o.poda;
                      const h = sum ? (sum / dashInfo.maxRec) * 110 : 2;
                      return (
                        <div
                          key={d}
                          className="flex-1 min-w-[38px] flex flex-col justify-end items-center h-full text-[10px] text-center"
                          title={`${d} - MK: ${o.mk}, Cesto: ${o.cesto}, LV: ${o.lv}, Poda: ${o.poda}`}
                        >
                          <b className="text-[10px] text-[var(--text-main)] mb-1">{sum}</b>
                          <div
                            className="w-5 flex flex-col-reverse rounded-t overflow-hidden bg-black/5"
                            style={{ height: `${h}px` }}
                          >
                            <div
                              style={{
                                height: sum ? `${(o.mk / sum) * 100}%` : '0%',
                                backgroundColor: '#047857',
                              }}
                            ></div>
                            <div
                              style={{
                                height: sum ? `${(o.cesto / sum) * 100}%` : '0%',
                                backgroundColor: '#10B981',
                              }}
                            ></div>
                            <div
                              style={{
                                height: sum ? `${(o.lv / sum) * 100}%` : '0%',
                                backgroundColor: '#3B82F6',
                              }}
                            ></div>
                            <div
                              style={{
                                height: sum ? `${(o.poda / sum) * 100}%` : '0%',
                                backgroundColor: '#EAB308',
                              }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold mt-1.5">
                            {d.slice(8)}/{d.slice(5, 7)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart 3: Custo vs Baremo */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
                    <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-money-bill-trend-up text-[var(--brand-accent)]"></i> Custo Programado vs Baremo
                    </h4>
                  </div>
                  <div className="text-[10px] flex flex-wrap gap-2 mb-2 text-[var(--text-muted)] font-semibold">
                    <span className="text-emerald-700">■ Custo Programado</span>
                    <span className="text-emerald-400">■ Baremo Programado</span>
                  </div>
                  <div className="flex items-end gap-2 h-44 overflow-x-auto border-b-2 border-[var(--border-light)] pb-1 px-1">
                    {dashInfo.ultimosDias.map((d) => {
                      const o = dashInfo.porDia[d];
                      const hCusto = Math.max(2, (o.custo / dashInfo.maxCusto) * 110);
                      const hBaremo = Math.max(2, (o.baremo / dashInfo.maxCusto) * 110);
                      return (
                        <div
                          key={d}
                          className="flex-1 min-w-[38px] flex flex-col justify-end items-center h-full text-[10px] text-center"
                          title={`${d} - Custo: ${brl(o.custo)} | Baremo: ${brl(o.baremo)}`}
                        >
                          <div className="flex items-end gap-1">
                            <div
                              className="w-2.5 rounded-t bg-[#059669]"
                              style={{ height: `${hCusto}px` }}
                            ></div>
                            <div
                              className="w-2.5 rounded-t bg-[#34D399]"
                              style={{ height: `${hBaremo}px` }}
                            ></div>
                          </div>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold mt-1.5">
                            {d.slice(8)}/{d.slice(5, 7)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card 4: Operational Insights */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
                    <h4 className="text-xs font-bold text-[var(--brand-accent)] uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-lightbulb"></i> Leituras Operacionais da Programação
                    </h4>
                  </div>
                  <ul className="flex flex-col gap-2 text-xs">
                    <li className="p-2 rounded-md bg-[var(--card-subtle)] border-l-4 border-l-[var(--brand-accent)] text-[var(--text-main)]">
                      📈 <b>Eficiência de Campo:</b> <b>{dashInfo.concluidas}</b> programações concluídas no período a partir de 2026 ({dados.length ? Math.round((dashInfo.concluidas / dados.length) * 100) : 0}% de taxa de entrega).
                    </li>
                    <li
                      className={`p-2 rounded-md border-l-4 ${
                        dashInfo.canceladas > 0
                          ? 'border-l-rose-500 bg-rose-500/10 text-[var(--text-main)]'
                          : 'border-l-[var(--brand-accent)] bg-[var(--card-subtle)] text-[var(--text-main)]'
                      }`}
                    >
                      ⚠️ <b>Desvios:</b> <b>{dashInfo.canceladas}</b> cancelamentos e <b>{dashInfo.adiadas}</b> adiamentos registrados na planilha.
                    </li>
                    <li className="p-2 rounded-md bg-[var(--card-subtle)] border-l-4 border-l-[var(--brand-accent)] text-[var(--text-main)]">
                      💰 <b>Relação Financeira:</b> O Custo total acumulado representa <b>{brl(dashInfo.totalCusto)}</b> em comparação com o Baremo de <b>{brl(dashInfo.totalBaremo)}</b>.
                    </li>
                    <li className="p-2 rounded-md bg-[var(--card-subtle)] border-l-4 border-l-[var(--brand-accent)] text-[var(--text-main)]">
                      🚜 <b>Demanda de Equipes:</b> A estrutura <b>MK</b> responde pelo maior volume de frentes com <b>{dashInfo.totalMK}</b> alocações.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab: SEMANA */}
          {subTab === 'week' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const prev = new Date(semanaInicio);
                    prev.setDate(prev.getDate() - 7);
                    setSemanaInicio(prev);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  ◀ Anterior
                </button>
                <button
                  onClick={() => {
                    const hoje = new Date();
                    hoje.setDate(hoje.getDate() - hoje.getDay());
                    hoje.setHours(0, 0, 0, 0);
                    setSemanaInicio(hoje);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const next = new Date(semanaInicio);
                    next.setDate(next.getDate() + 7);
                    setSemanaInicio(next);
                  }}
                  className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                >
                  Próxima ▶
                </button>

                <b className="text-xs text-[var(--brand-dark)] ml-2">
                  {formatarDataBR(semanaInicio)} a {formatarDataBR(diasDaSemana[6])}
                </b>
              </div>

              {/* 7 Columns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2 overflow-x-auto">
                {diasDaSemana.map((dia) => {
                  const dIso =
                    dia.getFullYear() +
                    '-' +
                    String(dia.getMonth() + 1).padStart(2, '0') +
                    '-' +
                    String(dia.getDate()).padStart(2, '0');
                  const itensDoDia = dados.filter((x) => x.iso === dIso);
                  const isHoje = dIso === hojeIso;

                  return (
                    <div
                      key={dIso}
                      className={`bg-[var(--bg-surface)] border rounded-lg p-2 min-h-[220px] shadow-xs flex flex-col ${
                        isHoje
                          ? 'border-[var(--brand-accent)] ring-2 ring-[var(--brand-accent)]/30'
                          : 'border-[var(--border-light)]'
                      }`}
                    >
                      <h4 className="text-[11px] font-bold text-[var(--text-muted)] border-b border-[var(--border-light)] pb-1 mb-2 flex justify-between items-center">
                        <span>
                          {dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-[10px] bg-black/5 px-1.5 py-0.2 rounded-full">
                          {itensDoDia.length}
                        </span>
                      </h4>

                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px]">
                        {itensDoDia.length === 0 ? (
                          <span className="text-[11px] text-[var(--text-muted)] italic text-center py-4">
                            —
                          </span>
                        ) : (
                          itensDoDia.map((it) => (
                            <div
                              key={it.sob}
                              onClick={() => setItemDetalhe(it)}
                              className="border-l-3 border-l-[var(--brand-accent)] bg-[var(--card-subtle)] hover:bg-emerald-500/15 p-1.5 rounded cursor-pointer transition-all text-left shadow-xs"
                            >
                              <b className="text-[11px] text-[var(--text-main)] block truncate">
                                {it.sob}
                              </b>
                              <span className="text-[9px] text-[var(--text-muted)] block truncate">
                                {it.mun || it.bairro || 'Sem Local'}
                              </span>
                              <span className="text-[9px] font-bold text-[var(--brand-primary)]">
                                {it.st}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-tab: HISTÓRICO */}
          {subTab === 'hist' && (
            <div className="flex flex-col gap-2.5">
              {/* Toolbar */}
              <div className="flex flex-wrap gap-2 items-center justify-between bg-[var(--bg-surface)] p-2 rounded-[var(--radius-md)] border border-[var(--border-light)] shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={buscaHist}
                    onChange={(e) => {
                      setBuscaHist(e.target.value);
                      setPaginaAtual(1);
                    }}
                    placeholder="Pesquisar por SOB, local, responsável..."
                    className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-3 py-1.5 rounded-md text-xs outline-none focus:border-[var(--brand-accent)] min-w-[220px]"
                  />

                  <select
                    value={filtroStatus}
                    onChange={(e) => {
                      setFiltroStatus(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-md text-xs outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="">STATUS: Todos</option>
                    {statusUnicos.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroTipo}
                    onChange={(e) => {
                      setFiltroTipo(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-md text-xs outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="">TIPO: Todos</option>
                    {tiposUnicos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroPrio}
                    onChange={(e) => {
                      setFiltroPrio(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-md text-xs outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="">PRIORIDADE: Todas</option>
                    {prioridadesUnicas.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setBuscaHist('');
                      setFiltroStatus('');
                      setFiltroTipo('');
                      setFiltroPrio('');
                      setPaginaAtual(1);
                    }}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                  >
                    <i className="fa-solid fa-filter-circle-xmark"></i> Limpar
                  </button>
                </div>

                <span className="text-xs font-bold text-[var(--text-main)]">
                  {historicoFiltrado.length} registros (≥ 2026)
                </span>
              </div>

              {/* Table */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-md)] max-h-[68vh] overflow-auto shadow-xs">
                <table className="w-full border-collapse text-xs text-center">
                  <thead>
                    <tr className="border-b-2 border-[var(--brand-accent)] bg-[var(--card-subtle)] text-[var(--brand-dark)] text-[11px] font-bold uppercase whitespace-nowrap sticky top-0 z-10">
                      <th className="py-2.5 px-3 text-left">BASE</th>
                      <th className="py-2.5 px-3 text-left">Tipo de Serviço</th>
                      <th className="py-2.5 px-3 text-left">SOB</th>
                      <th className="py-2.5 px-3">Data de execução</th>
                      <th className="py-2.5 px-3">Dia da semana</th>
                      <th className="py-2.5 px-3">PRIORIDADE</th>
                      <th className="py-2.5 px-2 bg-emerald-500/10 text-[var(--brand-dark)]">MK</th>
                      <th className="py-2.5 px-2 bg-emerald-500/10 text-[var(--brand-dark)]">CESTO</th>
                      <th className="py-2.5 px-2 bg-emerald-500/10 text-[var(--brand-dark)]">LV</th>
                      <th className="py-2.5 px-2 bg-emerald-500/10 text-[var(--brand-dark)]">PODA</th>
                      <th className="py-2.5 px-3">Vencimento de Obras</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">Custo Programado</th>
                      <th className="py-2.5 px-3">Baremo Programado</th>
                      <th className="py-2.5 px-3">Valor Executado</th>
                      <th className="py-2.5 px-3">Compl. Programado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="py-8 text-center text-[var(--text-muted)]">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    ) : (
                      paginados.map((x) => (
                        <tr
                          key={x.sob}
                          onClick={() => setItemDetalhe(x)}
                          className="border-b border-[var(--border-light)] hover:bg-emerald-500/10 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-3 text-left font-medium text-[var(--text-main)]">
                            {x.base || '—'}
                          </td>
                          <td className="py-2 px-3 text-left text-[var(--text-secondary)]">
                            {x.tipo || '—'}
                          </td>
                          <td className="py-2 px-3 text-left font-bold text-[var(--brand-dark)]">
                            {x.sob}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">{x.dataExec || formatarDataBR(x.d)}</td>
                          <td className="py-2 px-3 text-[var(--text-muted)]">{x.diaSemana || '—'}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{x.prioridade || '—'}</td>
                          <td className="py-2 px-2 font-bold bg-emerald-500/5">{x.mk}</td>
                          <td className="py-2 px-2 font-bold bg-emerald-500/5">{x.cesto}</td>
                          <td className="py-2 px-2 font-bold bg-emerald-500/5">{x.lv}</td>
                          <td className="py-2 px-2 font-bold bg-emerald-500/5">{x.poda}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-[var(--text-muted)]">
                            {x.vencimentoObras || '—'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--card-subtle)] border border-[var(--border-light)]">
                              {x.st}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-[var(--text-main)]">
                            {x.custoProg || '0,00'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-[var(--text-main)]">
                            {x.baremoProg || '0,00'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-[var(--text-main)]">
                            {x.valorExec || '0,00'}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-[var(--text-main)]">
                            {x.complProg || '0,00'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap justify-between items-center bg-[var(--bg-surface)] p-2.5 rounded-[var(--radius-md)] border border-[var(--border-light)] text-xs text-[var(--text-main)] shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span>Exibir:</span>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => {
                      setItensPorPagina(parseInt(e.target.value, 10));
                      setPaginaAtual(1);
                    }}
                    className="border border-[var(--border-light)] rounded px-2 py-1 bg-[var(--bg-surface)] text-[var(--text-main)]"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>linhas por página</span>
                </div>

                <div>
                  Página <b>{paginaAtual}</b> de <b>{totalPaginas}</b>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                    className="bg-[var(--bg-surface)] border border-[var(--border-light)] px-3 py-1 rounded cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-light)]"
                  >
                    ◀ Anterior
                  </button>
                  <button
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="bg-[var(--bg-surface)] border border-[var(--border-light)] px-3 py-1 rounded cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-light)]"
                  >
                    Próxima ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      {itemDetalhe && (
        <div
          className="fixed inset-0 bg-black/60 z-[3500] flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setItemDetalhe(null)}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl max-w-2xl w-full p-5 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-[var(--brand-accent)] pb-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[var(--brand-dark)]">
                  SOB: {itemDetalhe.sob} ({itemDetalhe.base})
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-light)] text-[var(--brand-primary)]">
                  {itemDetalhe.st}
                </span>
              </div>
              <button
                onClick={() => setItemDetalhe(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {Object.entries(itemDetalhe.raw).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-md p-2"
                >
                  <dt className="text-[10px] uppercase font-bold text-[var(--text-muted)] truncate" title={k}>
                    {k}
                  </dt>
                  <dd className="font-semibold text-[var(--text-main)] break-words mt-0.5">
                    {v || '—'}
                  </dd>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[var(--border-light)]">
              <button
                onClick={() => setItemDetalhe(null)}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
