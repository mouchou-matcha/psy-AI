import React from 'react';
import { Brain, ShieldCheck, Clock, Sparkles, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
}

export function LandingPage({ onLogin, authError }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Brain className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-xl font-medium tracking-tight">Marie</span>
          </div>
          <button 
            onClick={onLogin}
            className="text-sm font-medium px-5 py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-colors"
          >
            Se connecter
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mt-16 mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Intelligence Artificielle Thérapeutique</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 leading-[1.1]">
              Votre espace d'écoute, <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                toujours disponible.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed max-w-2xl">
              Marie est une IA conçue pour vous offrir un soutien psychologique par la voix. 
              Confiez-vous en toute sécurité, explorez vos émotions et avancez à votre rythme.
            </p>
            <button 
              onClick={onLogin}
              className="group flex items-center gap-2 text-base font-medium px-8 py-4 rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95"
            >
              Commencer ma première séance
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {authError && (
              <p className="mt-4 text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
                {authError}
              </p>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mt-24">
            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-medium mb-3">Disponible 24/7</h3>
              <p className="text-zinc-400 leading-relaxed">
                Une angoisse au milieu de la nuit ? Marie est là pour vous écouter instantanément, sans rendez-vous.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-medium mb-3">Confidentialité absolue</h3>
              <p className="text-zinc-400 leading-relaxed">
                Vos échanges sont privés et sécurisés. Vous gardez le contrôle total sur vos données et votre historique.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-900 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-medium mb-3">Analyse clinique</h3>
              <p className="text-zinc-400 leading-relaxed">
                Bénéficiez de résumés structurés, d'arbres thérapeutiques et de plans d'action après chaque séance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-12 text-center text-zinc-500 text-sm">
        <p>© {new Date().getFullYear()} Marie AI. Tous droits réservés.</p>
        <p className="mt-2">Ceci est un outil d'accompagnement et ne remplace pas un suivi psychiatrique en cas d'urgence.</p>
      </footer>
    </div>
  );
}
