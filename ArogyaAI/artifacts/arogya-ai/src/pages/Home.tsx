import React from 'react';
import { Link } from 'wouter';
import { useLang } from '../context/LangContext';
import { motion } from 'framer-motion';

export default function Home() {
  const { t, lang } = useLang();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            {/* Simulated ECG animation line */}
            <svg width="200" height="40" viewBox="0 0 200 40" className="stroke-primary fill-none stroke-[3]">
              <path d="M0,20 L50,20 L60,5 L75,35 L85,20 L200,20" strokeLinecap="round" strokeLinejoin="round">
                <animate attributeName="stroke-dasharray" values="0,400;400,0" dur="2s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
          
          <div className="text-primary font-mono text-sm tracking-wide mb-4 uppercase">{t('home.eyebrow')}</div>
          <h1 className="font-serif text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t('home.h1')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
            {t('home.sub')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          <Link href="/patient">
            <motion.div 
              className="group cursor-pointer bg-card border-2 border-transparent hover:border-[#3B8C5A] rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all h-full"
              whileHover={{ y: -4 }}
              data-testid="card-patient-portal"
            >
              <div className="w-16 h-16 bg-[#E4F1E7] rounded-full flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                📞
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">{t('home.card.patient')}</h2>
              <p className="text-muted-foreground">Report symptoms, log medicine stock, or call for emergency assistance with Vaani.</p>
              <div className="mt-6 text-[#3B8C5A] font-medium flex items-center gap-2">
                Enter Portal <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </motion.div>
          </Link>

          <Link href="/mgmt">
            <motion.div 
              className="group cursor-pointer bg-card border-2 border-transparent hover:border-secondary rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all h-full"
              whileHover={{ y: -4 }}
              data-testid="card-mgmt-portal"
            >
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🏥
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">{t('home.card.mgmt')}</h2>
              <p className="text-muted-foreground">View real-time district map, hospital capacity, alerts, and auto-generated briefs.</p>
              <div className="mt-6 text-secondary font-medium flex items-center gap-2">
                Open Console <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </motion.div>
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-4xl mx-auto">
          {['Hindi Voice AI Agent', 'Stockout Forecasting', 'Emergency Hospital Matching', 'Explainability Trail', 'Real Indore Map'].map((chip, i) => (
            <div key={i} className="px-4 py-2 bg-muted text-muted-foreground text-sm font-medium rounded-full">
              {chip}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center border-t border-border pt-12 mb-16">
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">50+</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Govt Hospitals</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">100+</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Private Hospitals</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">108/112</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Direct Lines</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">4</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Medical Colleges</div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 text-center">
          <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
            {t('home.trust')}
          </p>
        </div>
      </main>
    </div>
  );
}
