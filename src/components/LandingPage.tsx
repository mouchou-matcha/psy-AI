import React, { useState } from 'react';
import { ShieldCheck, Clock, ArrowRight, Building2, User, HeartPulse, TrendingDown, BookOpen, Send, Compass, Phone } from 'lucide-react';
import { Wordmark } from './MindHeartLogo';
import { BreathOrb } from './BreathOrb';
import { Modal } from './Modal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LandingPageProps {
  onLogin: () => void;
  authError?: string;
}

const b2bData = [
  { name: 'Absentéisme (jours/an)', 'Sans accompagnement': 12, 'Avec Marie': 4 },
  { name: 'Turnover (%)', 'Sans accompagnement': 15, 'Avec Marie': 5 },
  { name: 'Baisse productivité (%)', 'Sans accompagnement': 35, 'Avec Marie': 10 },
];

function AudienceToggle({ view, setView, className = '' }: { view: 'b2c' | 'b2b'; setView: (v: 'b2c' | 'b2b') => void; className?: string }) {
  const item = (key: 'b2c' | 'b2b', label: string, Icon: typeof User) => (
    <button
      onClick={() => setView(key)}
      aria-pressed={view === key}
      className={`relative px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${
        view === key ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
      }`}
    >
      <Icon className="relative w-4 h-4" />
      <span className="relative">{label}</span>
    </button>
  );
  return (
    <div className={`inline-flex p-1 rounded-full bg-paper border border-line ${className}`} role="group" aria-label="Public">
      {item('b2c', 'Particuliers', User)}
      {item('b2b', 'Entreprises', Building2)}
    </div>
  );
}

