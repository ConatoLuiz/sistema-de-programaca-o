import * as XLSX from 'xlsx';
import { CarteiraItem, ProgItem } from '../types';

export const PALETA_CORES = [
  '#0b5cab',
  '#6366F1',
  '#059669',
  '#D97706',
  '#E11D48',
  '#7C3AED',
  '#0D9488',
  '#EA580C',
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EC4899',
];

export const PRIORIDADES_CRITICAS = [
  'GRUPO B - FLUXO',
  'JURIDICO',
  'GRUPO A - FLUXO',
  'GRUPO B - FLUXO - ACAO DE HV -',
  'OUVIDORIA',
];

export function normTxt(s: any): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extrairLinkCsvGoogle(str: string): string {
  if (!str) return '';
  str = String(str).trim();
  const match = str.match(/src=["']([^"']+)["']/i);
  if (match && match[1]) str = match[1];
  str = str.replace(/&amp;/g, '&');
  if (str.includes('/pubhtml')) {
    str = str.replace('/pubhtml', '/pub');
    if (!str.includes('output=csv')) {
      str += (str.includes('?') ? '&' : '?') + 'output=csv';
    }
  }
  return str;
}

export function buscarCampoFlexivel(obj: any, ...nomes: string[]): any {
  if (!obj) return '';
  const chaves = Object.keys(obj);
  // Exact sanitized match
  for (const n of nomes) {
    const normN = n.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const c of chaves) {
      if (c.toLowerCase().replace(/[^a-z0-9]/g, '') === normN) return obj[c];
    }
  }
  // Partial substring match
  for (const n of nomes) {
    const normN = n.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const c of chaves) {
      const normC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normC.includes(normN) || normN.includes(normC)) return obj[c];
    }
  }
  return '';
}

export function paraData(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    try {
      const p = XLSX.SSF.parse_date_code(v);
      if (p) return new Date(p.y, p.m - 1, p.d);
    } catch {
      // fallback excel epoch
      return new Date((v - 25569) * 86400 * 1000);
    }
  }
  const s = String(v).trim().split('T')[0];
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) {
      const ano = p[2].length === 2 ? '20' + p[2] : p[2];
      return new Date(parseInt(ano, 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
    }
  }
  if (s.includes('-')) {
    const p = s.split('-');
    if (p.length === 3) {
      if (p[0].length === 4) {
        return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      } else {
        return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
      }
    }
  }
  return null;
}

export function calcularDiasRestantes(dataVal: any): number {
  const d = paraData(dataVal);
  if (!d) return 999;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatarDataBR(v: any): string {
  const d = paraData(v);
  if (!d || d.getFullYear() <= 1900) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatarValorGenerico(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return formatarDataBR(v);
  return String(v).trim();
}

export function obterValorEtapa(item: CarteiraItem): string {
  return String(
    buscarCampoFlexivel(item, 'ETAPA', 'STATUS', 'FASE', 'SITUACAO', 'INFO STATUS') || 'NÃO DEFINIDO'
  ).trim();
}

export function obterValorProjeto(item: CarteiraItem): string {
  return String(buscarCampoFlexivel(item, 'PROJETO', 'CODIGO', 'OBRA', 'SOB') || '').trim();
}

export function ehPrioridadeCritica(prioStr: string): boolean {
  if (!prioStr) return false;
  const n = normTxt(prioStr);
  return PRIORIDADES_CRITICAS.some((pc) => n.includes(normTxt(pc)) || normTxt(pc).includes(n));
}

export interface SinalUrgencia {
  cor: 'vermelho' | 'amarelo' | 'verde';
  dias: number;
  texto: string;
}

export function obterSinal(item: CarteiraItem): SinalUrgencia | null {
  const tipo = normTxt(buscarCampoFlexivel(item, 'TIPO', 'TIPO DE SERVICO'));
  if (!tipo.includes('CLIENTE')) return null;

  const prio = buscarCampoFlexivel(item, 'PRIORIDADE');
  if (!ehPrioridadeCritica(prio)) return null;

  const beneficio = String(
    buscarCampoFlexivel(item, 'BENEFÍCIO ATINGIDO?', 'BENEFÍCIO ANTINGIDO?', 'BENEFICIO ATINGIDO') ?? ''
  ).trim();
  if (beneficio !== '') return null;

  const dataLimite = buscarCampoFlexivel(
    item,
    'DATA LIMITE PARA EXECUÇÃO',
    'DATA LIMITE',
    'LIMITE EXECUCAO'
  );
  const dias = calcularDiasRestantes(dataLimite);
  if (dias === 999) return null;

  let cor: 'vermelho' | 'amarelo' | 'verde' = 'verde';
  if (dias <= 5) cor = 'vermelho';
  else if (dias <= 15) cor = 'amarelo';

  const texto = dias < 0 ? `${Math.abs(dias)}d em atraso` : dias === 0 ? 'vence hoje' : `${dias}d`;
  return { cor, dias, texto };
}

export function parseCSV(text: string): string[][] {
  const r: string[][] = [];
  let row: string[] = [];
  let c = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          c += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        c += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(c);
      c = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(c);
      c = '';
      r.push(row);
      row = [];
    } else {
      c += ch;
    }
  }
  if (c || row.length) {
    row.push(c);
    r.push(row);
  }
  return r;
}

