import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, User, Loader2, Sparkles, Calendar, Network, Stethoscope, AlertTriangle, ShieldCheck, Compass, FileText, LogOut, ClipboardList, Target, CheckCircle2, HeartPulse, Zap, Heart, Trash2, Check, Download, Settings, ChevronDown, Volume2, Play, Info, Globe, Phone, Clock, ChevronRight, Hand } from 'lucide-react';
import { useLiveAPI, previewVoice } from './hooks/useLiveAPI';
import { TherapyTree } from './components/TherapyTree';
import { MindHeartLogo, Wordmark } from './components/MindHeartLogo';
import { LandingPage } from './components/LandingPage';
import { BreathOrb, type OrbMode } from './components/BreathOrb';
import { Modal } from './components/Modal';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'framer-motion';

interface SessionHistory {
  id: string;
  date: string;
  summary: string;
  insights: string;
  tree_data: string;
  clinical_data: string;
  therapeutic_plan: string;
}

/**
 * Main Application Component
 * Manages the core UI layout, authentication state, Firebase data synchronization,
 * and interactions with the Gemini Live API session.
 */
export default function App() {
  // ==========================================
  // 1. AUTHENTICATION & USER STATE
  // ==========================================
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userData, setUserData] = useState<any>(null);

  // ==========================================
  // 2. SESSION & API STATE
  // ==========================================
  const [isIncisiveMode, setIsIncisiveMode] = useState(false);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [voiceName, setVoiceName] = useState<string>(() => localStorage.getItem('marie_voice') || 'Zephyr');
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('marie_language') || 'fr');
  
  // Custom hook wrapping the WebSocket/WebRTC connection to Gemini API
  const { isConnected, isSpeaking, isSaving, error, analyserNode, connect, disconnect, interrupt } = useLiveAPI(user, history, isIncisiveMode, voiceName, language, () => setShowEmergencyModal(true));
  
  const [hasStarted, setHasStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // ==========================================
  // 3. UI VISIBILITY & MODALS STATE
  // ==========================================
  const [showHistory, setShowHistory] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isCreditsPanelOpen, setIsCreditsPanelOpen] = useState(false);

  // ==========================================
  // 4. MISC. INTERACTIONS STATE
  // ==========================================
  const [consentTOS, setConsentTOS] = useState(false);
  const [consentHealthData, setConsentHealthData] = useState(false);
  const [expandedTOS, setExpandedTOS] = useState(false);
  const [expandedHealth, setExpandedHealth] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // ==========================================
  // EFFECTS: AUTH & FIREBASE LISTENERS
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeUser: () => void;
    
    const checkConsentAndData = async () => {
      if (user) {
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (!data.hasConsented) {
              setShowConsentModal(true);
            }
            // Initialize availableTime if it doesn't exist (5 minutes = 300 seconds)
            if (data.availableTime === undefined) {
              setDoc(doc(db, 'users', user.uid), { availableTime: 300 }, { merge: true });
            }
          } else {
            setShowConsentModal(true);
          }
        }, (err) => {
          console.error("Error fetching user data:", err);
        });
      }
    };
    
    if (isAuthReady) {
      checkConsentAndData();
    }
    
    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [user, isAuthReady]);

  useEffect(() => {
    if (isAuthReady && user) {
      const q = query(
        collection(db, 'patient_history'),
        where('userId', '==', user.uid),
        orderBy('date', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const historyData: SessionHistory[] = [];
        snapshot.forEach((doc) => {
          historyData.push({ id: doc.id, ...doc.data() } as SessionHistory);
        });
        setHistory(historyData);
      }, (err) => {
        console.error("Firestore Error: ", err);
      });
      return () => unsubscribe();
    } else {
      setHistory([]);
    }
  }, [isAuthReady, user, isSaving]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  /**
   * Initiates Google OAuth login via Firebase.
   */
  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  /**
   * Logs out the user and clears local session history.
   */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Saves the user's consent to the TOS and Health Data policies to Firestore,
   * initializing their available time if they are a new user.
   */
  const handleConsentSubmit = async () => {
    if (user && consentTOS && consentHealthData) {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};
        
        await setDoc(docRef, {
          hasConsented: true,
          consentedAt: new Date().toISOString(),
          availableTime: existingData.availableTime !== undefined ? existingData.availableTime : 300
        }, { merge: true });
        setShowConsentModal(false);
      } catch (err) {
        console.error("Error saving consent:", err);
      }
    }
  };

  /**
   * Progressively deletes all patient history data, user data document, and the Firebase Auth user entirely.
   */
  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      // Delete all patient history
      const q = query(collection(db, 'patient_history'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete user doc
      await deleteDoc(doc(db, 'users', user.uid));

      // Delete auth user
      await deleteUser(user);
      
      setHistory([]);
      setShowSettings(false);
    } catch (err) {
      console.error("Error deleting account:", err);
      alert("Une erreur est survenue lors de la suppression de votre compte. Veuillez vous reconnecter et réessayer.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  /**
   * Generates and downloads a JSON file containing the user's patient history.
   */
  const handleDownloadData = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `marie_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Triggers a preview of the selected voice using the Gemini TTS API.
   */
  const handlePreviewVoice = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
      await previewVoice(voiceName);
    } catch (err) {
      console.error("Error previewing voice:", err);
      alert("Impossible de lire l'aperçu vocal pour le moment.");
    } finally {
      setIsPreviewing(false);
    }
  };

  /**
   * Stages a specific session ID to be deleted, prompting a confirmation modal.
   * @param sessionId The ID of the session to delete
   */
  const handleDeleteSession = async (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

  /**
   * Confirms and executes the deletion of the staged session document from Firestore.
   */
  const confirmDeleteSession = async () => {
    if (sessionToDelete) {
      try {
        await deleteDoc(doc(db, 'patient_history', sessionToDelete));
      } catch (err) {
        console.error("Erreur lors de la suppression de la séance:", err);
      } finally {
        setSessionToDelete(null);
      }
    }
  };

  const handleDownloadPDF = (clinicalData: any, sessionDate: string, sessionId: string, summary: string, insights: string[]) => {
    const doc = new jsPDF();
    
    const formattedDate = new Date(sessionDate).toLocaleDateString('fr-FR', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let cursorY = margin;

    // --- Header Design ---
    // Top colored bar
    doc.setFillColor(16, 185, 129); // teal-500
    doc.rect(0, 0, pageWidth, 6, 'F');
    
    // Light background for header area
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 6, pageWidth, 34, 'F');

    cursorY = 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Dossier Clinique", margin, cursorY);
    
    cursorY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Séance du ${formattedDate}`, margin, cursorY);

    // Separator line
    cursorY += 10;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    
    cursorY += 12;

    const addSection = (title: string, content: string | string[]) => {
      if (!content || (Array.isArray(content) && content.length === 0)) return;

      // Check if we need a new page for the title
      if (cursorY > pageHeight - 30) {
        doc.addPage();
        cursorY = margin + 10;
      }
      
      // Section Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title.toUpperCase(), margin, cursorY);
      
      // Small accent line under title
      doc.setDrawColor(16, 185, 129); // teal-500
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY + 2, margin + 15, cursorY + 2);
      
      cursorY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700
      const lineHeight = 5;

      if (Array.isArray(content)) {
        content.forEach(item => {
          const splitLine = doc.splitTextToSize(`•  ${item}`, pageWidth - 2 * margin - 4);
          if (cursorY + (splitLine.length * lineHeight) > pageHeight - margin) {
            doc.addPage();
            cursorY = margin + 10;
          }
          doc.text(splitLine, margin + 4, cursorY);
          cursorY += splitLine.length * lineHeight + 2;
        });
      } else {
        const textLines = doc.splitTextToSize(content, pageWidth - 2 * margin);
        if (cursorY + (textLines.length * lineHeight) > pageHeight - margin) {
          doc.addPage();
          cursorY = margin + 10;
        }
        doc.text(textLines, margin, cursorY);
        cursorY += textLines.length * lineHeight + 2;
      }
      cursorY += 8;
    };

    if (summary) addSection("Résumé de la séance", summary);
    if (insights && insights.length > 0) addSection("Prises de conscience (Insights)", insights);
    if (clinicalData.emotional_state) addSection("État émotionnel", clinicalData.emotional_state);
    if (clinicalData.symptoms && clinicalData.symptoms.length > 0) addSection("Symptômes", clinicalData.symptoms);
    if (clinicalData.triggers && clinicalData.triggers.length > 0) addSection("Déclencheurs", clinicalData.triggers);
    if (clinicalData.defense_mechanisms && clinicalData.defense_mechanisms.length > 0) addSection("Mécanismes de défense", clinicalData.defense_mechanisms);
    if (clinicalData.risk_assessment) addSection("Évaluation des risques", clinicalData.risk_assessment);
    
    if (clinicalData.recommended_therapy?.type) {
      addSection("Recommandation thérapeutique", [
        `Type : ${clinicalData.recommended_therapy.type}`,
        `Raison : ${clinicalData.recommended_therapy.reason}`
      ]);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} sur ${pageCount} - Généré de manière sécurisée par Marie`, pageWidth / 2, pageHeight - 10, { align: "center" });
    }

    doc.save(`Dossier_Clinique_${sessionDate.split('T')[0]}.pdf`);
    
    setCopiedSessionId(sessionId);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  useEffect(() => {
    if (!isConnected && !isSaving) {
      setHasStarted(false);
    }
  }, [isConnected, isSaving]);

  // Timer based on available time
  const availableTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (userData?.availableTime !== undefined) {
      availableTimeRef.current = userData.availableTime;
      if (!isConnected) {
        setTimeLeft(userData.availableTime);
      }
    }
  }, [userData?.availableTime, isConnected]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        if (availableTimeRef.current !== null) {
          availableTimeRef.current -= 1;
          const current = availableTimeRef.current;
          
          setTimeLeft(current);

          if (current <= 0) {
            disconnect(true);
            setIsPaused(true);
            setShowPaywall(true);
          }

          // Sync to DB every 5 seconds
          if (current > 0 && current % 5 === 0 && user) {
            setDoc(doc(db, 'users', user.uid), { availableTime: current }, { merge: true });
          }
        }
      }, 1000);
    } else {
      // Final sync on disconnect
      if (user && availableTimeRef.current !== null) {
        setDoc(doc(db, 'users', user.uid), { availableTime: availableTimeRef.current }, { merge: true });
      }
    }
    return () => clearInterval(interval);
  }, [isConnected, disconnect, user]);

  useEffect(() => {
    // Resume session automatically if paused and user bought credits
    if (isPaused && hasStarted && !isConnected && userData?.availableTime && userData.availableTime > 0) {
      setIsPaused(false);
      setShowPaywall(false);
      connect(true);
    }
  }, [userData?.availableTime, isPaused, hasStarted, isConnected, connect]);

  /**
   * Formats a given number of seconds into an "MM:SS min" string.
   */
  const formatTime = (seconds: number) => {
    const validSeconds = Math.max(0, seconds);
    const m = Math.floor(validSeconds / 60).toString().padStart(2, '0');
    const s = (validSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s} min`;
  };

  /**
   * Toggles the active status of the API session.
   * If connected or paused, it disconnects. Otherwise, it checks for available credits and starts.
   */
  const toggleSession = async () => {
    if (isConnected || isPaused) {
      await disconnect(false);
      setIsPaused(false);
      setHasStarted(false);
    } else {
      if (userData?.availableTime !== undefined && userData.availableTime <= 0) {
        setShowPaywall(true);
        return;
      }
      setHasStarted(true);
      await connect();
    }
  };

  /**
   * Parses JSON string for psychological insights.
   * @param insightsStr JSON representation of insights
   * @returns Array of insights, or an empty array on failure
   */
  const parseInsights = (insightsStr: string) => {
    try {
      const parsed = JSON.parse(insightsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  /**
   * Parses JSON string for the Therapy Tree nodes and links.
   * @param treeDataStr JSON representation of therapy tree data
   * @returns Structured object containing `nodes` and `links` arrays
   */
  const parseTreeData = (treeDataStr: string) => {
    try {
      const parsed = JSON.parse(treeDataStr);
      return parsed && parsed.nodes ? parsed : { nodes: [], links: [] };
    } catch {
      return { nodes: [], links: [] };
    }
  };

  /**
   * Parses JSON string for structured clinical diagnostic data.
   * @param dataStr JSON representation of clinical data
   * @returns Structured clinical data object, or empty object on failure
   */
  const parseClinicalData = (dataStr: string) => {
    try {
      return JSON.parse(dataStr) || {};
    } catch {
      return {};
    }
  };

  /**
   * Parses JSON string for the suggested therapeutic plan.
   * @param planStr JSON representation of the therapeutic plan
   * @returns Structured plan definition, or null on failure
   */
  const parsePlanData = (planStr: string) => {
    try {
      return JSON.parse(planStr) || null;
    } catch {
      return null;
    }
  };

  // Get the latest tree data to show at the top of the history
  const latestTreeData = history.length > 0 ? parseTreeData(history[history.length - 1].tree_data) : { nodes: [], links: [] };
  const latestClinicalData = history.length > 0 ? parseClinicalData(history[history.length - 1].clinical_data) : {};
  const latestPlanData = history.length > 0 ? parsePlanData(history[history.length - 1].therapeutic_plan) : null;

  // ==========================================
  // AFFICHAGE
  // ==========================================
  const credits = timeLeft !== null ? timeLeft : (userData?.availableTime || 0);
  const outOfCredits = userData?.availableTime !== undefined && userData.availableTime <= 0;
  const isLive = isConnected || isPaused;
  const firstName = (user?.displayName || '').split(' ')[0];
  const orbMode: OrbMode = isConnected ? (isSpeaking ? 'speaking' : 'listening') : isSaving ? 'saving' : 'idle';
  const statusText = isConnected
    ? isSpeaking
      ? 'Marie parle…'
      : 'Marie vous écoute'
    : isSaving
      ? 'Sauvegarde de votre dossier…'
      : hasStarted
        ? 'Connexion…'
        : 'Prête quand vous l’êtes';
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const STRIPE_30 = `https://buy.stripe.com/cNi9AL8a8bt9cjM1U39IQ03${user ? `?client_reference_id=${user.uid}` : ''}`;
  const STRIPE_60 = `https://buy.stripe.com/00w14f6208gXdnQ56f9IQ04${user ? `?client_reference_id=${user.uid}` : ''}`;

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-mist flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
        <BreathOrb mode="saving" size={120} />
        <span className="text-sm text-ink-soft">Chargement…</span>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleGoogleLogin} authError={authError} />;
  }

  const navItem = (onClick: () => void, Icon: typeof Calendar, label: string, color: string, badge?: React.ReactNode) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-mist transition-colors group"
    >
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1a`, color }}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 font-semibold text-ink">{label}</span>
      {badge}
      <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors" />
    </button>
  );

  const ListBlock = ({ icon: Icon, title, items, color }: { icon: typeof Calendar; title: string; items?: string[]; color: string }) =>
    items && items.length > 0 ? (
      <div className="rounded-2xl bg-mist/70 p-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon className="w-4 h-4" style={{ color }} /> {title}
        </h4>
        <ul className="mt-2.5 space-y-1.5 text-[0.95rem] text-ink-soft">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 w-1 h-1 rounded-full bg-ink-faint shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-mist text-ink grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[320px_1fr]">
      {/* ================= Panneau latéral ================= */}
      <aside className="order-2 md:order-1 bg-paper border-t md:border-t-0 md:border-r border-line flex flex-col md:h-screen md:sticky md:top-0 md:overflow-y-auto">
        <div className="hidden md:flex items-center px-6 pt-7 pb-6">
          <Wordmark />
        </div>

        {/* Compte et crédits */}
        <div className="hidden md:block px-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-mist flex items-center justify-center overflow-hidden shrink-0">
              {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-ink-faint" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate">{user.displayName || user.email}</p>
              <p className="text-sm text-ink-faint truncate">{user.email}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-apricot-pale/70 border border-apricot/25 p-4">
            <p className="text-sm text-ink-soft">Temps de séance disponible</p>
            <p className="mt-1 font-serif text-3xl text-ink tabular-nums">{formatTime(credits).replace(' min', '')}</p>
            <button onClick={() => setIsCreditsPanelOpen(true)} className="btn mt-3 w-full py-2.5 text-sm bg-ink text-paper hover:bg-ink/90">
              <Zap className="w-4 h-4" /> Recharger
            </button>
          </div>
        </div>

        <div className="px-4 pt-6 md:pt-7 pb-6 flex-1 space-y-7">
          {/* Personnalité */}
          <section>
            <h3 className="px-2 font-sans text-sm font-semibold text-ink-faint">Personnalité de Marie</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-1 p-1 rounded-2xl bg-mist" role="radiogroup" aria-label="Personnalité de Marie">
              {[
                { value: false, label: 'Empathique', Icon: Heart },
                { value: true, label: 'Électrochoc', Icon: Zap },
              ].map(({ value, label, Icon }) => {
                const active = isIncisiveMode === value;
                return (
                  <button
                    key={label}
                    role="radio"
                    aria-checked={active}
                    disabled={isLive}
                    onClick={() => setIsIncisiveMode(value)}
                    className={`relative flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
                      active ? `bg-paper shadow-sm ${value ? 'text-alert' : 'text-lagoon'}` : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <Icon className="relative w-4 h-4" />
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 px-2 text-sm text-ink-faint leading-snug">
              {isIncisiveMode
                ? 'Franche et directe : Marie vous confronte à vos contradictions.'
                : 'Douce et bienveillante : Marie vous accompagne sans brusquer.'}
              {isLive && ' Modifiable entre deux séances.'}
            </p>
          </section>

          {/* Données */}
          <section>
            <h3 className="px-2 font-sans text-sm font-semibold text-ink-faint">Votre parcours</h3>
            <nav className="mt-1.5 -mx-1">
              {navItem(
                () => setShowHistory(true),
                Calendar,
                'Historique',
                '#1f6b72',
                <span className="text-sm tabular-nums text-ink-soft bg-mist rounded-full px-2.5 py-0.5">{history.length}</span>,
              )}
              {navItem(() => setShowTree(true), Network, 'Arbre thérapeutique', '#5561c9')}
              {navItem(() => setShowPlan(true), ClipboardList, 'Plan thérapeutique', '#c27a3e')}
            </nav>
          </section>

          {latestClinicalData?.recommended_therapy?.type && (
            <section className="rounded-2xl border border-line p-4">
              <h3 className="font-sans text-sm font-semibold text-ink-faint flex items-center gap-2">
                <Compass className="w-4 h-4 text-symptom" /> Professionnel conseillé
              </h3>
              <p className="mt-2 font-serif text-lg leading-snug text-ink">{latestClinicalData.recommended_therapy.type}</p>
              <p className="mt-1.5 text-sm text-ink-soft leading-relaxed line-clamp-4" title={latestClinicalData.recommended_therapy.reason}>
                {latestClinicalData.recommended_therapy.reason}
              </p>
            </section>
          )}
        </div>

        <div className="hidden md:flex gap-1 px-4 py-4 border-t border-line">
          <button onClick={() => setShowSettings(true)} className="btn btn-quiet flex-1 py-2.5 text-sm rounded-xl">
            <Settings className="w-4 h-4" /> Paramètres
          </button>
          <button onClick={handleLogout} className="btn btn-quiet flex-1 py-2.5 text-sm rounded-xl">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* ================= Scène de séance ================= */}
      <main
        className={`order-1 md:order-2 relative flex flex-col min-h-[100dvh] md:min-h-screen transition-colors duration-700 ${
          isLive ? 'bg-dusk text-paper' : 'bg-mist text-ink'
        }`}
      >
        {/* Barre mobile */}
        <div className={`md:hidden flex items-center justify-between gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 ${isLive ? '' : 'border-b border-line bg-mist/90'}`}>
          <span className="inline-flex items-center gap-2">
            <MindHeartLogo className={`w-7 h-7 ${isLive ? 'text-paper' : 'text-ink'}`} />
            <span className="font-serif text-lg">Marie</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCreditsPanelOpen(true)}
              className={`btn px-3 py-2 text-sm tabular-nums ${isLive ? 'bg-paper/10 text-paper' : 'bg-apricot-pale text-ink'}`}
              aria-label={`Temps disponible ${formatTime(credits)}. Recharger`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(credits).replace(' min', '')}
            </button>
            <button onClick={() => setShowSettings(true)} className={`btn w-10 h-10 ${isLive ? 'text-paper/80 hover:bg-paper/10' : 'btn-quiet'}`} aria-label="Paramètres et confidentialité">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className={`btn w-10 h-10 ${isLive ? 'text-paper/80 hover:bg-paper/10' : 'btn-quiet'}`} aria-label="Déconnexion">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:py-14">
          <div className="w-full max-w-md flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              {!isLive && !isSaving ? (
                <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h1 className="text-4xl sm:text-5xl text-ink">{firstName ? `Bonjour ${firstName}.` : 'Bonjour.'}</h1>
                  <p className="mt-4 text-ink-soft leading-relaxed max-w-sm mx-auto">
                    {history.length > 0
                      ? 'Marie se souvient de vos séances précédentes. Reprenez là où vous vous étiez arrêté.'
                      : 'Un espace sûr et confidentiel pour explorer vos pensées, avec une IA formée sur la littérature psychologique.'}
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`text-sm ${isLive ? 'text-paper/60' : 'text-ink-soft'}`}
                >
                  {isIncisiveMode ? 'Séance en mode électrochoc' : 'Séance en mode empathique'}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Lignes de souffle */}
            <div className="relative mt-8 mb-2 w-full flex justify-center">
              {isConnected && isSpeaking ? (
                <button
                  onClick={() => interrupt()}
                  className="group relative rounded-full"
                  aria-label="Interrompre Marie"
                  title="Toucher pour interrompre Marie"
                >
                  <BreathOrb mode={orbMode} analyserNode={analyserNode} tone="dark" size={300} />
                  <span className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-paper/10 text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                    <Hand className="w-6 h-6" />
                  </span>
                </button>
              ) : (
                <div className="relative">
                  <BreathOrb mode={orbMode} analyserNode={analyserNode} tone={isLive ? 'dark' : 'light'} size={300} />
                  {!isLive && !isSaving && (
                    <span className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-paper border border-line flex items-center justify-center shadow-sm">
                      <Mic className="w-6 h-6 text-lagoon" />
                    </span>
                  )}
                  {isSaving && (
                    <span className="absolute inset-0 m-auto w-12 h-12 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-lagoon animate-spin" />
                    </span>
                  )}
                </div>
              )}
            </div>

            <div aria-live="polite" className="min-h-[4.5rem] flex flex-col items-center gap-2">
              <p className={`font-serif text-2xl ${isLive ? 'text-paper' : 'text-ink'}`}>{statusText}</p>
              {isConnected && isSpeaking && <p className="text-sm text-paper/55">Touchez le cercle pour interrompre</p>}
              {timeLeft !== null && (isLive || hasStarted) && (
                <p className={`text-sm tabular-nums ${isLive ? 'text-paper/70' : 'text-ink-soft'}`}>Temps restant : {formatTime(timeLeft)}</p>
              )}
            </div>

            {error && (
              <div role="alert" className="mt-4 w-full rounded-2xl bg-alert-pale text-alert px-4 py-3 text-sm text-left flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={toggleSession}
              disabled={isSaving || !user}
              className={`btn mt-6 w-full max-w-xs py-4 text-base ${
                isConnected
                  ? 'bg-paper/10 text-paper hover:bg-paper/15 ring-1 ring-paper/20'
                  : outOfCredits
                    ? 'bg-apricot text-ink hover:bg-[#d98b4d]'
                    : 'btn-primary shadow-[0_12px_30px_-12px_rgba(31,107,114,0.7)]'
              }`}
            >
              {isConnected ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Terminer la séance
                </>
              ) : outOfCredits ? (
                <>
                  <Zap className="w-5 h-5" /> Recharger pour continuer
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" /> {isSaving ? 'Sauvegarde en cours…' : 'Commencer la séance'}
                </>
              )}
            </button>

            {!hasStarted && !isSaving && (
              <p className="mt-6 text-sm text-ink-faint max-w-xs leading-relaxed">
                Installez-vous dans un endroit calme. Vos échanges sont traités en temps réel ; un résumé est sauvegardé pour assurer le suivi.
              </p>
            )}
          </div>
        </div>
      </main>

      {/* ================= Fenêtres ================= */}

      {/* Suppression d'une séance */}
      <Modal
        open={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Supprimer cette séance ?"
        icon={<Trash2 className="w-6 h-6 text-alert" />}
        size="sm"
        zIndex={60}
        footer={
          <>
            <button onClick={() => setSessionToDelete(null)} className="btn btn-outline px-5 py-2.5">Annuler</button>
            <button onClick={confirmDeleteSession} className="btn px-5 py-2.5 bg-alert text-white hover:bg-[#961f18]">Supprimer la séance</button>
          </>
        }
      >
        <p className="text-ink-soft leading-relaxed">
          Les éléments ajoutés à l'arbre thérapeutique lors de cette séance seront aussi supprimés. Cette action est irréversible.
        </p>
      </Modal>

      {/* Historique */}
      <Modal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        title="Votre parcours"
        description={history.length > 0 ? `${history.length} séance${history.length > 1 ? 's' : ''} enregistrée${history.length > 1 ? 's' : ''}` : undefined}
        icon={<Calendar className="w-6 h-6 text-lagoon" />}
        size="lg"
      >
        {history.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-serif text-xl text-ink">Aucune séance pour le moment</p>
            <p className="mt-2 text-ink-soft">Votre première séance apparaîtra ici avec son résumé et votre plan.</p>
            <button onClick={() => setShowHistory(false)} className="btn btn-primary mt-6 px-6 py-3">
              <Mic className="w-4 h-4" /> Commencer une séance
            </button>
          </div>
        ) : (
          <ol className="relative border-l border-line ml-2 space-y-6">
            {history.slice().reverse().map((session, idx) => {
              const insights = parseInsights(session.insights);
              const clinicalData = parseClinicalData(session.clinical_data);
              const planData = parsePlanData(session.therapeutic_plan);
              const expanded = expandedSessionId ? expandedSessionId === session.id : idx === 0;
              return (
                <li key={session.id} className="pl-6 relative">
                  <span className={`absolute -left-[7px] top-2 w-3.5 h-3.5 rounded-full border-2 border-paper ${idx === 0 ? 'bg-lagoon' : 'bg-line'}`} />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <button
                      onClick={() => setExpandedSessionId(expanded ? '__none__' : session.id)}
                      aria-expanded={expanded}
                      className="text-left flex-1 min-w-[12rem] group"
                    >
                      <p className="font-semibold text-ink first-letter:uppercase flex items-center gap-2">
                        {formatDate(session.date)}
                        <ChevronDown className={`w-4 h-4 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </p>
                      {!expanded && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{session.summary}</p>}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadPDF(clinicalData, session.date, session.id, session.summary, insights)}
                        className="btn btn-outline px-3 py-1.5 text-sm"
                        title="Télécharger le dossier clinique en PDF"
                      >
                        {copiedSessionId === session.id ? (
                          <>
                            <Check className="w-4 h-4 text-lagoon" /> Téléchargé
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" /> PDF
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="btn btn-quiet w-9 h-9 hover:!text-alert hover:!bg-alert-pale"
                        aria-label="Supprimer cette séance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 space-y-5">
                      <p className="text-ink leading-relaxed whitespace-pre-wrap">{session.summary}</p>

                      {insights.length > 0 && (
                        <div>
                          <h3 className="font-sans text-sm font-semibold text-lagoon flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> Prises de conscience
                          </h3>
                          <ul className="mt-2 space-y-2">
                            {insights.map((insight: string, i: number) => (
                              <li key={i} className="font-serif text-[1.05rem] leading-snug text-ink border-l-2 border-lagoon/50 pl-3">
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {Object.keys(clinicalData).length > 0 && (
                        <div>
                          <h3 className="font-sans text-sm font-semibold text-symptom flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Notes cliniques (dossier de transfert)
                          </h3>
                          <div className="mt-2 grid sm:grid-cols-2 gap-2.5">
                            {clinicalData.emotional_state && (
                              <div className="sm:col-span-2 rounded-2xl bg-mist/70 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                                  <HeartPulse className="w-4 h-4 text-root" /> État émotionnel
                                </h4>
                                <p className="mt-2 text-[0.95rem] text-ink-soft">{clinicalData.emotional_state}</p>
                              </div>
                            )}
                            <ListBlock icon={Stethoscope} title="Symptômes" items={clinicalData.symptoms} color="#5561c9" />
                            <ListBlock icon={AlertTriangle} title="Déclencheurs" items={clinicalData.triggers} color="#c27a3e" />
                            <div className="sm:col-span-2">
                              <ListBlock icon={ShieldCheck} title="Mécanismes de défense et d’adaptation" items={clinicalData.defense_mechanisms} color="#2a8c86" />
                            </div>
                            {clinicalData.risk_assessment && (
                              <div className="sm:col-span-2 rounded-2xl bg-mist/70 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                                  <AlertTriangle className="w-4 h-4 text-alert" /> Évaluation des risques
                                </h4>
                                <p className="mt-2 text-[0.95rem] text-ink-soft">{clinicalData.risk_assessment}</p>
                              </div>
                            )}
                            {clinicalData.recommended_therapy?.type && (
                              <div className="sm:col-span-2 rounded-2xl bg-symptom/10 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-symptom">
                                  <Compass className="w-4 h-4" /> Recommandation thérapeutique
                                </h4>
                                <p className="mt-2 font-serif text-lg text-ink">{clinicalData.recommended_therapy.type}</p>
                                <p className="mt-1 text-[0.95rem] text-ink-soft leading-relaxed">{clinicalData.recommended_therapy.reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {planData && planData.focus && (
                        <div className="rounded-2xl border border-apricot/40 bg-apricot-pale/50 p-4">
                          <h3 className="font-sans text-sm font-semibold text-[#a3622c] flex items-center gap-2">
                            <Target className="w-4 h-4" /> Plan d'action
                          </h3>
                          <p className="mt-2 font-serif text-lg text-ink">{planData.focus}</p>
                          {planData.actions && planData.actions.length > 0 && (
                            <ul className="mt-3 space-y-2">
                              {planData.actions.map((action: string, i: number) => (
                                <li key={i} className="flex gap-2.5 text-[0.95rem] text-ink">
                                  <CheckCircle2 className="w-4 h-4 text-lagoon shrink-0 mt-1" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {planData.hygiene_and_wellbeing && planData.hygiene_and_wellbeing.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-apricot/30">
                              <h4 className="text-sm font-semibold text-root flex items-center gap-2">
                                <Heart className="w-4 h-4" /> Hygiène mentale et bien-être
                              </h4>
                              <ul className="mt-2 space-y-1.5">
                                {planData.hygiene_and_wellbeing.map((item: string, i: number) => (
                                  <li key={i} className="flex gap-2.5 text-[0.95rem] text-ink-soft">
                                    <Sparkles className="w-4 h-4 text-root shrink-0 mt-1" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {planData.adjustments && (
                            <p className="mt-4 pt-3 border-t border-apricot/30 text-sm text-ink-soft">
                              <span className="font-semibold text-ink">Ajustements : </span>
                              {planData.adjustments}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Modal>

      {/* Arbre thérapeutique */}
      <Modal
        open={showTree}
        onClose={() => setShowTree(false)}
        title="Arbre thérapeutique"
        description="Cette carte relie vos émotions, vos symptômes et leurs causes profondes pour vous aider à comprendre votre progression. Touchez un point pour le lire."
        icon={<Network className="w-6 h-6 text-symptom" />}
        size="xl"
      >
        <div className="h-[62dvh] min-h-[420px] flex flex-col">
          {history.length === 0 ? (
            <div className="flex-1 flex items-center justify-center rounded-2xl bg-mist text-center px-6">
              <p className="text-ink-soft">Aucun arbre pour le moment : il se dessine après votre première séance.</p>
            </div>
          ) : latestTreeData.nodes && latestTreeData.nodes.length > 0 ? (
            <TherapyTree data={latestTreeData} />
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl bg-mist">
              <p className="text-ink-soft">L'arbre thérapeutique est en cours de construction.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Plan thérapeutique */}
      <Modal
        open={showPlan}
        onClose={() => setShowPlan(false)}
        title="Plan thérapeutique"
        description={latestPlanData?.focus ? 'Ce plan sera évalué et ajusté avec vous lors de la prochaine séance.' : undefined}
        icon={<ClipboardList className="w-6 h-6 text-[#c27a3e]" />}
        size="lg"
      >
        {history.length === 0 || !latestPlanData || !latestPlanData.focus ? (
          <div className="py-12 text-center">
            <Target className="w-10 h-10 text-ink-faint mx-auto" strokeWidth={1.5} />
            <p className="mt-4 font-serif text-xl text-ink">Pas encore de plan</p>
            <p className="mt-2 text-ink-soft">Un plan vous sera proposé à la fin de votre prochaine séance.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl bg-ink text-paper p-6 sm:p-7">
              <p className="text-sm text-paper/60 flex items-center gap-2">
                <Target className="w-4 h-4 text-apricot" /> Objectif principal
              </p>
              <p className="mt-2 font-serif text-2xl leading-snug">{latestPlanData.focus}</p>
            </div>

            {latestPlanData.actions && latestPlanData.actions.length > 0 && (
              <section>
                <h3 className="text-xl">Actions et exercices</h3>
                <ol className="mt-3 space-y-3">
                  {latestPlanData.actions.map((action: string, idx: number) => (
                    <li key={idx} className="flex gap-3.5">
                      <span className="w-7 h-7 shrink-0 rounded-full border border-ink/20 flex items-center justify-center font-serif text-sm text-ink mt-0.5">{idx + 1}</span>
                      <span className="text-ink leading-relaxed">{action}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {latestPlanData.hygiene_and_wellbeing && latestPlanData.hygiene_and_wellbeing.length > 0 && (
              <section className="rounded-2xl bg-root/8 border border-root/20 p-5">
                <h3 className="text-xl flex items-center gap-2">
                  <Heart className="w-5 h-5 text-root" /> Hygiène mentale et bien-être
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {latestPlanData.hygiene_and_wellbeing.map((item: string, idx: number) => (
                    <li key={idx} className="flex gap-3 text-ink leading-relaxed">
                      <Sparkles className="w-4 h-4 text-root shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {latestPlanData.adjustments && (
              <section className="rounded-2xl bg-mist p-5">
                <h3 className="font-sans text-sm font-semibold text-ink-soft">Ajustements et remarques</h3>
                <p className="mt-2 text-ink leading-relaxed">{latestPlanData.adjustments}</p>
              </section>
            )}
          </div>
        )}
      </Modal>

      {/* Paramètres */}
      <Modal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        title="Paramètres et confidentialité"
        icon={<Settings className="w-6 h-6 text-ink-soft" />}
        size="md"
      >
        <div className="space-y-8">
          <section className="space-y-5">
            <div>
              <h3 className="flex items-center gap-2 font-sans font-semibold text-ink">
                <Globe className="w-4 h-4 text-lagoon" /> Langue de la séance
              </h3>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Langue de la séance">
                {[
                  { code: 'fr', label: 'Français' },
                  { code: 'en', label: 'English' },
                  { code: 'de', label: 'Deutsch' },
                  { code: 'es', label: 'Español' },
                ].map((lang) => (
                  <button
                    key={lang.code}
                    role="radio"
                    aria-checked={language === lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      localStorage.setItem('marie_language', lang.code);
                    }}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      language === lang.code ? 'border-lagoon bg-lagoon-pale text-lagoon-deep' : 'border-line text-ink-soft hover:border-ink-faint'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-sans font-semibold text-ink">
                <Volume2 className="w-4 h-4 text-lagoon" /> Voix de Marie
              </h3>
              <div className="mt-3 flex gap-2">
                <select
                  value={voiceName}
                  onChange={(e) => {
                    setVoiceName(e.target.value);
                    localStorage.setItem('marie_voice', e.target.value);
                  }}
                  className="field flex-1"
                  aria-label="Voix de Marie"
                >
                  <option value="Zephyr">Zephyr</option>
                  <option value="Kore">Kore</option>
                  <option value="Puck">Puck</option>
                  <option value="Charon">Charon</option>
                  <option value="Fenrir">Fenrir</option>
                </select>
                <button onClick={handlePreviewVoice} disabled={isPreviewing} className="btn btn-outline px-4 rounded-xl">
                  {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Écouter
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-sans font-semibold text-ink">Vos données personnelles</h3>
            <div className="mt-2 divide-y divide-line border-y border-line">
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowPrivacyPolicy(true);
                }}
                className="w-full flex items-center gap-3 py-3.5 text-left group"
              >
                <ShieldCheck className="w-5 h-5 text-lagoon shrink-0" />
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Politique de confidentialité</span>
                  <span className="block text-sm text-ink-soft">Comment vos données sont traitées</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink" />
              </button>
              <button onClick={handleDownloadData} className="w-full flex items-center gap-3 py-3.5 text-left group">
                <Download className="w-5 h-5 text-symptom shrink-0" />
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Exporter mes données</span>
                  <span className="block text-sm text-ink-soft">Tout l'historique de vos séances, au format JSON</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink" />
              </button>
              <button
                onClick={() => setConfirmDeleteAccount(true)}
                disabled={isDeletingAccount}
                className="w-full flex items-center gap-3 py-3.5 text-left group disabled:opacity-50"
              >
                {isDeletingAccount ? <Loader2 className="w-5 h-5 text-alert animate-spin shrink-0" /> : <Trash2 className="w-5 h-5 text-alert shrink-0" />}
                <span className="flex-1">
                  <span className="block font-semibold text-alert">Supprimer mon compte</span>
                  <span className="block text-sm text-ink-soft">Efface définitivement toutes vos données</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-alert" />
              </button>
            </div>
          </section>
        </div>
      </Modal>

      {/* Confirmation de suppression du compte */}
      <Modal
        open={confirmDeleteAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        title="Supprimer votre compte ?"
        icon={<AlertTriangle className="w-6 h-6 text-alert" />}
        size="sm"
        zIndex={70}
        footer={
          <>
            <button onClick={() => setConfirmDeleteAccount(false)} className="btn btn-outline px-5 py-2.5">Annuler</button>
            <button
              onClick={() => {
                setConfirmDeleteAccount(false);
                handleDeleteAccount();
              }}
              className="btn px-5 py-2.5 bg-alert text-white hover:bg-[#961f18]"
            >
              Supprimer définitivement
            </button>
          </>
        }
      >
        <p className="text-ink-soft leading-relaxed">
          Votre compte, vos séances, votre arbre et vos plans seront effacés de nos serveurs. Cette action est irréversible. Pensez à exporter vos données avant si vous souhaitez les garder.
        </p>
      </Modal>

      {/* Urgence */}
      <Modal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        title="Besoin d'aide tout de suite ?"
        icon={<AlertTriangle className="w-7 h-7 text-alert" />}
        tone="alert"
        size="md"
        zIndex={100}
        footer={
          <button onClick={() => setShowEmergencyModal(false)} className="btn btn-outline px-6 py-2.5">
            J'ai compris
          </button>
        }
      >
        <p className="text-ink leading-relaxed">
          Il semble que vous traversiez un moment très difficile. Votre sécurité passe avant tout.
        </p>
        <p className="mt-2 font-semibold text-ink">Vous n'êtes pas seul(e) : de l'aide est disponible maintenant, 24 h/24 et 7 j/7.</p>
        <ul className="mt-5 space-y-2">
          {[
            { label: 'Prévention du suicide', sub: 'France, gratuit', tel: '3114', show: '3114', strong: true },
            { label: 'SAMU', sub: 'France', tel: '15', show: '15', strong: true },
            { label: 'Urgences européennes', sub: 'Partout en Europe', tel: '112', show: '112', strong: true },
            { label: 'SOS Amitié', sub: 'Écoute, France', tel: '0972394050', show: '09 72 39 40 50', strong: false },
          ].map((n) => (
            <li key={n.tel}>
              <a
                href={`tel:${n.tel}`}
                className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors ${n.strong ? 'bg-alert-pale hover:bg-[#f2d2cf]' : 'bg-mist hover:bg-line/60'}`}
              >
                <Phone className={`w-5 h-5 shrink-0 ${n.strong ? 'text-alert' : 'text-ink-soft'}`} />
                <span className="flex-1">
                  <span className="block font-semibold text-ink">{n.label}</span>
                  <span className="block text-sm text-ink-soft">{n.sub}</span>
                </span>
                <span className={`font-serif text-2xl tabular-nums ${n.strong ? 'text-alert' : 'text-ink'}`}>{n.show}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-ink-soft">
          Contactez l'un de ces services ou rendez-vous aux urgences les plus proches. Des professionnels sont là pour vous écouter, sans jugement.
        </p>
      </Modal>

      {/* Consentement */}
      <Modal
        open={showConsentModal}
        title="Bienvenue sur Marie"
        description="Avant votre première séance, nous avons besoin de votre accord explicite. Cette étape n'est demandée qu'une fois."
        icon={<ShieldCheck className="w-6 h-6 text-lagoon" />}
        size="md"
        dismissible={false}
        footer={
          <>
            <button onClick={handleLogout} className="btn btn-quiet px-5 py-2.5">
              Refuser et me déconnecter
            </button>
            <button onClick={handleConsentSubmit} disabled={!consentTOS || !consentHealthData} className="btn btn-primary px-6 py-2.5">
              <Check className="w-4 h-4" /> Créer mon compte
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {[
            {
              checked: consentTOS,
              set: setConsentTOS,
              expanded: expandedTOS,
              toggle: () => setExpandedTOS(!expandedTOS),
              title: "J'accepte les conditions générales d'utilisation",
              body: (
                <>
                  <p><strong>1. Nature du service :</strong> Marie est un outil expérimental d'accompagnement basé sur l'intelligence artificielle. Ce service <strong>n'est pas</strong> un dispositif médical, ne propose pas de télémédecine et ne remplace en aucun cas une consultation, un diagnostic ou un traitement par un médecin, un psychiatre ou un psychologue diplômé.</p>
                  <p><strong>2. Urgences :</strong> Marie n'est pas conçue pour gérer les crises ou les urgences. En cas de détresse psychologique aiguë, de pensées suicidaires ou d'urgence médicale, contactez immédiatement les secours (15, 112) ou le numéro national de prévention du suicide (3114 en France).</p>
                  <p><strong>3. Limites de l'IA :</strong> L'intelligence artificielle peut générer des réponses inexactes, inappropriées ou hors contexte. Vous acceptez de ne pas prendre de décisions médicales, financières, légales ou vitales sur la base des échanges avec cette IA.</p>
                  <p><strong>4. Responsabilité :</strong> L'éditeur de Marie décline toute responsabilité quant aux conséquences directes ou indirectes liées à l'utilisation de l'application. L'utilisation se fait à vos propres risques.</p>
                  <p><strong>5. Âge requis :</strong> L'utilisation de ce service est strictement réservée aux personnes majeures (18 ans et plus).</p>
                </>
              ),
            },
            {
              checked: consentHealthData,
              set: setConsentHealthData,
              expanded: expandedHealth,
              toggle: () => setExpandedHealth(!expandedHealth),
              title: "J'accepte le traitement de mes données de santé (RGPD)",
              body: (
                <>
                  <p><strong>1. Consentement explicite (art. 9 RGPD) :</strong> En cochant cette case, vous consentez expressément à la collecte et au traitement de données à caractère personnel pouvant révéler des informations sur votre santé physique ou mentale, dans le but exclusif de faire fonctionner l'assistante Marie.</p>
                  <p><strong>2. Données collectées et anonymisation :</strong> Nous traitons vos entrées vocales et textuelles. L'audio n'est pas conservé après transcription. L'IA génère une version anonymisée de vos échanges (suppression des noms, lieux, etc.), seule version sauvegardée dans votre historique. Nous vous recommandons néanmoins de ne pas partager d'informations d'identification directe (nom de famille, adresse exacte, numéro de sécurité sociale).</p>
                  <p><strong>3. Sous-traitants et IA privée :</strong> Le traitement de vos requêtes implique l'utilisation de modèles de langage de Google Cloud. <strong>Nous utilisons une clé API payante et sécurisée.</strong> Vos données vocales et textuelles sont traitées de manière éphémère et ne sont <strong>pas utilisées</strong> pour entraîner les modèles d'intelligence artificielle de Google ou d'autres tiers.</p>
                  <p><strong>4. Vos droits :</strong> Vous disposez d'un droit d'accès, de rectification, d'effacement (droit à l'oubli), de limitation et de portabilité de vos données. L'application vous permet d'exporter vos données (format JSON) ou de supprimer définitivement votre compte et l'intégralité de votre historique depuis les paramètres.</p>
                  <p><strong>5. Durée de conservation :</strong> Vos données sont conservées uniquement tant que votre compte est actif. La suppression de votre compte entraîne l'effacement immédiat et irréversible de vos données de nos serveurs.</p>
                </>
              ),
            },
          ].map((c) => (
            <div key={c.title} className={`rounded-2xl border transition-colors ${c.checked ? 'border-lagoon bg-lagoon-pale/40' : 'border-line'}`}>
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={(e) => c.set(e.target.checked)}
                  className="w-5 h-5 mt-0.5 shrink-0 cursor-pointer"
                  aria-label={c.title}
                />
                <div className="flex-1">
                  <p className="font-semibold text-ink leading-snug">{c.title}</p>
                  <button onClick={c.toggle} aria-expanded={c.expanded} className="mt-1 text-sm font-semibold text-lagoon hover:text-lagoon-deep inline-flex items-center gap-1">
                    {c.expanded ? 'Masquer le détail' : 'Lire le détail'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${c.expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {c.expanded && <div className="mt-3 text-sm text-ink-soft space-y-2.5 leading-relaxed max-h-56 overflow-y-auto pr-2">{c.body}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Politique de confidentialité */}
      <Modal
        open={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
        title="Politique de confidentialité"
        icon={<ShieldCheck className="w-6 h-6 text-lagoon" />}
        size="lg"
      >
        <div className="text-ink-soft leading-relaxed space-y-3 max-w-[68ch] [&_h3]:text-xl [&_h3]:text-ink [&_h3]:pt-4 [&_strong]:text-ink">
          <h3>1. Introduction</h3>
          <p>La présente politique de confidentialité explique comment Marie collecte, utilise et protège vos données personnelles. En utilisant notre application, vous acceptez les pratiques décrites dans ce document.</p>
          <h3>2. Données collectées</h3>
          <p><strong>Données de compte :</strong> lors de votre connexion via Google, nous collectons votre adresse e-mail, votre nom d'utilisateur et votre photo de profil fournis par Google.</p>
          <p><strong>Données de santé (sensibles) :</strong> les conversations vocales et textuelles que vous avez avec l'IA peuvent contenir des données de santé mentale. Ces données sont traitées en temps réel.</p>
          <p><strong>Données générées :</strong> l'IA génère des résumés, des analyses cliniques et des plans thérapeutiques basés sur vos conversations.</p>
          <h3>3. Utilisation des données et IA privée</h3>
          <p>Vos données sont utilisées <strong>exclusivement</strong> pour vous fournir le service d'accompagnement psychologique.</p>
          <p className="rounded-2xl bg-lagoon-pale/60 text-lagoon-deep p-4">
            <strong className="!text-lagoon-deep">Garantie de non-entraînement :</strong> nous utilisons une infrastructure payante (Google Cloud API). Vos données vocales et textuelles <strong className="!text-lagoon-deep">ne sont pas utilisées</strong> par Google ou par nous-mêmes pour entraîner, améliorer ou perfectionner des modèles d'intelligence artificielle.
          </p>
          <h3>4. Stockage et sécurité</h3>
          <p>Vos résumés et analyses sont stockés de manière sécurisée sur les serveurs de Firebase (Google Cloud). Les flux audio en temps réel ne sont <strong>pas stockés</strong> après leur traitement immédiat.</p>
          <h3>5. Vos droits (RGPD)</h3>
          <p>Conformément au Règlement général sur la protection des données (RGPD), vous disposez des droits suivants :</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Droit d'accès et de portabilité :</strong> vous pouvez télécharger l'intégralité de vos données au format JSON depuis les paramètres.</li>
            <li><strong>Droit à l'effacement (droit à l'oubli) :</strong> vous pouvez supprimer définitivement votre compte et toutes vos données associées depuis les paramètres.</li>
            <li><strong>Droit de rectification :</strong> vous pouvez modifier les informations de votre profil via votre compte Google.</li>
          </ul>
          <h3>6. Cookies et traceurs</h3>
          <p>Marie n'utilise <strong>aucun cookie publicitaire ou de traçage</strong> (pas de Google Analytics, pas de Pixel Meta, etc.). Les seuls cookies utilisés sont des cookies techniques strictement nécessaires à l'authentification (Firebase Auth).</p>
          <h3>7. Mentions légales</h3>
          <p>
            <strong>Éditeur du service :</strong> Marie<br />
            <strong>Hébergeur :</strong> Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande (serveurs de données situés à Londres, Royaume-Uni, région <em>europe-west2</em>, en conformité avec le RGPD).
          </p>
          <h3>8. Contact et exercice de vos droits</h3>
          <p>Pour toute question relative à la protection de vos données personnelles, ou pour exercer vos droits (accès, rectification, suppression), contactez-nous :</p>
          <a href="mailto:julyand36@gmail.com" className="inline-block font-semibold text-lagoon underline underline-offset-4">julyand36@gmail.com</a>
        </div>
      </Modal>

      {/* Recharger les crédits */}
      <Modal
        open={isCreditsPanelOpen}
        onClose={() => setIsCreditsPanelOpen(false)}
        title="Recharger votre temps"
        description="Vous ne payez que le temps de séance consommé. Le temps non utilisé est conservé pour vos prochaines séances."
        icon={<Clock className="w-6 h-6 text-apricot" />}
        size="sm"
        zIndex={60}
      >
        <p className="text-sm text-ink-soft">
          Solde actuel : <span className="font-semibold text-ink tabular-nums">{formatTime(credits)}</span>
        </p>
        <div className="mt-4 space-y-3">
          {[
            { title: '30 minutes', sub: 'Une séance standard', price: '13 €', href: STRIPE_30, recommended: false },
            { title: '1 heure', sub: 'Pour un travail en profondeur', price: '20 €', href: STRIPE_60, recommended: true },
          ].map((o) => (
            <a
              key={o.title}
              href={o.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                o.recommended ? 'border-lagoon bg-lagoon-pale/40 hover:bg-lagoon-pale/70' : 'border-line hover:border-ink-faint'
              }`}
            >
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-serif text-xl text-ink">{o.title}</span>
                  {o.recommended && <span className="text-xs font-semibold text-paper bg-lagoon rounded-full px-2 py-0.5">Le plus avantageux</span>}
                </span>
                <span className="block text-sm text-ink-soft">{o.sub}</span>
              </span>
              <span className="font-serif text-2xl text-ink">{o.price}</span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-faint">Paiement sécurisé par Stripe. Votre temps est crédité automatiquement après le paiement.</p>
      </Modal>

      {/* Temps écoulé */}
      <Modal
        open={showPaywall}
        title="Votre temps est écoulé"
        description="Votre crédit de temps est épuisé. Rechargez pour reprendre la séance là où vous en étiez : elle se relance automatiquement."
        icon={<Clock className="w-6 h-6 text-apricot" />}
        size="sm"
        zIndex={60}
        dismissible={false}
        footer={
          <button
            onClick={() => {
              disconnect(false);
              setIsPaused(false);
              setHasStarted(false);
              setShowPaywall(false);
            }}
            className="btn btn-quiet px-5 py-2.5 w-full sm:w-auto"
          >
            Terminer la séance
          </button>
        }
      >
        <div className="space-y-3">
          <a href={STRIPE_30} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-lagoon bg-lagoon-pale/40 hover:bg-lagoon-pale/70 p-4 transition-colors">
            <span className="flex-1">
              <span className="block font-serif text-xl text-ink">30 minutes</span>
              <span className="block text-sm text-ink-soft">Pour prolonger la séance</span>
            </span>
            <span className="font-serif text-2xl text-ink">13 €</span>
          </a>
          <a href={STRIPE_60} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-line hover:border-ink-faint p-4 transition-colors">
            <span className="flex-1">
              <span className="block font-serif text-xl text-ink">1 heure</span>
              <span className="block text-sm text-ink-soft">Pour un travail en profondeur</span>
            </span>
            <span className="font-serif text-2xl text-ink">20 €</span>
          </a>
        </div>
      </Modal>
    </div>
  );
}
