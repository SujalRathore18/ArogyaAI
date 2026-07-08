import React from 'react';
import { Link } from 'wouter';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

export const Nav: React.FC = () => {
  const { lang, toggleLang, t } = useLang();
  const { user, logout } = useAuth();

  return (
    <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-md">
      {/* Emergency Bar */}
      <div className="bg-secondary text-secondary-foreground text-xs font-mono py-1.5 px-4 flex justify-between items-center">
        <span>🚨 Rural / low-connectivity? Call direct:</span>
        <div className="flex gap-4">
          <a href="tel:108" className="hover:text-primary transition-colors">📞 108 — Ambulance</a>
          <a href="tel:112" className="hover:text-primary transition-colors">📞 112 — Emergency</a>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="hsl(35, 75%, 52%)" strokeWidth="2" className="w-6 h-6">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="font-serif text-2xl font-bold text-foreground">ArogyaAI</div>
            <div className="text-[10px] font-mono text-muted-foreground hidden sm:block">{t('nav.tagline')}</div>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-8 text-sm font-semibold">ArogyaAI</div>
            <Link href="/blog" className="text-foreground hover:text-primary transition-colors">{t('nav.blog')}</Link>
            <Link href="/hospitals" className="text-foreground hover:text-primary transition-colors">{t('nav.hospitals')}</Link>
          </div>
          
          <div className="flex items-center gap-3 border-l border-border pl-6">
            <Button variant="outline" size="sm" onClick={toggleLang} className="font-mono text-xs w-14" data-testid="button-lang-toggle">
              {lang === 'en' ? 'हिंदी' : 'EN'}
            </Button>
            
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground hidden sm:inline-block">{user.name}</span>
                <Button variant="ghost" size="sm" onClick={logout}>{t('nav.logout')}</Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => window.location.reload()}>{t('nav.login')}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