export function extrairQuantidadesEstrutura(str: string): { mk: number; cesto: number; lv: number; poda: number } {
  const s = String(str || '').toUpperCase();
  function extrai(regex: RegExp) {
    const m = s.match(regex);
    if (!m) return 0;
    return m[1] ? parseInt(m[1], 10) : 1;
  }
  const mk = extrai(/(\d+)\s*MK|MK/);
  const cesto = extrai(/(\d+)\s*CESTO|CESTO/);
  const lv = extrai(/(\d+)\s*(?:LV|LINHA\s*VIVA)|LV|LINHA\s*VIVA/);
  const poda = extrai(/(\d+)\s*PODA|PODA/);
  return { mk, cesto, lv, poda };
}

export function money(s: any): number {
  s = String(s || '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s) || 0;
}

export function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseProgramacaoCSV(text: string): ProgItem[] | null {
  const rows = parseCSV(text);
  const norm = (s: any) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const hi = rows.findIndex((r) => r.length > 0 && norm(r[0]) === 'base');
  if (hi < 0) return null;

  const h = rows[hi].map(norm);
  const out: ProgItem[] = [];
  const g = (r: string[], n: string) => {
    const i = h.indexOf(norm(n));
    return i < 0 ? '' : (r[i] || '').trim();
  };

  const iso = (d: Date) =>
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0');

  for (const r of rows.slice(hi + 1)) {
    const dataExec = g(r, 'Data de execução');
    const m = dataExec.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const sob = g(r, 'SOB');
    if (!m || !sob) continue;

    const ano = parseInt(m[3], 10);
    if (ano < 2026) continue;

    const d = new Date(ano, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    const raw: Record<string, string> = {};
    h.forEach((k, i) => {
      if (k && (r[i] || '').trim()) {
        const headerName = rows[hi][i].replace(/\s+/g, ' ').trim();
        raw[headerName] = r[i].trim();
      }
    });

    const estStr = g(r, 'Estrutura');
    const estQtd = extrairQuantidadesEstrutura(estStr);

    out.push({
      d,
      iso: iso(d),
      sob,
      ano,
      base: g(r, 'BASE'),
      tipo: g(r, 'Tipo de Serviço'),
      dataExec,
      diaSemana: g(r, 'Dia da semana'),
      prioridade: g(r, 'PRIORIDADE'),
      mk: estQtd.mk,
      cesto: estQtd.cesto,
      lv: estQtd.lv,
      poda: estQtd.poda,
      vencimentoObras: g(r, 'Vencimento de Obras'),
      st: g(r, 'STATUS').toUpperCase(),
      custoProg: g(r, 'Custo Programado'),
      baremoProg: g(r, 'Baremo Programado'),
      valorExec: g(r, 'Valor Executado'),
      complProg: g(r, 'Complemento Programado'),
      mun: g(r, 'Município'),
      bairro: g(r, 'Bairro'),
      desc: g(r, 'Descrição do serviço'),
      resp: g(r, 'Responsável Execução'),
      raw,
    });
  }
  return out;
}

export function classificarStatusProg(s: string): string {
  const normS = (s || '').toUpperCase();
  if (normS.startsWith('CONCL')) return 'CONCLUÍDO';
  if (normS.startsWith('CANCEL')) return 'CANCELADO';
  if (normS.startsWith('ADIAD')) return 'ADIADO';
  if (normS.startsWith('PARCIAL')) return 'PARCIAL';
  return 'OUTRO';
}
