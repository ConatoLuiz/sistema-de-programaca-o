import React, { useMemo } from 'react';
import { CarteiraItem, ContratoId } from '../types';
import {
  buscarCampoFlexivel,
  calcularDiasRestantes,
  formatarValorGenerico,
  obterValorEtapa,
  obterValorProjeto,
  ehPrioridadeCritica,
  normTxt,
  paraData,
  esc,
  PALETA_CORES,
} from '../utils/dataParser';

interface CarteiraModalDashProps {
  dados: CarteiraItem[];
  contrato: ContratoId;
  onFechar: () => void;
}

const COR = {
  verm: '#DC2626',
  amar: '#D97706',
  verde: '#059669',
  azul: '#065F46',
  cinza: '#94A3B8',
  lar: '#EA580C',
};

export const CarteiraModalDash: React.FC<CarteiraModalDashProps> = ({
  dados,
  contrato,
  onFechar,
}) => {
  const analise = useMemo(() => {
    const D = dados.filter((i) => obterValorProjeto(i) !== '');
    const ehAberto = (i: CarteiraItem) => normTxt(obterValorEtapa(i)) !== 'CONCLUIDO';
    const A = D.filter(ehAberto);
    const concluidos = D.filter((i) => normTxt(obterValorEtapa(i)) === 'CONCLUIDO');
    const pctConcl = D.length ? Math.round((concluidos.length / D.length) * 100) : 0;

    // Stage color map
    const mapaCoresEtapas: Record<string, string> = {};
    const unicasEtapas = new Set<string>();
    D.forEach((i) => {
      const e = obterValorEtapa(i);
      if (e) unicasEtapas.add(e);
    });
    Array.from(unicasEtapas)
      .sort()
      .forEach((e, idx) => {
        mapaCoresEtapas[e] = PALETA_CORES[idx % PALETA_CORES.length];
      });

    // Counts by type in open works
    const tiposAbertosMap = new Map<string, number>();
    A.forEach((i) => {
      const tp =
        formatarValorGenerico(buscarCampoFlexivel(i, 'TIPO', 'TIPO DE SERVICO')) || 'SEM TIPO';
      tiposAbertosMap.set(tp, (tiposAbertosMap.get(tp) || 0) + 1);
    });

    // Critical Client works
    const ehClienteCritico = (i: CarteiraItem) => {
      const tipo = normTxt(
        formatarValorGenerico(buscarCampoFlexivel(i, 'TIPO', 'TIPO DE SERVICO'))
      );
      if (!tipo.includes('CLIENTE')) return false;
      const prio = formatarValorGenerico(buscarCampoFlexivel(i, 'PRIORIDADE'));
      if (!ehPrioridadeCritica(prio)) return false;
      const beneficio = String(
        buscarCampoFlexivel(
          i,
          'BENEFÍCIO ATINGIDO?',
          'BENEFÍCIO ANTINGIDO?',
          'BENEFICIO ATINGIDO'
        ) ?? ''
      ).trim();
      return beneficio === '';
    };

    const clientesCriticosEmAberto = A.filter(ehClienteCritico)
      .map((i) => {
        const dataLimite = buscarCampoFlexivel(
          i,
          'DATA LIMITE PARA EXECUÇÃO',
          'DATA LIMITE'
        );
        const dias = calcularDiasRestantes(dataLimite);
        return { item: i, dias };
      })
      .sort((a, b) => a.dias - b.dias);

    const vencidosCriticos = clientesCriticosEmAberto.filter((x) => x.dias < 0);
    const vencem5Dias = clientesCriticosEmAberto.filter((x) => x.dias >= 0 && x.dias <= 5);
    const atencaoDias = clientesCriticosEmAberto.filter((x) => x.dias > 5 && x.dias <= 15);
    const mais15Dias = clientesCriticosEmAberto.filter((x) => x.dias > 15);

    // Open constructive issues
    const pendenciasAbertas = D.filter((i) => {
      const pendConst = normTxt(
        formatarValorGenerico(
          buscarCampoFlexivel(i, 'PENDÊNCIA CONSTRUTIVA?', 'PENDENCIA CONSTRUTIVA?')
        )
      );
      const stPend = normTxt(
        formatarValorGenerico(buscarCampoFlexivel(i, 'STATUS PENDÊNCIA', 'STATUS PENDENCIA'))
      );
      return pendConst === 'SIM' && stPend !== 'CONCLUIDO';
    });

    // Top 10 critical works
    const top10Criticos = clientesCriticosEmAberto.slice(0, 10);

    // Month sequences and helpers
    const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const rotuloMes = (k: string) => `${MES_ABREV[+k.slice(5) - 1]}/${k.slice(2, 4)}`;

    function seqMeses(a: string, b: string) {
      const r: string[] = [];
      let [y, m] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      while (y < y2 || (y === y2 && m <= m2)) {
        r.push(`${y}-${String(m).padStart(2, '0')}`);
        if (++m > 12) {
          m = 1;
          y++;
        }
      }
      return r;
    }

    // Monthly packages received
    const pacotesMesMap = new Map<string, number>();
    D.forEach((i) => {
      const d = paraData(buscarCampoFlexivel(i, 'PACOTE', 'DATA PACOTE'));
      if (d && d.getFullYear() > 1900) {
        const k = chaveMes(d);
        pacotesMesMap.set(k, (pacotesMesMap.get(k) || 0) + 1);
      }
    });

    const pacotesKeys = Array.from(pacotesMesMap.keys()).sort();
    const pacotesSerie = pacotesKeys.length
      ? seqMeses(pacotesKeys[0], pacotesKeys[pacotesKeys.length - 1])
          .slice(-10)
          .map((k) => ({
            label: rotuloMes(k),
            valor: pacotesMesMap.get(k) || 0,
            cor: COR.azul,
          }))
      : [];

    // Monthly deadlines in open
    const hojeM = chaveMes(new Date());
    const prazosMesMap = new Map<string, number>();
    A.forEach((i) => {
      const d = paraData(
        buscarCampoFlexivel(i, 'DATA LIMITE PARA EXECUÇÃO', 'DATA LIMITE')
      );
      if (d && d.getFullYear() > 1900) {
        const k = chaveMes(d);
        prazosMesMap.set(k, (prazosMesMap.get(k) || 0) + 1);
      }
    });

    const prazosKeys = Array.from(prazosMesMap.keys()).sort();
    const prazosSerie = prazosKeys.length
      ? seqMeses(prazosKeys[0], prazosKeys[prazosKeys.length - 1])
          .slice(-10)
          .map((k) => ({
            label: rotuloMes(k),
            valor: prazosMesMap.get(k) || 0,
            cor: k < hojeM ? COR.verm : k === hojeM ? COR.amar : COR.azul,
          }))
      : [];

    // Constructive issues status
    const pendSimTotal = D.filter(
      (i) =>
        normTxt(
          formatarValorGenerico(
            buscarCampoFlexivel(i, 'PENDÊNCIA CONSTRUTIVA?', 'PENDENCIA CONSTRUTIVA?')
          )
        ) === 'SIM'
    );
    const stPendMap = new Map<string, number>();
    pendSimTotal.forEach((i) => {
      const st =
        formatarValorGenerico(
          buscarCampoFlexivel(i, 'STATUS PENDÊNCIA', 'STATUS PENDENCIA')
        ) || 'SEM STATUS';
      stPendMap.set(st, (stPendMap.get(st) || 0) + 1);
    });

    // Stage counts
    const etapasLista = Array.from(unicasEtapas)
      .sort()
      .map((e) => ({
        etapa: e,
        qtd: D.filter((i) => obterValorEtapa(i) === e).length,
        cor: mapaCoresEtapas[e] || COR.azul,
      }))
      .filter((x) => x.qtd > 0);

    // Automated insights
    const insights: { tipo: 'alerta' | 'normal'; texto: string }[] = [];
    if (vencidosCriticos.length) {
      insights.push({
        tipo: 'alerta',
        texto: `🚨 <b>${vencidosCriticos.length}</b> obras de cliente com prioridade regulatória já estão com a data limite ultrapassada. O caso mais severo é o projeto <b>${obterValorProjeto(
          vencidosCriticos[0].item
        )}</b> (${Math.abs(vencidosCriticos[0].dias)} dias de atraso).`,
      });
    }
    if (vencem5Dias.length) {
      insights.push({
        tipo: 'alerta',
        texto: `⏰ <b>${vencem5Dias.length}</b> projetos críticos vencem nos próximos 5 dias. Recomenda-se acompanhamento diário com as empreiteiras.`,
      });
    }
    if (atencaoDias.length) {
      insights.push({
        tipo: 'normal',
        texto: `⚠️ Existem <b>${atencaoDias.length}</b> obras na faixa de atenção (6 a 15 dias para o vencimento).`,
      });
    }
    if (pendenciasAbertas.length) {
      insights.push({
        tipo: 'alerta',
        texto: `🔧 <b>${pendenciasAbertas.length}</b> obras possuem pendência construtiva marcada como SIM e ainda não concluída.`,
      });
    }
    const maiorEtapa = [...etapasLista].sort((a, b) => b.qtd - a.qtd);
    if (maiorEtapa.length) {
      insights.push({
        tipo: 'normal',
        texto: `📌 O maior volume de obras em aberto está concentrado na etapa <b>${maiorEtapa[0].etapa}</b> (${maiorEtapa[0].qtd} projetos).`,
      });
    }
    insights.push({
      tipo: 'normal',
      texto: `✅ O contrato atingiu um índice de <b>${pctConcl}% de conclusão</b> geral (${concluidos.length} de ${D.length} obras concluídas).`,
    });

    return {
      D,
      A,
      concluidos,
      pctConcl,
      tiposAbertosMap,
      vencidosCriticos,
      vencem5Dias,
      atencaoDias,
      mais15Dias,
      pendenciasAbertas,
      top10Criticos,
      pacotesSerie,
      prazosSerie,
      stPendMap,
      etapasLista,
      insights,
    };
  }, [dados]);

  // Donut chart generator helper
  function renderDonut(fatias: [string, number, string][]) {
    const total = fatias.reduce((a, f) => a + f[1], 0);
    if (!total) {
      return <div className="text-xs text-[var(--text-muted)] py-4">Sem dados.</div>;
    }
    let acc = 0;
    const gradientStops = fatias
      .map((f) => {
        const start = (acc / total) * 100;
        acc += f[1];
        const end = (acc / total) * 100;
        return `${f[2]} ${start}% ${end}%`;
      })
      .join(', ');

    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div
          className="w-24 h-24 rounded-full relative shrink-0 shadow-sm"
          style={{ background: `conic-gradient(${gradientStops})` }}
        >
          <div className="absolute inset-5 bg-[var(--bg-surface)] rounded-full"></div>
        </div>
        <div className="text-[11px] w-full flex flex-col gap-1">
          {fatias.map(([nome, qtd, cor]) => (
            <div key={nome} className="flex justify-between items-center text-[var(--text-main)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cor }}></span>
                <span>{nome}</span>
              </span>
              <b className="font-bold">
                {qtd} ({total ? Math.round((qtd / total) * 100) : 0}%)
              </b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxEtapa = Math.max(1, ...analise.etapasLista.map((x) => x.qtd));
  const maxPacote = Math.max(1, ...analise.pacotesSerie.map((x) => x.valor));
  const maxPrazo = Math.max(1, ...analise.prazosSerie.map((x) => x.valor));

  return (
    <div className="fixed inset-0 z-[4500] bg-[var(--bg-base)] overflow-y-auto p-4 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-[var(--bg-surface)] border border-[var(--border-light)] border-t-4 border-t-[var(--brand-accent)] px-4 py-2.5 rounded-xl mb-3.5 shadow-sm sticky top-0 z-50">
        <div className="text-base font-extrabold text-[var(--brand-dark)] flex items-center gap-2">
          <i className="fa-solid fa-chart-pie text-[var(--brand-accent)]"></i>
          <span>
            Dashboard da Carteira -{' '}
            <b className="uppercase">{contrato === 'angra' ? 'Angra dos Reis' : 'Magé'}</b>
          </span>
        </div>
        <button
          onClick={onFechar}
          className="bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <i className="fa-solid fa-xmark"></i> Fechar Tela Cheia
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 mb-3">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--brand-accent)] shadow-xs">
          <b className="block text-xl text-[var(--brand-dark)] font-extrabold">
            {analise.D.length}
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Projetos na Carteira
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--status-green)] shadow-xs">
          <b className="block text-xl text-[var(--brand-dark)] font-extrabold">
            {analise.concluidos.length}{' '}
            <small className="text-xs font-semibold text-emerald-600">({analise.pctConcl}%)</small>
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Projetos Concluídos
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--brand-accent)] shadow-xs">
          <b className="block text-xl text-[var(--brand-dark)] font-extrabold">{analise.A.length}</b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Projetos em Aberto
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(analise.tiposAbertosMap.entries()).map(([tp, qtd]) => (
              <span
                key={tp}
                className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--brand-light)] text-[var(--brand-primary)] rounded border border-[var(--border-light)]"
              >
                {tp}: {qtd}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--status-red)] shadow-xs">
          <b className="block text-xl text-rose-600 font-extrabold">
            {analise.vencidosCriticos.length}
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Vencidos s/ Benefício (Cliente)
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--status-red)] shadow-xs">
          <b className="block text-xl text-rose-500 font-extrabold">
            {analise.vencem5Dias.length}
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Vencem em ≤ 5 dias
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[var(--status-amber)] shadow-xs">
          <b className="block text-xl text-amber-500 font-extrabold">
            {analise.atencaoDias.length}
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Atenção (6–15 dias)
          </span>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-2.5 border-l-4 border-l-[#EA580C] shadow-xs">
          <b className="block text-xl text-orange-600 font-extrabold">
            {analise.pendenciasAbertas.length}
          </b>
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Pendências Abertas (SIM)
          </span>
        </div>
      </div>

      {/* Main Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Card 1: Projetos por Etapa */}
        <div className="md:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-bars-staggered text-[var(--brand-accent)]"></i> Projetos por Etapa
            </h4>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {analise.etapasLista.map((x) => (
              <div key={x.etapa} className="grid grid-cols-[110px_1fr_30px] gap-2 items-center text-xs">
                <span className="truncate text-[var(--text-secondary)] font-medium" title={x.etapa}>
                  {x.etapa}
                </span>
                <div className="h-3 bg-black/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(x.qtd / maxEtapa) * 100}%`,
                      backgroundColor: x.cor,
                    }}
                  ></div>
                </div>
                <b className="text-right text-[var(--text-main)] font-bold">{x.qtd}</b>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Semáforo de Prazos (Críticos) */}
        <div className="md:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-traffic-light text-[var(--brand-accent)]"></i> Semáforo de Prazos (Críticos)
            </h4>
          </div>
          {renderDonut([
            ['Vencidos', analise.vencidosCriticos.length, '#991B1B'],
            ['≤ 5 dias', analise.vencem5Dias.length, COR.verm],
            ['6 a 15 dias', analise.atencaoDias.length, COR.amar],
            ['> 15 dias', analise.mais15Dias.length, COR.verde],
          ])}
        </div>

        {/* Card 3: Pendências Construtivas por Status */}
        <div className="md:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation text-[var(--brand-accent)]"></i> Pendências Construtivas
            </h4>
          </div>
          {renderDonut(
            Array.from(analise.stPendMap.entries()).map(([k, v]) => [
              k,
              v,
              normTxt(k) === 'CONCLUIDO' ? COR.verde : COR.lar,
            ])
          )}
        </div>

        {/* Card 4: Pacotes Recebidos por Mês */}
        <div className="md:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-calendar-plus text-[var(--brand-accent)]"></i> Pacotes Recebidos por Mês (Últimos 10)
            </h4>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {analise.pacotesSerie.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-4">Sem dados cronológicos.</div>
            ) : (
              analise.pacotesSerie.map((x) => (
                <div key={x.label} className="grid grid-cols-[80px_1fr_30px] gap-2 items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">{x.label}</span>
                  <div className="h-3 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand-primary)] rounded-full transition-all"
                      style={{ width: `${(x.valor / maxPacote) * 100}%` }}
                    ></div>
                  </div>
                  <b className="text-right text-[var(--text-main)] font-bold">{x.valor}</b>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 5: Data Limite para Execução em Aberto */}
        <div className="md:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-dark)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-calendar-xmark text-[var(--brand-accent)]"></i> Data Limite Execução (Em Aberto)
            </h4>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {analise.prazosSerie.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-4">Sem dados cronológicos.</div>
            ) : (
              analise.prazosSerie.map((x) => (
                <div key={x.label} className="grid grid-cols-[80px_1fr_30px] gap-2 items-center text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">{x.label}</span>
                  <div className="h-3 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(x.valor / maxPrazo) * 100}%`,
                        backgroundColor: x.cor,
                      }}
                    ></div>
                  </div>
                  <b className="text-right text-[var(--text-main)] font-bold">{x.valor}</b>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 6: Top 10 Obras Mais Críticas */}
        <div className="md:col-span-12 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation"></i> Top 10 Obras Mais Críticas (Cliente &amp; Prioridades Críticas)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--brand-accent)] text-[var(--brand-dark)]">
                  <th className="text-left py-2 px-2.5">Projeto / SOB</th>
                  <th className="text-left py-2 px-2.5">Etapa</th>
                  <th className="text-left py-2 px-2.5">Prazo Restante</th>
                  <th className="text-left py-2 px-2.5">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {analise.top10Criticos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-[var(--text-muted)]">
                      Nenhuma obra crítica nos critérios definidos.
                    </td>
                  </tr>
                ) : (
                  analise.top10Criticos.map((x, idx) => {
                    const diasTxt =
                      x.dias < 0 ? (
                        <b className="text-rose-600">{Math.abs(x.dias)} dias em atraso</b>
                      ) : x.dias === 0 ? (
                        <b className="text-rose-600">Vence Hoje</b>
                      ) : (
                        <span className="font-semibold">{x.dias} dias</span>
                      );

                    return (
                      <tr key={idx} className="border-b border-[var(--border-light)] hover:bg-black/5">
                        <td className="py-2 px-2.5 font-bold text-[var(--text-main)]">
                          {obterValorProjeto(x.item)}
                        </td>
                        <td className="py-2 px-2.5 text-[var(--text-secondary)]">
                          {obterValorEtapa(x.item)}
                        </td>
                        <td className="py-2 px-2.5">{diasTxt}</td>
                        <td className="py-2 px-2.5 text-[var(--text-muted)] text-[11px]">
                          {formatarValorGenerico(buscarCampoFlexivel(x.item, 'PRIORIDADE'))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 7: Leituras Automáticas & Análise Operacional */}
        <div className="md:col-span-12 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg p-3 shadow-xs">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[var(--border-light)]">
            <h4 className="text-xs font-bold text-[var(--brand-accent)] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-lightbulb"></i> Leituras Automáticas &amp; Análise Operacional
            </h4>
          </div>
          <ul className="flex flex-col gap-2 text-xs">
            {analise.insights.map((ins, i) => (
              <li
                key={i}
                className={`p-2 rounded-md border-l-4 ${
                  ins.tipo === 'alerta'
                    ? 'border-l-rose-500 bg-rose-500/10 text-[var(--text-main)]'
                    : 'border-l-[var(--brand-accent)] bg-[var(--card-subtle)] text-[var(--text-main)]'
                }`}
                dangerouslySetInnerHTML={{ __html: ins.texto }}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
