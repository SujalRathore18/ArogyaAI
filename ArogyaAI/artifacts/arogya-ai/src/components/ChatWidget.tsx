import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLang } from '../context/LangContext';

type Risk = 'GREEN' | 'YELLOW' | 'RED' | null;
type Source = 'gemini' | 'demo' | null;

interface Message {
  sender: 'bot' | 'user';
  text: string;
  risk?: Risk;
  source?: Source;
}

const RISK_COLORS: Record<NonNullable<Risk>, string> = {
  GREEN:  'bg-[#3B8C5A] text-white',
  YELLOW: 'bg-[#C77B18] text-white',
  RED:    'bg-[#B23A2E] text-white',
};

const RISK_LABELS: Record<NonNullable<Risk>, string> = {
  GREEN:  '✅ GREEN',
  YELLOW: '⚠️ YELLOW',
  RED:    '🚨 RED — Call 108',
};

export const ChatWidget: React.FC<{ isOpen: boolean; onClose: () => void; onToggle: () => void }> = ({
  isOpen, onClose, onToggle,
}) => {
  const { lang } = useLang();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: lang === 'en'
        ? "Namaste! I am Vaani. Describe your symptoms in Hindi or English and I'll assess the risk."
        : "नमस्ते! मैं वाणी हूँ। अपने लक्षण हिंदी या अंग्रेजी में बताएं।",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [micListening, setMicListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build history array for the API (exclude the initial greeting)
  const buildHistory = (msgs: Message[]) =>
    msgs.slice(1).map(m => ({
      role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
      text: m.text,
    }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hi-IN';
    u.rate = 0.93;
    u.pitch = 1.02;
    window.speechSynthesis.speak(u);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { sender: 'user', text };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: buildHistory(messages),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { reply: string; risk: Risk; source: Source };

      const botMsg: Message = { sender: 'bot', text: data.reply, risk: data.risk, source: data.source };
      setMessages(prev => [...prev, botMsg]);
      speak(data.reply);
    } catch {
      const errMsg: Message = {
        sender: 'bot',
        text: lang === 'en'
          ? "Sorry, I couldn't connect to Vaani right now. Please try again."
          : "माफ करें, अभी जुड़ नहीं पाई। कृपया दोबारा कोशिश करें।",
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleMic = () => {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
    }) | undefined;

    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'hi-IN';
    rec.continuous = true;
    rec.interimResults = false;
    setMicListening(true);
    rec.onresult = e => { setInput(e.results[0][0].transcript); setMicListening(false); };
    rec.onerror = () => setMicListening(false);
    rec.onend = () => setMicListening(false);
    rec.start();
  };

  return (
    <>
      {/* Toggle button — bottom-right */}
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#1F3A3D] text-white shadow-lg flex items-center justify-center text-2xl z-50 hover:scale-105 transition-transform"
        data-testid="button-chat-toggle"
        title="Chat with Vaani AI"
      >
        {isOpen ? '✕' : '🙋‍♀️'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.92 }}
            className="fixed bottom-24 right-6 w-[340px] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col"
            style={{ height: 480 }}
          >
            {/* Header */}
            <div className="bg-[#1F3A3D] text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🙋‍♀️</span>
                <div>
                  <div className="font-serif font-bold leading-tight">Vaani (वाणी)</div>
                  <div className="text-[10px] font-mono text-white/50">AI Health Triage · Powered by Gemini</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3B8C5A] animate-pulse"></div>
                <button onClick={onClose} className="text-white/60 hover:text-white text-lg leading-none ml-1">✕</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-background">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#1F3A3D] text-white rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}>
                    {m.text}
                  </div>
                  {m.risk && (
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mt-1 ${RISK_COLORS[m.risk]}`}>
                      {RISK_LABELS[m.risk]}
                    </span>
                  )}
                  {m.source === 'demo' && (
                    <span className="text-[9px] font-mono text-muted-foreground mt-0.5">
                      ⚡ demo mode
                    </span>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start">
                  <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-muted-foreground"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.7, delay }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border bg-card shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleMic}
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    micListening ? 'bg-[#B23A2E] text-white animate-pulse' : 'bg-muted text-foreground hover:bg-muted/70'
                  }`}
                  title="Voice input (Hindi)"
                >
                  {micListening ? '🔴' : '🎤'}
                </button>
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
                  placeholder={lang === 'en' ? 'Describe symptoms…' : 'लक्षण बताएं…'}
                  className="flex-1 text-sm"
                  disabled={loading}
                />
                <Button
                  onClick={() => handleSend(input)}
                  size="icon"
                  disabled={loading || !input.trim()}
                  className="shrink-0 bg-[#3B8C5A] hover:bg-[#2e6e46] text-white"
                  data-testid="button-chat-send"
                >
                  ➤
                </Button>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1.5 text-center">
                Not a doctor · For emergencies call 108
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
