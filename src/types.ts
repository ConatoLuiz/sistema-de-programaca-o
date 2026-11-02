export type ContratoId = 'angra' | 'mage';

export type TabId = 'mapa' | 'carteira' | 'prog' | 'fontes';

export type SlaFaixa = 'todos' | 'violada' | '12dias' | '20dias' | '30dias';

export interface CarteiraItem {
  [key: string]: any;
  ETAPA?: string;
  PACOTE?: string;
  BASE?: string;
  TIPO?: string;
  PROJETO?: string;
  PARCEIRA?: string;
  'DATA LIMITE PARA EXECUÇÃO'?: string;
  PRIORIDADE?: string;
  STATUS?: string;
  'DATA PROGRAMADA'?: string;
  OBSERVAÇÕES?: string;
  BAIRRO?: string;
  ALIMENTADOR?: string;
  RESPONSÁVEL?: string;
  'BENEFÍCIO ATINGIDO?'?: string;
  'BENEFÍCIO ANTINGIDO?'?: string;
  'PENDÊNCIA CONSTRUTIVA?'?: string;
  'PENDÊNCIAS APONTADAS'?: string;
  'STATUS PENDÊNCIA'?: string;
  LONGITUDE?: string | number;
  LATITUDE?: string | number;
}

export interface ProgItem {
  d: Date;
  iso: string;
  sob: string;
  ano: number;
  base: string;
  tipo: string;
  dataExec: string;
  diaSemana: string;
  prioridade: string;
  mk: number;
  cesto: number;
  lv: number;
  poda: number;
  vencimentoObras: string;
  st: string;
  custoProg: string;
  baremoProg: string;
  valorExec: string;
  complProg: string;
  mun: string;
  bairro: string;
  desc: string;
  resp: string;
  raw: Record<string, string>;
}

export interface LinksPlanilhas {
  carteira_angra: string;
  carteira_mage: string;
  prog_angra: string;
  prog_mage: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  type?: 'user' | 'alert' | 'success' | 'info';
  timestamp: string;
}
