import React, { useState, useMemo } from 'react';
import { CarteiraItem } from '../types';
import {
  buscarCampoFlexivel,
  formatarValorGenerico,
  obterValorEtapa,
  obterValorProjeto,
  obterSinal,
  normTxt,
  esc,
  PALETA_CORES,
} from '../utils/dataParser';

interface CarteiraTabProps {
  dados: CarteiraItem[];
  statusTexto?: string;
  onAbrirDashboard: () => void;
  onSelecionarItem?: (item: CarteiraItem) => void;
}

const COLUNAS_CARTEIRA = [
  { titulo: 'PACOTE', nomes: ['PACOTE', 'DATA PACOTE', 'RECEBIMENTO'] },
  { titulo: 'BASE', nomes: ['BASE', 'MUNICIPIO'] },
  { titulo: 'TIPO', nomes: ['TIPO', 'TIPO DE SERVICO'] },
  { titulo: 'PROJETO', nomes: ['PROJETO', 'CODIGO', 'OBRA', 'SOB'] },
  { titulo: 'PARCEIRA', nomes: ['PARCEIRA', 'EMPRESA'] },
  {
    titulo: 'PRAZO LIMITE',
    nomes: ['DATA LIMITE PARA EXECUÇÃO', 'DATA LIMITE', 'LIMITE EXECUCAO'],
    isData: true,
  },
  { titulo: 'PRIORIDADE', nomes: ['PRIORIDADE'] },
  { titulo: 'ETAPA', nomes: ['ETAPA', 'STATUS', 'FASE', 'SITUACAO', 'INFO STATUS'] },
];

