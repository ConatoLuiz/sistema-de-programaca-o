import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, CarteiraItem, ContratoId } from '../types';
import { calcularDiasRestantes, buscarCampoFlexivel } from '../utils/dataParser';

interface ChatWidgetProps {
  mensagens: ChatMessage[];
  onEnviarMensagem: (msg: string) => void;
  dadosCarteira: CarteiraItem[];
  contrato: ContratoId;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  mensagens,
  onEnviarMensagem,
  dadosCarteira,
  contrato,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens, isOpen]);

  function handleSend() {
    const text = inputVal.trim();
    if (!text) return;
    onEnviarMensagem(text);
    setInputVal('');
  }

  return (
    <div className="fixed bottom-5 right-5 z-[4000] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[340px] sm:w-[360px] h-[460px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-lg)] shadow-[var(--shadow-float)] mb-2.5 flex flex-col overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-[var(--brand-dark)] text-white px-3.5 py-2.5 flex justify-between items-center text-xs font-bold shadow-xs">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-robot text-[var(--brand-accent)]"></i> Feed &amp; Assistente Google AI
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-300 hover:text-white text-base leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 text-xs">
            {mensagens.map((m) => {
              let bubbleCls = 'bg-[var(--card-subtle)] text-[var(--text-main)] border-l-3 border-l-[var(--brand-accent)]';
              if (m.type === 'alert') {
                bubbleCls = 'bg-rose-500/10 text-[var(--text-main)] border-l-3 border-l-rose-500';
              } else if (m.type === 'success') {
                bubbleCls = 'bg-emerald-500/10 text-[var(--text-main)] border-l-3 border-l-emerald-500';
              } else if (m.type === 'user') {
                bubbleCls =
                  'self-end bg-[var(--brand-light)] text-[var(--brand-dark)] border-r-3 border-r-[var(--brand-accent)] border-l-0 max-w-[85%]';
              }

              return (
                <div
                  key={m.id}
                  className={`p-2 rounded-lg leading-relaxed shadow-2xs ${bubbleCls} animate-fade-in`}
                >
                  <div dangerouslySetInnerHTML={{ __html: m.text }} />
                  <span className="block text-[9px] text-[var(--text-muted)] text-right mt-1 font-mono">
                    {m.timestamp}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Row */}
          <div className="p-2 border-t border-[var(--border-light)] flex gap-1.5 bg-[var(--bg-surface)]">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder="Digite uma dúvida ou comando..."
              className="flex-1 border border-[var(--border-light)] rounded-md px-2.5 py-1.5 text-xs outline-none bg-[var(--bg-base)] text-[var(--text-main)] focus:border-[var(--brand-accent)]"
            />
            <button
              onClick={handleSend}
              className="bg-[var(--brand-primary)] hover:brightness-110 active:scale-95 text-white border-none rounded-md px-3 cursor-pointer text-xs font-bold transition-all shadow-xs"
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] text-white border-2 border-white shadow-[var(--shadow-float)] flex items-center justify-center text-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
        title="Feed e Assistente de Obras"
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-comments'}`}></i>
      </button>
    </div>
  );
};
