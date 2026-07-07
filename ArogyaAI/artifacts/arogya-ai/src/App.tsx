import React, { useState } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LangProvider } from './context/LangContext';
import { AuthProvider } from './context/AuthContext';
import { AlertLogProvider } from './context/AlertLogContext';

import { Nav } from './components/Nav';
import { AuthGate } from './components/AuthGate';
import { ChatWidget } from './components/ChatWidget';
import { VoiceAgent } from './components/VoiceAgent';

import Home from './pages/Home';
import Patient from './pages/Patient';
import Management from './pages/Management';
import Blog from './pages/Blog';
import Hospitals from './pages/Hospitals';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function AppShell() {
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col relative">
      <AuthGate />
      <Nav />
      <div className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/patient" component={Patient} />
          <Route path="/mgmt" component={Management} />
          <Route path="/blog" component={Blog} />
          <Route path="/hospitals" component={Hospitals} />
          <Route component={NotFound} />
        </Switch>
      </div>

      {/* Voice Agent trigger — bottom-left */}
      <button
        onClick={() => setVoiceOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl z-50 hover:scale-105 transition-transform"
        style={{ background: '#1F3A3D', border: '2px solid #3B8C5A44' }}
        title="Talk to Vaani voice agent"
        aria-label="Open voice agent"
      >
        🎙️
      </button>

      <VoiceAgent isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />

      <ChatWidget
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onToggle={() => setChatOpen(!chatOpen)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <AlertLogProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <AppShell />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </AlertLogProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}

export default App;
