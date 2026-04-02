import React, { useState } from 'react';
import { ShieldCheck, Clock, Sparkles, ArrowRight, Building2, User, HeartPulse, TrendingDown, BookOpen, X, Send } from 'lucide-react';
import { MindHeartLogo } from './MindHeartLogo';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
}

const b2bData = [
  {
    name: 'Absentéisme (jours/an)',
    'Sans accompagnement': 12,
    'Avec Marie': 4,
  },
  {
    name: 'Turnover (%)',
    'Sans accompagnement': 15,
    'Avec Marie': 5,
  },
  {
    name: 'Baisse productivité (%)',
    'Sans accompagnement': 35,
    'Avec Marie': 10,
  },
];

export function LandingPage({ onLogin, authError }: LandingPageProps) {
  const [view, setView] = useState<'b2c' | 'b2b'>('b2c');
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    employees: '',
    email: '',
    description: ''
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Demande B2B Marie AI - ${formData.company}`);
    const body = encodeURIComponent(
      `Entreprise: ${formData.company}\n` +
      `Nombre d'employés: ${formData.employees}\n` +
      `Email de contact: ${formData.email}\n\n` +
      `Descriptif du besoin:\n${formData.description}`
    );
    window.location.href = `mailto:julyand36@gmail.com?subject=${subject}&body=${body}`;
    setShowContactForm(false);
    setFormData({ company: '', employees: '', email: '', description: '' });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#082f49_100%)] text-slate-100 font-sans selection:bg-teal-500/30 relative overflow-hidden">
      {/* Ambient glowing orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: [0, 100, -50, 0], 
            y: [0, -50, 100, 0],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/40 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            x: [0, -100, 50, 0], 
            y: [0, 100, -50, 0],
            scale: [1, 1.2, 0.8, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/40 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            x: [0, 50, -100, 0], 
            y: [0, 50, -100, 0],
            scale: [1, 0.9, 1.1, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[20%] w-[800px] h-[800px] bg-sky-500/30 rounded-full blur-[150px] mix-blend-screen"
        />
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
              <MindHeartLogo className="w-5 h-5 text-teal-500" />
            </div>
            <span className="text-xl font-medium tracking-tight">Marie</span>
          </div>

          {/* View Toggle (Mobile: hidden, Desktop: visible) */}
          <div className="hidden md:flex bg-slate-900 p-1 rounded-full border border-slate-800">
            <button
              onClick={() => setView('b2c')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'b2c' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              Particuliers
            </button>
            <button
              onClick={() => setView('b2b')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'b2b' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Entreprises
            </button>
          </div>

          <button 
            onClick={onLogin}
            className="text-sm font-medium px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-colors"
          >
            Se connecter
          </button>
        </div>
        
        {/* Mobile View Toggle */}
        <div className="md:hidden flex justify-center pb-3 bg-slate-950/50 backdrop-blur-md border-b border-slate-800/50">
          <div className="flex bg-slate-900 p-1 rounded-full border border-slate-800">
            <button
              onClick={() => setView('b2c')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'b2c' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              Particuliers
            </button>
            <button
              onClick={() => setView('b2b')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'b2b' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Entreprises
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 md:pt-32 pb-16 px-6">
        {view === 'b2c' ? (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto mt-8 md:mt-16 mb-24">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Votre Coach Émotionnel Personnel</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 leading-[1.1]">
                La santé mentale, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-500">
                  accessible à tout moment.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 mb-6 leading-relaxed max-w-2xl">
                Créé par un étudiant avec une mission simple : rendre le soutien psychologique disponible 24h/24 et 7j/7 pour tous.
              </p>
              <p className="text-base text-slate-500 mb-10 leading-relaxed max-w-2xl">
                Marie vous écoute, vous aide à traverser vos moments difficiles, et vous oriente vers la thérapie (TCC, EMDR, psychanalyse...) qui correspondra le mieux à vos besoins uniques.
              </p>
              <button 
                onClick={onLogin}
                className="group flex items-center gap-2 text-base font-medium px-8 py-4 rounded-full bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all hover:scale-105 active:scale-95"
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
              <div className="p-8 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 hover:bg-slate-900/60 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">Disponible 24/7</h3>
                <p className="text-slate-400 leading-relaxed">
                  Une angoisse au milieu de la nuit ? Un coup de stress avant un examen ? Marie est là pour vous écouter instantanément.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 hover:bg-slate-900/60 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
                  <MindHeartLogo className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">Orientation Thérapeutique</h3>
                <p className="text-slate-400 leading-relaxed">
                  Au fil de vos échanges, Marie identifie vos schémas et vous suggère le type de thérapie humaine le plus adapté à votre profil.
                </p>
              </div>

              <div className="p-8 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 hover:bg-slate-900/60 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20">
                  <ShieldCheck className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">Espace Sécurisé</h3>
                <p className="text-slate-400 leading-relaxed">
                  Vos échanges sont privés. Vous gardez le contrôle total sur vos données, pour vous confier sans aucun jugement.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto mt-8 md:mt-16 mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
                <Building2 className="w-4 h-4" />
                <span>Solutions pour les Entreprises</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight mb-8 leading-[1.1]">
                Un esprit sain dans un corps sain : <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                  le secret de la prévention.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl">
                L'accompagnement émotionnel proactif permet une baisse drastique des mises en arrêt maladie. L'esprit est intimement lié au corps : soulager la charge mentale, c'est prévenir les maladies physiques.
              </p>
              <button 
                onClick={() => setShowContactForm(true)}
                className="group flex items-center gap-2 text-base font-medium px-8 py-4 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
              >
                Protéger mes équipes
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Data Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center mt-16">
              <div className="space-y-8">
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-8 rounded-3xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                      <TrendingDown className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-2xl font-medium">Baisse de l'absentéisme</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed mb-6">
                    Les études démontrent que les employés bénéficiant d'un soutien psychologique régulier (coach émotionnel) voient leur taux d'arrêt maladie chuter de manière significative. Le stress chronique étant un immunosuppresseur majeur.
                  </p>
                  <a href="https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Rapport de l'OMS sur la santé mentale au travail
                  </a>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 p-8 rounded-3xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                      <HeartPulse className="w-6 h-6 text-teal-400" />
                    </div>
                    <h3 className="text-2xl font-medium">Le lien Corps-Esprit</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed mb-6">
                    L'American Psychological Association (APA) souligne que le stress non géré est lié aux six principales causes de décès. Un esprit sain prévient l'apparition de troubles somatiques (troubles musculo-squelettiques, maladies cardiovasculaires).
                  </p>
                  <a href="https://www.apa.org/topics/stress/health" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Étude de l'APA sur le stress et la santé physique
                  </a>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-slate-900/30 backdrop-blur-md border border-slate-800/50 p-8 rounded-3xl h-[500px] flex flex-col">
                <h3 className="text-xl font-medium mb-2 text-center">Impact de l'accompagnement émotionnel</h3>
                <p className="text-sm text-slate-500 text-center mb-8">Comparaison moyenne annuelle par employé</p>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={b2bData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorSans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="colorAvec" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#f4f4f5' }}
                        itemStyle={{ color: '#f4f4f5' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Sans accompagnement" fill="url(#colorSans)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Avec Marie" fill="url(#colorAvec)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} Marie AI. Tous droits réservés.</p>
        <p className="mt-2">Ceci est un outil d'accompagnement et ne remplace pas un suivi médical ou psychiatrique en cas d'urgence.</p>
      </footer>
      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowContactForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">Demande d'informations</h2>
            </div>
            
            <p className="text-slate-400 text-sm mb-6">
              Laissez-nous vos coordonnées et décrivez-nous vos besoins. Nous vous recontacterons rapidement pour vous proposer une solution adaptée.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nom de l'entreprise</label>
                <input 
                  type="text" 
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="Ex: Acme Corp"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre d'employés</label>
                <select 
                  required
                  value={formData.employees}
                  onChange={(e) => setFormData({...formData, employees: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="" disabled>Sélectionnez une taille</option>
                  <option value="1-10">1 à 10 employés</option>
                  <option value="11-50">11 à 50 employés</option>
                  <option value="51-200">51 à 200 employés</option>
                  <option value="201-500">201 à 500 employés</option>
                  <option value="500+">Plus de 500 employés</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email de contact</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="vous@entreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descriptif du besoin</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                  placeholder="Quels sont les défis actuels de vos équipes ?"
                />
              </div>

              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-colors mt-6"
              >
                <Send className="w-4 h-4" />
                Envoyer ma demande
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
