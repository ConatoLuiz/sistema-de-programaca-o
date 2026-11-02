import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { ContratoId, TabId, CarteiraItem, ProgItem, LinksPlanilhas, ChatMessage } from './types';
import { INITIAL_LINKS, SAMPLE_MAGE_CARTEIRA } from './utils/sampleData';
import {
  parseProgramacaoCSV,
  calcularDiasRestantes,
  buscarCampoFlexivel,
} from './utils/dataParser';
import { Header } from './components/Header';
import { MapTab } from './components/MapTab';
import { CarteiraTab } from './components/CarteiraTab';
import { CarteiraModalDash } from './components/CarteiraModalDash';
import { ProgTab } from './components/ProgTab';
import { FontesTab } from './components/FontesTab';
import { ChatWidget } from './components/ChatWidget';
import { WindowsModal } from './components/WindowsModal';

const ADMIN_HASH_LOGIN = 'bHVpei50MTk5OA==';
const ADMIN_HASH_PASS = 'YWRtaW4=';

export default function App() {
  const [contrato, setContrato] = useState<ContratoId>('angra');
  const [tab, setTab] = useState<TabId>('mapa');

  // Links configuration with local storage persistence
  const [links, setLinks] = useState<LinksPlanilhas>(() => {
    try {
      const saved = localStorage.getItem('app_links_v11_restored');
      if (saved) return { ...INITIAL_LINKS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return INITIAL_LINKS;
  });

  // Dark/Light Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('theme_preference') === 'dark';
  });

  // Data states
  const [carteiraDados, setCarteiraDados] = useState<Record<ContratoId, CarteiraItem[]>>({
    angra: [],
    mage: SAMPLE_MAGE_CARTEIRA,
  });

  const [progDados, setProgDados] = useState<Record<ContratoId, ProgItem[]>>({
    angra: [],
    mage: [],
  });

  const [progOk, setProgOk] = useState<Record<ContratoId, boolean | null>>({
    angra: null,
    mage: null,
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [statusCarteira, setStatusCarteira] = useState<string>('');

  // Modals
  const [modalDashOpen, setModalDashOpen] = useState<boolean>(false);
  const [modalWindowsOpen, setModalWindowsOpen] = useState<boolean>(false);

  // Chat feed messages
  const [mensagensChat, setMensagensChat] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      text: '<b>Sistema Conectado</b><br>Feed operacional ativo. Sincronização automática programada a cada 10 minutos.',
      type: 'success',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [adminSessaoAtiva, setAdminSessaoAtiva] = useState<boolean>(false);
  const [aguardandoCredenciais, setAguardandoCredenciais] = useState<boolean>(false);

  // Theme effect
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme_preference', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme_preference', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Add chat message helper
  const adicionarFeedChat = useCallback((texto: string, tipo?: 'user' | 'alert' | 'success' | 'info') => {
    setMensagensChat((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        text: texto,
        type: tipo,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Fetch Carteira
  const carregarCarteira = useCallback(
    async (contratoAlvo: ContratoId, linksAtuais: LinksPlanilhas) => {
      const url = linksAtuais[`carteira_${contratoAlvo}`];

      if (!url) {
        if (contratoAlvo === 'mage') {
          setCarteiraDados((prev) => ({ ...prev, mage: SAMPLE_MAGE_CARTEIRA }));
          setStatusCarteira('MAGÉ: Modo de Demonstração (Aguardando link de Magé)');
        } else {
          setCarteiraDados((prev) => ({ ...prev, [contratoAlvo]: [] }));
          setStatusCarteira(`Carteira ${contratoAlvo.toUpperCase()}: Sem link publicado.`);
        }
        return;
      }

      setStatusCarteira(`Lendo dados de ${contratoAlvo.toUpperCase()}...`);

      try {
        const fetchUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
        const resp = await fetch(fetchUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha HTTP');

        const csvData = await resp.text();
        const wb = XLSX.read(csvData, { type: 'string', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: CarteiraItem[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        setCarteiraDados((prev) => ({ ...prev, [contratoAlvo]: rows }));
        setStatusCarteira(`${contratoAlvo.toUpperCase()} Conectado (${rows.length} obras)`);
        adicionarFeedChat(
          `Carteira (${contratoAlvo.toUpperCase()}): <b>${rows.length} obras</b> carregadas com sucesso.`,
          'success'
        );
      } catch {
        setStatusCarteira(`Falha ao ler planilha de ${contratoAlvo.toUpperCase()}`);
        if (contratoAlvo === 'mage') {
          setCarteiraDados((prev) => ({ ...prev, mage: SAMPLE_MAGE_CARTEIRA }));
        }
      }
    },
    [adicionarFeedChat]
  );

  // Fetch Programação
  const carregarProg = useCallback(
    async (contratoAlvo: ContratoId, linksAtuais: LinksPlanilhas) => {
      const url = linksAtuais[`prog_${contratoAlvo}`];
      if (!url) {
        setProgOk((prev) => ({ ...prev, [contratoAlvo]: false }));
        return;
      }

      try {
        const fetchUrl = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
        const resp = await fetch(fetchUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha HTTP');

        const csvData = await resp.text();
        const itens = parseProgramacaoCSV(csvData);

        if (!itens) throw new Error('Sem cabeçalho BASE');

        setProgDados((prev) => ({ ...prev, [contratoAlvo]: itens }));
        setProgOk((prev) => ({ ...prev, [contratoAlvo]: true }));
        adicionarFeedChat(
          `Programação (${contratoAlvo.toUpperCase()}): <b>${itens.length} registros</b> sincronizados.`,
          'info'
        );
      } catch {
        setProgOk((prev) => ({ ...prev, [contratoAlvo]: false }));
      }
    },
    [adicionarFeedChat]
  );

  // Full sync
  const sincronizarTudo = useCallback(
    async (linksAtuais: LinksPlanilhas = links) => {
      setIsSyncing(true);
      await Promise.all([
        carregarCarteira(contrato, linksAtuais),
        carregarProg(contrato, linksAtuais),
      ]);
      setIsSyncing(false);
    },
    [contrato, links, carregarCarteira, carregarProg]
  );

  // Initial load and on contract switch
  useEffect(() => {
    sincronizarTudo(links);
  }, [contrato]);

  // Periodic automatic sync every 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      sincronizarTudo(links);
      adicionarFeedChat(
        '🔄 <b>Atualização Automática:</b> Planilhas consultadas na nuvem.',
        'success'
      );
    }, 10 * 60 * 1000);

    return () => clearInterval(timer);
  }, [sincronizarTudo, links, adicionarFeedChat]);

  // Handle saving new spreadsheet links
  const handleSalvarLinks = (novosLinks: LinksPlanilhas) => {
    setLinks(novosLinks);
    localStorage.setItem('app_links_v11_restored', JSON.stringify(novosLinks));
    sincronizarTudo(novosLinks);
    adicionarFeedChat('🔗 <b>Links de planilhas atualizados e salvos!</b>', 'success');
  };

  // Handle Chat input and natural language commands
  const handleEnviarMensagemChat = (txt: string) => {
    adicionarFeedChat(`<b>Você:</b> ${txt}`, 'user');

    if (aguardandoCredenciais) {
      const partes = txt.split(/[\s,]+/);
      if (partes.length < 2) {
        adicionarFeedChat(
          'Para validar acesso administrativo, digite Login e Senha separados por espaço.',
          'alert'
        );
        return;
      }

      try {
        const login = btoa(partes[0].toLowerCase());
        const pass = btoa(partes[1]);

        if (login === ADMIN_HASH_LOGIN && pass === ADMIN_HASH_PASS) {
          setAdminSessaoAtiva(true);
          setAguardandoCredenciais(false);
          adicionarFeedChat(
            '🔐 <b>Acesso Administrativo Concedido!</b><br>Você possui permissões de administrador. Chave Gemini pode ser configurada via: <code>gemini-key: SUA_CHAVE</code>.',
            'success'
          );
        } else {
          adicionarFeedChat('❌ <b>Credenciais Inválidas.</b> Acesso negado.', 'alert');
        }
      } catch {
        adicionarFeedChat('❌ <b>Erro na validação das credenciais.</b>', 'alert');
      }
      return;
    }

    const q = txt.toLowerCase();

    if (
      q.includes('edit') ||
      q.includes('alterar') ||
      q.includes('mudar codigo') ||
      q.includes('ia studio') ||
      q.includes('google ia')
    ) {
      if (!adminSessaoAtiva) {
        setAguardandoCredenciais(true);
        adicionarFeedChat(
          '🔒 <b>Ação Restrita:</b> Digite <b>Login e Senha</b> separados por espaço para autorizar comandos administrativos.',
          'alert'
        );
        return;
      } else {
        adicionarFeedChat(
          '⚙️ <b>Administrador Ativo:</b> Você pode executar configurações avançadas ou salvar sua chave Gemini via <code>gemini-key: CHAVE</code>.',
          'success'
        );
        return;
      }
    }

    if (q.startsWith('gemini-key:')) {
      const key = txt.split(':')[1]?.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        adicionarFeedChat('✅ <b>Chave Google AI Studio configurada com sucesso!</b>', 'success');
        return;
      }
    }

    // Smart data responses
    setTimeout(() => {
      const listaAtual = carteiraDados[contrato];
      const total = listaAtual.length;
      const vencidos = listaAtual.filter(
        (i) =>
          calcularDiasRestantes(
            buscarCampoFlexivel(i, 'DATA LIMITE PARA EXECUÇÃO', 'DATA LIMITE')
          ) <= 0
      ).length;

      if (q.includes('venc') || q.includes('atras') || q.includes('prazo')) {
        adicionarFeedChat(
          `🚨 <b>Obras Vencidas:</b> Existem <b>${vencidos}</b> projetos com data limite ultrapassada no contrato de ${contrato.toUpperCase()}.`,
          'alert'
        );
      } else if (q.includes('prog') || q.includes('semana') || q.includes('equipe')) {
        const totalProg = progDados[contrato].length;
        adicionarFeedChat(
          `📅 <b>Programação Operacional:</b> O contrato <b>${contrato.toUpperCase()}</b> conta com <b>${totalProg}</b> frentes programadas a partir de 2026.`,
          'info'
        );
      } else {
        adicionarFeedChat(
          `📊 <b>Status da Carteira:</b> O contrato <b>${contrato.toUpperCase()}</b> possui atualmente <b>${total}</b> obras cadastradas, das quais <b>${vencidos}</b> demandam atenção imediata por prazo.`,
          'success'
        );
      }
    }, 400);
  };

  const dadosAtuaisCarteira = carteiraDados[contrato];
  const dadosAtuaisProg = progDados[contrato];
  const conexaoProgAtual = progOk[contrato] ?? false;

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen flex flex-col font-sans">
      {/* App Header */}
      <Header
        contrato={contrato}
        onMudarContrato={(c) => {
          setContrato(c);
          adicionarFeedChat(
            `Contrato alterado para <b>${c.toUpperCase()}</b>. Carregando dados...`,
            'info'
          );
        }}
        onSincronizar={() => sincronizarTudo(links)}
        isSyncing={isSyncing}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onAbrirModalWindows={() => setModalWindowsOpen(true)}
      />

      {/* Main Tabs Navigation */}
      <nav className="flex gap-1 mb-3 border-b-2 border-[var(--border-light)] pb-0.5 overflow-x-auto">
        <button
          onClick={() => setTab('mapa')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all inline-flex items-center gap-2 border-b-3 cursor-pointer whitespace-nowrap ${
            tab === 'mapa'
              ? 'text-[var(--brand-accent)] border-[var(--brand-accent)] bg-emerald-500/10'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)] hover:bg-emerald-500/5'
          }`}
        >
          <i className="fa-solid fa-map-location-dot"></i> Mapa Georreferenciado
        </button>

        <button
          onClick={() => setTab('carteira')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all inline-flex items-center gap-2 border-b-3 cursor-pointer whitespace-nowrap ${
            tab === 'carteira'
              ? 'text-[var(--brand-accent)] border-[var(--brand-accent)] bg-emerald-500/10'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)] hover:bg-emerald-500/5'
          }`}
        >
          <i className="fa-solid fa-table-list"></i> Carteira de Projetos
        </button>

        <button
          onClick={() => setTab('prog')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all inline-flex items-center gap-2 border-b-3 cursor-pointer whitespace-nowrap ${
            tab === 'prog'
              ? 'text-[var(--brand-accent)] border-[var(--brand-accent)] bg-emerald-500/10'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)] hover:bg-emerald-500/5'
          }`}
        >
          <i className="fa-solid fa-calendar-check"></i> Programação de Obras
        </button>

        <button
          onClick={() => setTab('fontes')}
          className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all inline-flex items-center gap-2 border-b-3 cursor-pointer whitespace-nowrap ${
            tab === 'fontes'
              ? 'text-[var(--brand-accent)] border-[var(--brand-accent)] bg-emerald-500/10'
              : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--brand-accent)] hover:bg-emerald-500/5'
          }`}
        >
          <i className="fa-solid fa-link"></i> Fontes de Dados
        </button>
      </nav>

      {/* Main Tab Content */}
      <main className="flex-1 pb-16">
        {tab === 'mapa' && <MapTab dados={dadosAtuaisCarteira} />}

        {tab === 'carteira' && (
          <CarteiraTab
            dados={dadosAtuaisCarteira}
            statusTexto={statusCarteira}
            onAbrirDashboard={() => setModalDashOpen(true)}
          />
        )}

        {tab === 'prog' && (
          <ProgTab
            dados={dadosAtuaisProg}
            contrato={contrato}
            isConnected={conexaoProgAtual}
          />
        )}

        {tab === 'fontes' && (
          <FontesTab
            links={links}
            onSalvar={handleSalvarLinks}
            onAbrirModalWindows={() => setModalWindowsOpen(true)}
          />
        )}
      </main>

      {/* Fullscreen Carteira Dashboard Modal */}
      {modalDashOpen && (
        <CarteiraModalDash
          dados={dadosAtuaisCarteira}
          contrato={contrato}
          onFechar={() => setModalDashOpen(false)}
        />
      )}

      {/* Windows Desktop Modal */}
      {modalWindowsOpen && <WindowsModal onFechar={() => setModalWindowsOpen(false)} />}

      {/* Chat & Feed Widget */}
      <ChatWidget
        mensagens={mensagensChat}
        onEnviarMensagem={handleEnviarMensagemChat}
        dadosCarteira={dadosAtuaisCarteira}
        contrato={contrato}
      />
    </div>
  );
}
