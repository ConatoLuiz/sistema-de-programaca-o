import React, { useState } from 'react';

interface WindowsModalProps {
  onFechar: () => void;
}

const PACKAGE_JSON_CONTENT = `{
  "name": "portal-gestao-obras",
  "version": "1.0.0",
  "description": "Portal de Gestao Operacional e Obras para Windows",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "pack": "electron-builder --dir",
    "dist": "electron-builder --win"
  },
  "devDependencies": {
    "electron": "^29.1.0",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.gestaoobras.portal",
    "productName": "Portal de Gestao Operacional e Obras",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [
        "nsis",
        "portable"
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Portal de Gestao de Obras"
    }
  }
}`;

const MAIN_JS_CONTENT = `const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Portal de Gestão Operacional & Obras',
    backgroundColor: '#F4FBF7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});`;

const PRELOAD_JS_CONTENT = `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  plataforma: process.platform,
  versaoApp: '1.0.0'
});`;

export const WindowsModal: React.FC<WindowsModalProps> = ({ onFechar }) => {
  const [arquivoAtivo, setArquivoAtivo] = useState<'package' | 'main' | 'preload'>('package');
  const [copiado, setCopiado] = useState(false);

  const conteudoAtual =
    arquivoAtivo === 'package'
      ? PACKAGE_JSON_CONTENT
      : arquivoAtivo === 'main'
      ? MAIN_JS_CONTENT
      : PRELOAD_JS_CONTENT;

  const nomeArquivoAtual =
    arquivoAtivo === 'package' ? 'package.json' : arquivoAtivo === 'main' ? 'main.js' : 'preload.js';

  function handleCopiar() {
    navigator.clipboard.writeText(conteudoAtual);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleDownloadArquivo(nome: string, conteudo: string) {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadTodos() {
    handleDownloadArquivo('package.json', PACKAGE_JSON_CONTENT);
    setTimeout(() => handleDownloadArquivo('main.js', MAIN_JS_CONTENT), 200);
    setTimeout(() => handleDownloadArquivo('preload.js', PRELOAD_JS_CONTENT), 400);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[5000] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
      onClick={onFechar}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl max-w-3xl w-full p-5 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-[var(--brand-accent)] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0284c7] text-white flex items-center justify-center text-base">
              <i className="fa-brands fa-windows"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[var(--brand-dark)]">
                Gerar Aplicativo Desktop (.EXE) para Windows
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Instruções completas e arquivos do Electron Builder
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Step-by-step instructions */}
        <div className="bg-[var(--card-subtle)] border border-[var(--border-light)] rounded-lg p-3.5 mb-4 text-xs">
          <b className="text-[var(--brand-dark)] text-sm block mb-2">
            <i className="fa-solid fa-list-ol text-[var(--brand-accent)] mr-1"></i> Passos para Compilar no Windows:
          </b>
          <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-main)] font-medium leading-relaxed">
            <li>
              Crie uma pasta no seu computador chamada <code className="bg-black/5 px-1.5 py-0.5 rounded font-mono">portal-gestao-obras</code>.
            </li>
            <li>
              Salve os arquivos fornecidos abaixo dentro dessa pasta: <code className="bg-black/5 px-1 py-0.5 rounded font-mono">package.json</code>, <code className="bg-black/5 px-1 py-0.5 rounded font-mono">main.js</code>, <code className="bg-black/5 px-1 py-0.5 rounded font-mono">preload.js</code> e <code className="bg-black/5 px-1 py-0.5 rounded font-mono">index.html</code>.
            </li>
            <li>
              Abra o <b>Prompt de Comando (CMD)</b> ou <b>PowerShell</b> dentro dessa pasta.
            </li>
            <li>
              Execute o comando: <code className="bg-emerald-500/20 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">npm install</code>
            </li>
            <li>
              Para testar imediatamente em modo desktop, execute:{' '}
              <code className="bg-emerald-500/20 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">npm start</code>
            </li>
            <li>
              Para compilar e gerar o instalador executável (.exe) para Windows, execute:{' '}
              <code className="bg-emerald-500/20 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">npm run dist</code>
            </li>
            <li>
              O instalador executável (<code className="font-mono">.exe</code>) e a versão portátil serão criados dentro da pasta <code className="bg-black/5 px-1.5 py-0.5 rounded font-mono">dist</code>!
            </li>
          </ol>
        </div>

        {/* File tabs & viewer */}
        <div className="border border-[var(--border-light)] rounded-lg overflow-hidden bg-[var(--bg-base)]">
          <div className="flex justify-between items-center bg-[var(--card-subtle)] border-b border-[var(--border-light)] px-3 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setArquivoAtivo('package')}
                className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                  arquivoAtivo === 'package'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-black/5'
                }`}
              >
                package.json
              </button>
              <button
                onClick={() => setArquivoAtivo('main')}
                className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                  arquivoAtivo === 'main'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-black/5'
                }`}
              >
                main.js
              </button>
              <button
                onClick={() => setArquivoAtivo('preload')}
                className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-all ${
                  arquivoAtivo === 'preload'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-black/5'
                }`}
              >
                preload.js
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopiar}
                className="bg-[var(--bg-surface)] hover:bg-black/5 border border-[var(--border-light)] text-[var(--text-main)] px-3 py-1 rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <i className={`fa-solid ${copiado ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={() => handleDownloadArquivo(nomeArquivoAtual, conteudoAtual)}
                className="bg-[var(--brand-primary)] hover:brightness-110 text-white px-3 py-1 rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <i className="fa-solid fa-download"></i>
                <span>Baixar</span>
              </button>
            </div>
          </div>

          <pre className="p-3 text-[11px] font-mono overflow-x-auto text-[var(--text-main)] max-h-56">
            {conteudoAtual}
          </pre>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap justify-between items-center gap-2 mt-4 pt-3 border-t border-[var(--border-light)]">
          <button
            onClick={handleDownloadTodos}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer inline-flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
            <span>Baixar Todos os Arquivos Windows (.json, .js)</span>
          </button>

          <button
            onClick={onFechar}
            className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
