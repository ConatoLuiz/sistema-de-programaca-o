import React, { useState } from 'react';
import { LinksPlanilhas } from '../types';
import { extrairLinkCsvGoogle } from '../utils/dataParser';

interface FontesTabProps {
  links: LinksPlanilhas;
  onSalvar: (novosLinks: LinksPlanilhas) => void;
  onAbrirModalWindows: () => void;
}

export const FontesTab: React.FC<FontesTabProps> = ({
  links,
  onSalvar,
  onAbrirModalWindows,
}) => {
  const [formLinks, setFormLinks] = useState<LinksPlanilhas>({ ...links });
  const [mensagemSalvo, setMensagemSalvo] = useState(false);

  function handleSalvar() {
    const limpos: LinksPlanilhas = {
      carteira_angra: extrairLinkCsvGoogle(formLinks.carteira_angra),
      carteira_mage: extrairLinkCsvGoogle(formLinks.carteira_mage),
      prog_angra: extrairLinkCsvGoogle(formLinks.prog_angra),
      prog_mage: extrairLinkCsvGoogle(formLinks.prog_mage),
    };

    setFormLinks(limpos);
    onSalvar(limpos);
    setMensagemSalvo(true);
    setTimeout(() => setMensagemSalvo(false), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Google Sheets Connection Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-3 border-b border-[var(--border-light)] pb-3">
          <div>
            <h3 className="text-base font-extrabold text-[var(--brand-dark)] flex items-center gap-2">
              <i className="fa-solid fa-link text-[var(--brand-accent)]"></i>
              <span>Conexão com as Planilhas do Google</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Consulte o status das fontes de dados ou atualize os links das planilhas publicadas na web em formato CSV.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {mensagemSalvo && (
              <span className="text-xs font-bold text-emerald-600 animate-fade-in">
                <i className="fa-solid fa-circle-check"></i> Salvo com sucesso!
              </span>
            )}
            <button
              onClick={handleSalvar}
              className="bg-[var(--brand-primary)] hover:brightness-110 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-sm"
            >
              <i className="fa-solid fa-floppy-disk"></i> Salvar e Aplicar Alterações
            </button>
          </div>
        </div>

        {/* 4 Spreadsheet Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Carteira Angra */}
          <div className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <b className="text-xs text-[var(--brand-dark)]">Carteira de Projetos - Angra dos Reis</b>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formLinks.carteira_angra
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {formLinks.carteira_angra ? '● Conectada' : '○ Sem Link'}
              </span>
            </div>
            <input
              type="text"
              value={formLinks.carteira_angra}
              onChange={(e) =>
                setFormLinks((prev) => ({ ...prev, carteira_angra: e.target.value }))
              }
              placeholder="Cole o link ou iframe publicado em CSV"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] font-mono text-xs px-2.5 py-1.5 rounded-md mt-1 outline-none focus:border-[var(--brand-accent)]"
            />
          </div>

          {/* Carteira Magé */}
          <div className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <b className="text-xs text-[var(--brand-dark)]">Carteira de Projetos - Magé</b>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formLinks.carteira_mage
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {formLinks.carteira_mage ? '● Conectada' : '○ Aguardando Link'}
              </span>
            </div>
            <input
              type="text"
              value={formLinks.carteira_mage}
              onChange={(e) =>
                setFormLinks((prev) => ({ ...prev, carteira_mage: e.target.value }))
              }
              placeholder="Cole aqui o link ou iframe de Magé quando disponível (output=csv)"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] font-mono text-xs px-2.5 py-1.5 rounded-md mt-1 outline-none focus:border-[var(--brand-accent)]"
            />
          </div>

          {/* Programação Angra */}
          <div className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <b className="text-xs text-[var(--brand-dark)]">Programação de Obras - Angra dos Reis</b>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formLinks.prog_angra
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {formLinks.prog_angra ? '● Conectada' : '○ Sem Link'}
              </span>
            </div>
            <input
              type="text"
              value={formLinks.prog_angra}
              onChange={(e) =>
                setFormLinks((prev) => ({ ...prev, prog_angra: e.target.value }))
              }
              placeholder="Cole o link ou iframe publicado em CSV"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] font-mono text-xs px-2.5 py-1.5 rounded-md mt-1 outline-none focus:border-[var(--brand-accent)]"
            />
          </div>

          {/* Programação Magé */}
          <div className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <b className="text-xs text-[var(--brand-dark)]">Programação de Obras - Magé</b>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formLinks.prog_mage
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {formLinks.prog_mage ? '● Conectada' : '○ Sem Link'}
              </span>
            </div>
            <input
              type="text"
              value={formLinks.prog_mage}
              onChange={(e) =>
                setFormLinks((prev) => ({ ...prev, prog_mage: e.target.value }))
              }
              placeholder="Cole o link ou iframe publicado em CSV"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-main)] font-mono text-xs px-2.5 py-1.5 rounded-md mt-1 outline-none focus:border-[var(--brand-accent)]"
            />
          </div>
        </div>

        {/* Instructions helper box */}
        <div className="mt-4 p-3 bg-emerald-500/10 border border-[var(--brand-accent)]/30 rounded-lg text-xs text-[var(--text-secondary)]">
          <b className="text-[var(--brand-dark)] block mb-1">
            <i className="fa-solid fa-circle-info mr-1"></i> Como publicar uma nova planilha no Google Sheets:
          </b>
          <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Abra a planilha no Google Planilhas.</li>
            <li>
              Acesse o menu: <b>Arquivo &gt; Compartilhar &gt; Publicar na Web</b>.
            </li>
            <li>
              Selecione a aba correspondente e escolha o formato <b>Valores separados por vírgula (.csv)</b>.
            </li>
            <li>Copie o link gerado e cole no campo acima correspondente. O sistema ajusta automaticamente.</li>
          </ol>
        </div>
      </div>

      {/* Windows Desktop Builder Box */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 shadow-sm flex flex-wrap justify-between items-center gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--brand-dark)] flex items-center gap-2">
            <i className="fa-brands fa-windows text-[#0284c7]"></i>
            <span>Executável Windows (.EXE) &amp; Versão Portátil</span>
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            O aplicativo está pronto para ser compilado como instalador nativo para Windows 10/11 utilizando Electron.
          </p>
        </div>

        <button
          onClick={onAbrirModalWindows}
          className="bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-1.5 shadow-sm transition-all"
        >
          <i className="fa-solid fa-download"></i> Ver Guia de Instalação &amp; Arquivos
        </button>
      </div>
    </div>
  );
};