export function LandingPage({ onLogin, authError }: LandingPageProps) {
  const [view, setView] = useState<'b2c' | 'b2b'>('b2c');
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    employees: '',
    email: '',
    description: '',
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Demande B2B Marie AI - ${formData.company}`);
    const body = encodeURIComponent(
      `Entreprise: ${formData.company}\n` +
        `Nombre d'employés: ${formData.employees}\n` +
        `Email de contact: ${formData.email}\n\n` +
        `Descriptif du besoin:\n${formData.description}`,
    );
    window.location.href = `mailto:julyand36@gmail.com?subject=${subject}&body=${body}`;
    setShowContactForm(false);
    setFormData({ company: '', employees: '', email: '', description: '' });
  };

  return (
    <div className="min-h-screen bg-mist text-ink overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-mist/85 backdrop-blur-md border-b border-line/70">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-18 py-3 flex items-center justify-between gap-4">
          <Wordmark />
          <AudienceToggle view={view} setView={setView} className="hidden md:inline-flex" />
          <button onClick={onLogin} className="btn btn-outline px-5 py-2.5 text-sm">
            Se connecter
          </button>
        </div>
        <div className="md:hidden flex justify-center pb-3">
          <AudienceToggle view={view} setView={setView} />
        </div>
      </nav>

      <main>
        {view === 'b2c' ? (
          <>
            {/* Hero */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
              <div className="max-w-xl">
                <h1 className="text-[2.6rem] leading-[1.08] sm:text-6xl sm:leading-[1.04] text-ink">
                  Quelqu'un pour vous écouter, même à trois heures du matin.
                </h1>
                <p className="mt-7 text-lg text-ink-soft leading-relaxed">
                  Marie est une assistante psychologique vocale. Vous parlez, elle écoute, vous aide à mettre des mots sur ce que vous
                  vivez et à repérer les schémas qui se répètent.
                </p>
                <p className="mt-4 text-ink-soft leading-relaxed">
                  Au fil des séances, elle vous oriente vers la thérapie qui vous correspond le mieux : TCC, EMDR, psychanalyse,
                  thérapie systémique…
                </p>
                <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
                  <button onClick={onLogin} className="btn btn-primary px-7 py-4 text-base group whitespace-nowrap">
                    Commencer ma première séance
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                  <p className="text-sm text-ink-faint">5 minutes offertes, connexion avec Google</p>
                </div>
                {authError && (
                  <p role="alert" className="mt-5 text-sm text-alert bg-alert-pale px-4 py-3 rounded-xl">
                    {authError}
                  </p>
                )}
                <p className="mt-10 text-sm text-ink-faint max-w-md">
                  Créé par un étudiant avec une mission simple : rendre le soutien psychologique disponible 24 h/24 et 7 j/7, pour tous.
                </p>
              </div>

              <figure className="relative flex flex-col items-center">
                <div className="relative w-full max-w-[300px] sm:max-w-[420px] aspect-square flex items-center justify-center">
                  <div className="absolute inset-[12%] rounded-full bg-lagoon-pale/70 blur-2xl" aria-hidden="true" />
                  <BreathOrb mode="idle" size={420} className="relative" />
                </div>
                <figcaption className="mt-2 max-w-sm rounded-2xl bg-paper border border-line px-5 py-4 shadow-[0_10px_30px_-18px_rgba(30,33,64,0.35)]">
                  <p className="font-serif text-[1.05rem] leading-snug text-ink">
                    « Je remarque qu'on revient souvent sur cette peur de l'échec. Et si on la regardait sous un autre angle ? »
                  </p>
                  <p className="mt-2 text-xs text-ink-faint">Exemple de relance de Marie pendant une séance</p>
                </figcaption>
              </figure>
            </section>

            {/* Déroulé d'une séance */}
            <section className="bg-paper border-y border-line">
              <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
                <h2 className="text-3xl sm:text-4xl max-w-xl">Comment se passe une séance</h2>
                <ol className="mt-12 grid md:grid-cols-3 gap-10 md:gap-8">
                  {[
                    {
                      title: 'Vous parlez, à votre rythme',
                      text: "Installez-vous dans un endroit calme et lancez la séance. Marie vous pose des questions qui partent de la situation concrète pour remonter vers les émotions et les besoins.",
                    },
                    {
                      title: 'Marie fait le point avec vous',
                      text: 'Elle reformule, repère les boucles et vous propose des hypothèses sur les schémas qui se répètent, sans jamais poser de diagnostic médical.',
                    },
                    {
                      title: 'Vous repartez avec un plan',
                      text: "À la fin, vous retrouvez un résumé, une carte de vos émotions et de leurs causes, des exercices à essayer et le type de professionnel à consulter.",
                    },
                  ].map((step, i) => (
                    <li key={step.title} className="relative pl-14">
                      <span className="absolute left-0 top-0 w-10 h-10 rounded-full border border-ink/20 flex items-center justify-center font-serif text-lg text-ink">
                        {i + 1}
                      </span>
                      <h3 className="text-xl">{step.title}</h3>
                      <p className="mt-3 text-ink-soft leading-relaxed">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Engagements */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid md:grid-cols-3 gap-x-10 gap-y-12">
              {[
                {
                  icon: Clock,
                  title: 'Disponible 24/7',
                  text: "Une angoisse au milieu de la nuit, un coup de stress avant un examen : Marie est là pour vous écouter, tout de suite.",
                },
                {
                  icon: Compass,
                  title: 'Orientation thérapeutique',
                  text: 'Au fil de vos échanges, Marie identifie vos schémas et vous suggère le type de thérapie humaine le plus adapté à votre profil.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Un espace confidentiel',
                  text: 'Vos échanges sont privés. Vous pouvez exporter ou supprimer toutes vos données à tout moment depuis les paramètres.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="border-t-2 border-ink pt-6">
                  <Icon className="w-6 h-6 text-lagoon" strokeWidth={1.75} />
                  <h3 className="mt-4 text-xl">{title}</h3>
                  <p className="mt-3 text-ink-soft leading-relaxed">{text}</p>
                </div>
              ))}
            </section>

            {/* Sécurité */}
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24">
              <div className="rounded-3xl bg-ink text-paper px-7 py-9 sm:px-12 sm:py-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
                <div className="max-w-xl">
                  <h2 className="text-2xl sm:text-3xl text-paper">Marie accompagne, elle ne remplace pas un soignant.</h2>
                  <p className="mt-4 text-paper/75 leading-relaxed">
                    Si vous traversez une crise ou avez des pensées suicidaires, appelez immédiatement un professionnel. Ces numéros sont
                    gratuits et joignables 24 h/24.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[
                    { n: '3114', l: 'Prévention suicide' },
                    { n: '15', l: 'SAMU' },
                    { n: '112', l: 'Urgences' },
                  ].map((c) => (
                    <a
                      key={c.n}
                      href={`tel:${c.n}`}
                      className="flex items-center gap-3 rounded-2xl bg-paper/10 hover:bg-paper/15 px-4 py-3 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-apricot" />
                      <span>
                        <span className="block font-serif text-xl leading-none">{c.n}</span>
                        <span className="block text-xs text-paper/65 mt-1">{c.l}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16">
              <div className="max-w-3xl">
                <h1 className="text-[2.4rem] leading-[1.08] sm:text-6xl sm:leading-[1.04]">
                  Un esprit sain dans un corps sain : le secret de la prévention.
                </h1>
                <p className="mt-7 text-lg text-ink-soft leading-relaxed max-w-2xl">
                  L'accompagnement émotionnel proactif permet une baisse importante des arrêts maladie. L'esprit est intimement lié au
                  corps : soulager la charge mentale, c'est prévenir les maladies physiques.
                </p>
                <button onClick={() => setShowContactForm(true)} className="btn btn-primary mt-9 px-7 py-4 text-base group">
                  Protéger mes équipes
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </section>

            <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-start">
              <div className="space-y-10">
                <article className="border-t-2 border-ink pt-6">
                  <TrendingDown className="w-6 h-6 text-lagoon" strokeWidth={1.75} />
                  <h2 className="mt-4 text-2xl">Moins d'absentéisme</h2>
                  <p className="mt-3 text-ink-soft leading-relaxed">
                    Les employés bénéficiant d'un soutien psychologique régulier voient leur taux d'arrêt maladie baisser nettement. Le
                    stress chronique affaiblit le système immunitaire.
                  </p>
                  <a
                    href="https://www.who.int/news-room/fact-sheets/detail/mental-health-at-work"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lagoon hover:text-lagoon-deep underline underline-offset-4 decoration-lagoon/30"
                  >
                    <BookOpen className="w-4 h-4" />
                    Rapport de l'OMS sur la santé mentale au travail
                  </a>
                </article>
                <article className="border-t-2 border-ink pt-6">
                  <HeartPulse className="w-6 h-6 text-lagoon" strokeWidth={1.75} />
                  <h2 className="mt-4 text-2xl">Le lien corps-esprit</h2>
                  <p className="mt-3 text-ink-soft leading-relaxed">
                    L'American Psychological Association souligne que le stress non géré est lié aux six principales causes de décès. Un
                    esprit apaisé prévient l'apparition de troubles somatiques (musculo-squelettiques, cardiovasculaires).
                  </p>
                  <a
                    href="https://www.apa.org/topics/stress/health"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lagoon hover:text-lagoon-deep underline underline-offset-4 decoration-lagoon/30"
                  >
                    <BookOpen className="w-4 h-4" />
                    Étude de l'APA sur le stress et la santé physique
                  </a>
                </article>
              </div>

              <figure className="rounded-3xl bg-paper border border-line p-6 sm:p-8">
                <h3 className="text-xl">Impact de l'accompagnement émotionnel</h3>
                <p className="text-sm text-ink-faint mt-1">Comparaison moyenne annuelle par employé</p>
                <div className="h-[360px] mt-6 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={b2bData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barGap={6}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#d9dbe6" vertical={false} />
                      <XAxis dataKey="name" stroke="#545a7a" fontSize={12} tickLine={false} axisLine={false} interval={0} />
                      <YAxis stroke="#8a8fa8" fontSize={12} tickLine={false} axisLine={false} width={36} />
                      <Tooltip
                        cursor={{ fill: '#edeef4' }}
                        contentStyle={{ backgroundColor: '#f9f9fc', border: '1px solid #d9dbe6', borderRadius: 12, color: '#1e2140' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} iconType="circle" />
                      <Bar dataKey="Sans accompagnement" fill="#c9ccdb" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Avec Marie" fill="#1f6b72" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </figure>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between text-sm text-ink-faint">
          <Wordmark className="opacity-80" />
          <div className="sm:text-right">
            <p>© {new Date().getFullYear()} Marie AI. Tous droits réservés.</p>
            <p className="mt-1">Outil d'accompagnement : il ne remplace pas un suivi médical ou psychiatrique en cas d'urgence.</p>
          </div>
        </div>
      </footer>

      <Modal
        open={showContactForm}
        onClose={() => setShowContactForm(false)}
        title="Demande d'informations"
        description="Décrivez-nous vos besoins : nous vous recontactons rapidement avec une proposition adaptée."
        icon={<Building2 className="w-6 h-6 text-lagoon" />}
        size="sm"
      >
        <form onSubmit={handleContactSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">Nom de l'entreprise</span>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="field"
              placeholder="Ex. Acme Corp"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">Nombre d'employés</span>
            <select
              required
              value={formData.employees}
              onChange={(e) => setFormData({ ...formData, employees: e.target.value })}
              className="field"
            >
              <option value="" disabled>
                Sélectionnez une taille
              </option>
              <option value="1-10">1 à 10 employés</option>
              <option value="11-50">11 à 50 employés</option>
              <option value="51-200">51 à 200 employés</option>
              <option value="201-500">201 à 500 employés</option>
              <option value="500+">Plus de 500 employés</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">E-mail de contact</span>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="field"
              placeholder="vous@entreprise.com"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1.5">Votre besoin</span>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="field resize-none"
              placeholder="Quels sont les défis actuels de vos équipes ?"
            />
          </label>
          <button type="submit" className="btn btn-primary w-full py-3.5 mt-2">
            <Send className="w-4 h-4" />
            Envoyer ma demande
          </button>
        </form>
      </Modal>
    </div>
  );
}