export const CarteiraTab: React.FC<CarteiraTabProps> = ({
  dados,
  statusTexto,
  onAbrirDashboard,
  onSelecionarItem,
}) => {
  const [busca, setBusca] = useState('');
  const [etapaSelecionada, setEtapaSelecionada] = useState<string>('');
  const [filtroBase, setFiltroBase] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroParceira, setFiltroParceira] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroSinal, setFiltroSinal] = useState('');

  // Item inspection modal
  const [itemInspecionado, setItemInspecionado] = useState<CarteiraItem | null>(null);

  // Map colors for stages
  const mapaCoresEtapas = useMemo(() => {
    const mapa: Record<string, string> = {};
    const unicas = new Set<string>();
    dados.forEach((i) => {
      const e = obterValorEtapa(i);
      if (e) unicas.add(e);
    });
    Array.from(unicas)
      .sort()
      .forEach((e, idx) => {
        mapa[e] = PALETA_CORES[idx % PALETA_CORES.length];
      });
    return mapa;
  }, [dados]);

  // Options for dropdowns
  const { bases, tipos, parceiras, prioridades, contagemPorEtapa } = useMemo(() => {
    const bSet = new Set<string>();
    const tSet = new Set<string>();
    const pSet = new Set<string>();
    const prioSet = new Set<string>();
    const countMap: Record<string, number> = {};

    dados.forEach((i) => {
      const b = formatarValorGenerico(buscarCampoFlexivel(i, 'BASE', 'MUNICIPIO'));
      if (b) bSet.add(b);

      const t = formatarValorGenerico(buscarCampoFlexivel(i, 'TIPO', 'TIPO DE SERVICO'));
      if (t) tSet.add(t);

      const p = formatarValorGenerico(buscarCampoFlexivel(i, 'PARCEIRA', 'EMPRESA'));
      if (p) pSet.add(p);

      const prio = formatarValorGenerico(buscarCampoFlexivel(i, 'PRIORIDADE'));
      if (prio) prioSet.add(prio);

      const e = obterValorEtapa(i);
      countMap[e] = (countMap[e] || 0) + 1;
    });

    return {
      bases: Array.from(bSet).sort(),
      tipos: Array.from(tSet).sort(),
      parceiras: Array.from(pSet).sort(),
      prioridades: Array.from(prioSet).sort(),
      contagemPorEtapa: countMap,
    };
  }, [dados]);

  // Filtered rows
  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();

    return dados.filter((i) => {
      const etapa = obterValorEtapa(i);
      if (etapaSelecionada && etapa !== etapaSelecionada) return false;

      if (filtroBase && formatarValorGenerico(buscarCampoFlexivel(i, 'BASE', 'MUNICIPIO')) !== filtroBase) {
        return false;
      }
      if (
        filtroTipo &&
        formatarValorGenerico(buscarCampoFlexivel(i, 'TIPO', 'TIPO DE SERVICO')) !== filtroTipo
      ) {
        return false;
      }
      if (
        filtroParceira &&
        formatarValorGenerico(buscarCampoFlexivel(i, 'PARCEIRA', 'EMPRESA')) !== filtroParceira
      ) {
        return false;
      }
      if (
        filtroPrioridade &&
        formatarValorGenerico(buscarCampoFlexivel(i, 'PRIORIDADE')) !== filtroPrioridade
      ) {
        return false;
      }
      if (filtroSinal) {
        const s = obterSinal(i);
        if ((s ? s.cor : 'sem') !== filtroSinal) return false;
      }

      if (q) {
        const valuesStr = Object.values(i).join(' ').toLowerCase();
        if (!valuesStr.includes(q)) return false;
      }

      return true;
    });
  }, [
    dados,
    busca,
    etapaSelecionada,
    filtroBase,
    filtroTipo,
    filtroParceira,
    filtroPrioridade,
    filtroSinal,
  ]);

  // Signal counts among filtered
  const { countRed, countYellow, countGreen } = useMemo(() => {
    let r = 0;
    let y = 0;
    let g = 0;
    filtrados.forEach((i) => {
      const s = obterSinal(i);
      if (s) {
        if (s.cor === 'vermelho') r++;
        else if (s.cor === 'amarelo') y++;
        else g++;
      }
    });
    return { countRed: r, countYellow: y, countGreen: g };
  }, [filtrados]);

  function limparFiltros() {
    setBusca('');
    setEtapaSelecionada('');
    setFiltroBase('');
    setFiltroTipo('');
    setFiltroParceira('');
    setFiltroPrioridade('');
    setFiltroSinal('');
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Top Glass Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-[var(--bg-surface)] p-2.5 rounded-[var(--radius-md)] border border-[var(--border-light)] shadow-[var(--shadow-sm)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAbrirDashboard}
            className="bg-[var(--brand-primary)] hover:brightness-110 active:scale-95 text-white font-semibold text-xs px-3.5 py-2 rounded-[var(--radius-md)] inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-chart-pie"></i> Ver Dashboard da Carteira
          </button>

          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar por projeto, SOB, parceira..."
              className="w-full bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-3 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] transition-all placeholder:text-[var(--text-muted)]"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2 top-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Counter badges */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-full px-2.5 py-1 text-[var(--text-main)]">
            <i className="fa-solid fa-list text-[var(--brand-accent)]"></i> {filtrados.length} projetos
          </span>

          <span
            title="Projetos Críticos: Vencidos ou a vencer em até 5 dias"
            className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-full px-2.5 py-1 text-[var(--status-red)]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-red)]"></span> {countRed}
          </span>

          <span
            title="Projetos Críticos: Vencem entre 6 e 15 dias"
            className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-full px-2.5 py-1 text-[var(--status-amber)]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-amber)]"></span> {countYellow}
          </span>

          <span
            title="Projetos Críticos: Vencem em mais de 15 dias"
            className="inline-flex items-center gap-1.5 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-full px-2.5 py-1 text-[var(--status-green)]"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-green)]"></span> {countGreen}
          </span>

          {statusTexto && (
            <span className="text-xs font-bold ml-1 text-[var(--brand-dark)]">{statusTexto}</span>
          )}
        </div>
      </div>

      {/* Etapa chips */}
      <div className="flex flex-wrap gap-1.5 py-1">
        <button
          onClick={() => setEtapaSelecionada('')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all border ${
            etapaSelecionada === ''
              ? 'bg-emerald-500/20 border-[var(--brand-accent)] text-[var(--brand-dark)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--brand-accent)]'
          }`}
        >
          TODAS ({dados.length})
        </button>

        {Object.keys(mapaCoresEtapas).map((etapa) => {
          const cor = mapaCoresEtapas[etapa];
          const count = contagemPorEtapa[etapa] || 0;
          const isActive = etapaSelecionada === etapa;

          return (
            <button
              key={etapa}
              onClick={() => setEtapaSelecionada(isActive ? '' : etapa)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                isActive
                  ? 'bg-emerald-500/20 border-[var(--brand-accent)] text-[var(--brand-dark)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--brand-accent)]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: cor }}
              ></span>
              <span>{etapa}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter dropdowns row */}
      <div className="flex flex-wrap gap-2 items-center bg-[var(--bg-surface)] p-2 rounded-[var(--radius-md)] border border-[var(--border-light)] shadow-[var(--shadow-sm)]">
        <select
          value={filtroBase}
          onChange={(e) => setFiltroBase(e.target.value)}
          className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] min-w-[130px]"
        >
          <option value="">BASE: Todas</option>
          {bases.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] min-w-[130px]"
        >
          <option value="">TIPO: Todos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filtroParceira}
          onChange={(e) => setFiltroParceira(e.target.value)}
          className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] min-w-[130px]"
        >
          <option value="">PARCEIRA: Todas</option>
          {parceiras.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value)}
          className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] min-w-[130px]"
        >
          <option value="">PRIORIDADE: Todas</option>
          {prioridades.map((pr) => (
            <option key={pr} value={pr}>
              {pr}
            </option>
          ))}
        </select>

        <select
          value={filtroSinal}
          onChange={(e) => setFiltroSinal(e.target.value)}
          className="bg-[var(--card-subtle)] border border-[var(--border-light)] text-[var(--text-main)] px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs outline-none focus:border-[var(--brand-accent)] min-w-[140px]"
        >
          <option value="">SINAL: Todos</option>
          <option value="vermelho">🔴 Vermelho (≤ 5d)</option>
          <option value="amarelo">🟡 Amarelo (6-15d)</option>
          <option value="verde">🟢 Verde (&gt; 15d)</option>
        </select>

        <button
          onClick={limparFiltros}
          className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-xs"
        >
          <i className="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-md)] max-h-[72vh] overflow-auto shadow-[var(--shadow-sm)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {COLUNAS_CARTEIRA.map((c) => (
                <th
                  key={c.titulo}
                  className="sticky top-0 bg-[var(--card-subtle)] text-[var(--brand-dark)] text-[11px] font-bold uppercase tracking-wider text-left px-3 py-2.5 border-b-2 border-[var(--brand-accent)] whitespace-nowrap z-10"
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUNAS_CARTEIRA.length}
                  className="text-center py-12 text-[var(--text-muted)] text-sm"
                >
                  {dados.length
                    ? 'Nenhuma obra correspondente aos filtros.'
                    : 'Sem dados para este contrato.'}
                </td>
              </tr>
            ) : (
              filtrados.slice(0, 150).map((item, idx) => {
                const s = obterSinal(item);
                const etapa = obterValorEtapa(item);
                const cor = mapaCoresEtapas[etapa] || 'var(--brand-accent)';

                return (
                  <tr
                    key={idx}
                    onClick={() => {
                      setItemInspecionado(item);
                      if (onSelecionarItem) onSelecionarItem(item);
                    }}
                    className="cursor-pointer hover:bg-emerald-500/10 transition-colors border-b border-[var(--border-light)]"
                  >
                    {COLUNAS_CARTEIRA.map((c) => {
                      const v = formatarValorGenerico(buscarCampoFlexivel(item, ...c.nomes));

                      if (c.titulo === 'ETAPA') {
                        return (
                          <td key={c.titulo} className="px-3 py-2 whitespace-nowrap">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block"
                              style={{
                                border: `1px solid ${cor}`,
                                color: cor,
                                backgroundColor: `${cor}15`,
                              }}
                            >
                              {etapa}
                            </span>
                          </td>
                        );
                      }

                      if (c.isData) {
                        return (
                          <td key={c.titulo} className="px-3 py-2 whitespace-nowrap text-[var(--text-main)]">
                            <span>{v || '—'}</span>
                            {s && (
                              <span
                                className="ml-2 font-bold inline-flex items-center gap-1"
                                style={{
                                  color:
                                    s.cor === 'vermelho'
                                      ? 'var(--status-red)'
                                      : s.cor === 'amarelo'
                                      ? 'var(--status-amber)'
                                      : 'var(--status-green)',
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full inline-block"
                                  style={{
                                    backgroundColor:
                                      s.cor === 'vermelho'
                                      ? 'var(--status-red)'
                                      : s.cor === 'amarelo'
                                      ? 'var(--status-amber)'
                                      : 'var(--status-green)',
                                  }}
                                ></span>
                                {s.texto}
                              </span>
                            )}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={c.titulo}
                          className={`px-3 py-2 whitespace-nowrap text-[var(--text-main)] ${
                            c.titulo === 'PROJETO' ? 'font-bold' : ''
                          }`}
                        >
                          {v || '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtrados.length > 150 && (
          <div className="p-2 text-center text-xs text-[var(--text-muted)] bg-[var(--card-subtle)] border-t border-[var(--border-light)]">
            Exibindo as primeiras 150 obras de {filtrados.length}. Use os filtros para refinar os resultados.
          </div>
        )}
      </div>

      {/* Item Detail Modal */}
      {itemInspecionado && (
        <div
          className="fixed inset-0 bg-black/60 z-[3500] flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setItemInspecionado(null)}
        >
          <div
            className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl max-w-2xl w-full p-5 shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b-2 border-[var(--brand-accent)] pb-3 mb-4">
              <h3 className="text-base font-extrabold text-[var(--brand-dark)] flex items-center gap-2">
                <i className="fa-solid fa-file-lines text-[var(--brand-accent)]"></i>
                <span>PROJETO: {obterValorProjeto(itemInspecionado) || 'Sem Código'}</span>
              </h3>
              <button
                onClick={() => setItemInspecionado(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {Object.entries(itemInspecionado).map(([k, v]) => (
                <div
                  key={k}
                  className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-md p-2"
                >
                  <dt className="text-[10px] uppercase font-bold text-[var(--text-muted)] truncate" title={k}>
                    {k}
                  </dt>
                  <dd className="font-semibold text-[var(--text-main)] break-words mt-0.5">
                    {formatarValorGenerico(v) || '—'}
                  </dd>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-[var(--border-light)]">
              {itemInspecionado.LATITUDE && itemInspecionado.LONGITUDE && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${itemInspecionado.LATITUDE},${itemInspecionado.LONGITUDE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--brand-primary)] hover:brightness-110 text-white px-3.5 py-1.5 rounded-md text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                >
                  <i className="fa-solid fa-location-dot"></i> Ver no Google Maps
                </a>
              )}
              <button
                onClick={() => setItemInspecionado(null)}
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
