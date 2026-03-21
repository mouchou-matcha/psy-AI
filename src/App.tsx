import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Activity, User, Brain, Loader2, X, Sparkles, Calendar, Network, Stethoscope, AlertTriangle, ShieldCheck, Compass, FileText, LogIn, LogOut, UserPlus, ClipboardList, Target, CheckCircle2, HeartPulse, Zap, Heart, Trash2, Copy, Check, Download, Settings, ChevronDown, ChevronUp , Volume2} from 'lucide-react';
import { useLiveAPI } from './hooks/useLiveAPI';
import { TherapyTree } from './components/TherapyTree';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, deleteUser } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';

interface SessionHistory {
  id: string;
  date: string;
  summary: string;
  insights: string;
  tree_data: string;
  clinical_data: string;
  therapeutic_plan: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isIncisiveMode, setIsIncisiveMode] = useState(false);

  const [history, setHistory] = useState<SessionHistory[]>([]);
  const { isConnected, isSpeaking, isSaving, error, connect, disconnect, interrupt } = useLiveAPI(user, history, isIncisiveMode, voiceName);
  const [hasStarted, setHasStarted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentTOS, setConsentTOS] = useState(false);
  const [consentHealthData, setConsentHealthData] = useState(false);
  const [expandedTOS, setExpandedTOS] = useState(false);
  const [expandedHealth, setExpandedHealth] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
    const [voiceName, setVoiceName] = useState<string>(() => localStorage.getItem('psychoia_voice') || 'Zephyr');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
useEffect(() => {
    const checkConsent = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists() || !userDoc.data().hasConsented) {
            setShowConsentModal(true);
          }
        } catch (err) {
          console.error("Error checking consent:", err);
        }
      }
    };
    if (isAuthReady) {
      checkConsent();
    }
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

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
  };
const handleConsentSubmit = async () => {
    if (user && consentTOS && consentHealthData) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          hasConsented: true,
          consentedAt: new Date().toISOString()
        }, { merge: true });
        setShowConsentModal(false);
      } catch (err) {
        console.error("Error saving consent:", err);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      const q = query(collection(db, 'patient_history'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, 'users', user.uid));
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

  const handleDownloadData = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `psychoia_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDeleteSession = async (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

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
    doc.setFillColor(16, 185, 129); // emerald-500
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
      doc.setDrawColor(16, 185, 129); // emerald-500
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
      doc.text(`Page ${i} sur ${pageCount} - Généré de manière sécurisée par PsychoIA`, pageWidth / 2, pageHeight - 10, { align: "center" });
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

  // 1-hour timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      setTimeLeft(3600); // 60 minutes
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev !== null && prev <= 1) {
            disconnect();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(interval);
  }, [isConnected, disconnect]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Handle start/stop
  const toggleSession = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      setHasStarted(true);
      await connect();
    }
  };

  const parseInsights = (insightsStr: string) => {
    try {
      const parsed = JSON.parse(insightsStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseTreeData = (treeDataStr: string) => {
    try {
      const parsed = JSON.parse(treeDataStr);
      return parsed && parsed.nodes ? parsed : { nodes: [], links: [] };
    } catch {
      return { nodes: [], links: [] };
    }
  };

  const parseClinicalData = (dataStr: string) => {
    try {
      return JSON.parse(dataStr) || {};
    } catch {
      return {};
    }
  };

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

  if (!isAuthReady) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 grid grid-cols-1 md:grid-cols-[320px_1fr] font-sans">
      
      {/* Sidebar / Auth Panel */}
      <div className="border-t md:border-t-0 md:border-r border-zinc-800 bg-zinc-900/30 p-6 flex flex-col order-2 md:order-1 h-full">
        <div className="hidden md:flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Brain className="w-5 h-5 text-emerald-500" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">PsychoIA</h1>
        </div>

        {user ? (
          <div className="flex flex-col flex-1">
            <div className="hidden md:block bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" /> : <User className="w-5 h-5 text-zinc-400" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{user.displayName || user.email}</p>
                  <p className="text-xs text-zinc-500">Patient connecté</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-xs font-medium text-zinc-300"
                >
                  <Settings className="w-4 h-4" /> Paramètres
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-xs font-medium text-zinc-300"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
        </div>

            <div className="flex-1">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Vos données</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setShowHistory(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors border border-zinc-800/50 group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Historique</span>
                  </div>
                  <span className="text-xs bg-zinc-800 px-2 py-1 rounded-md text-zinc-400">{history.length}</span>
                </button>
                <button 
                  onClick={() => setShowTree(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors border border-zinc-800/50 group"
                >
                  <div className="flex items-center gap-3">
                    <Network className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Arbre Thérapeutique</span>
                  </div>
                </button>
                <button 
                  onClick={() => setShowPlan(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800 transition-colors border border-zinc-800/50 group"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100">Plan Thérapeutique</span>
                  </div>
                </button>
              </div>

              {/* Personnalité de l'IA Toggle */}
              <div className="mt-6 pt-6 border-t border-zinc-800/50">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Personnalité de l'IA</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsIncisiveMode(false)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${!isIncisiveMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'}`}
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm font-medium">Psy Empathique</span>
                  </button>
                  <button
                    onClick={() => setIsIncisiveMode(true)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isIncisiveMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-zinc-400 hover:bg-zinc-800/50 border border-transparent'}`}
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Psy Électrochoc</span>
                  </button>
                </div>
              </div>

              {/* Bilan Inline Section */}
              {latestClinicalData?.recommended_therapy?.type && (
                <div className="mt-6 pt-6 border-t border-zinc-800/50">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Type de professionnel conseillé</h3>
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <Compass className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-300">
                          {latestClinicalData.recommended_therapy.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3" title={latestClinicalData.recommended_therapy.reason}>
                        {latestClinicalData.recommended_therapy.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-col flex-1">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5">
              <h2 className="text-lg font-medium text-zinc-100 mb-1">
                Connexion
              </h2>
              <p className="text-xs text-zinc-400 mb-6">
                Accédez à votre dossier personnel.
              </p>

              <div className="space-y-4">
                {authError && <p className="text-xs text-red-400">{authError}</p>}

                <button 
                  onClick={handleGoogleLogin}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Se connecter avec Google
                </button>
              </div>
            </div>
          </div>
                )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center p-6 relative order-1 md:order-2 h-full overflow-hidden">
        
        {/* Mobile Top Bar (Auth & Logo) */}
        <div className="md:hidden w-full max-w-md mb-8 flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Brain className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="font-medium tracking-tight text-zinc-100">PsychoIA</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" /> : <User className="w-4 h-4 text-zinc-400" />}
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300 mr-2"
                title="Paramètres et Confidentialité"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleGoogleLogin}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
            >
              <LogIn className="w-3 h-3" />
              Connexion
            </button>
          )}
        </div>

        <div className="max-w-md w-full flex flex-col items-center space-y-12">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-zinc-900 rounded-full mb-4 ring-1 ring-zinc-800 shadow-xl">
              <Brain className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-100">
              Psychologue IA
            </h1>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
              Un espace sûr et confidentiel pour explorer vos pensées, avec une IA formée sur la littérature psychologique.
            </p>
            {!user && (
              <p className="text-xs text-amber-500/80 bg-amber-500/10 py-2 px-4 rounded-full border border-amber-500/20 inline-block mt-4">
                Connectez-vous pour commencer une séance et sauvegarder votre dossier.
              </p>
            )}
            {history.length > 0 && !hasStarted && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 md:hidden">
                <button 
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors ring-1 ring-zinc-800 text-xs text-zinc-300"
                >
                  <User className="w-4 h-4 mr-2 text-emerald-500" />
                  Historique ({history.length})
                </button>
                <button 
                  onClick={() => setShowTree(true)}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors ring-1 ring-zinc-800 text-xs text-zinc-300"
                >
                  <Network className="w-4 h-4 mr-2 text-indigo-500" />
                  Arbre Thérapeutique
                </button>
                <button 
                  onClick={() => setShowPlan(true)}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors ring-1 ring-zinc-800 text-xs text-zinc-300"
                >
                  <ClipboardList className="w-4 h-4 mr-2 text-amber-500" />
                  Plan
                </button>
              </div>
            )}

            {/* Mobile Bilan Inline Section */}
            {history.length > 0 && !hasStarted && latestClinicalData?.recommended_therapy?.type && (
              <div className="md:hidden mt-6 w-full max-w-xs mx-auto">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 text-center">Type de professionnel conseillé</h3>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-300">
                      {latestClinicalData.recommended_therapy.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {latestClinicalData.recommended_therapy.reason}
                  </p>
                </div>
              </div>
            )}
          </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center justify-center h-48 w-full relative">
          {isConnected ? (
            <div className="relative flex items-center justify-center">
              {/* Pulsing background when speaking */}
              {isSpeaking && (
                <>
                  <div className="absolute w-32 h-32 bg-emerald-500/20 rounded-full animate-ping" />
                  <div className="absolute w-40 h-40 bg-emerald-500/10 rounded-full animate-pulse" />
                </>
              )}
              <div 
                onClick={() => {
                  if (isSpeaking) interrupt();
                }}
                className={`group relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${isSpeaking ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.4)] cursor-pointer hover:bg-red-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'bg-zinc-800 ring-1 ring-zinc-700'}`}
                title={isSpeaking ? "Cliquer pour interrompre l'IA" : ""}
              >
                {isSpeaking ? (
                  <>
                    <Activity className="w-10 h-10 text-zinc-950 group-hover:hidden" />
                    <X className="w-10 h-10 text-zinc-950 hidden group-hover:block" />
                  </>
                ) : (
                  <Activity className="w-10 h-10 text-emerald-500" />
                )}
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-900 ring-1 ring-zinc-800 flex items-center justify-center opacity-50">
              {isSaving ? (
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              ) : (
                <MicOff className="w-8 h-8 text-zinc-600" />
              )}
            </div>
          )}
          
          <div className="mt-8 text-sm font-medium tracking-wide text-zinc-500 uppercase flex flex-col items-center gap-2">
            <span>{isConnected ? (isSpeaking ? 'Le psychologue parle...' : 'À votre écoute...') : isSaving ? 'Sauvegarde du dossier...' : 'Session terminée'}</span>
            {timeLeft !== null && (
              <span className="text-xs text-emerald-500/80 font-mono bg-emerald-500/10 px-2 py-1 rounded-md">
                Temps restant : {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Controls */}
        <button
          onClick={toggleSession}
          disabled={isSaving || !user}
          className={`group relative flex items-center justify-center w-full py-4 px-8 rounded-2xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            isConnected
              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 ring-1 ring-zinc-800'
              : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isConnected ? (
            <>
              <span className="mr-2">Terminer la session</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              <span>{isSaving ? 'Sauvegarde en cours...' : 'Commencer la session'}</span>
            </>
          )}
        </button>

        {/* Footer info */}
        {!hasStarted && (
          <p className="text-xs text-zinc-600 text-center max-w-xs">
            Assurez-vous d'être dans un endroit calme. Vos échanges sont traités en temps réel. Un résumé clinique est sauvegardé pour assurer le suivi.
          </p>
        )}
        </div>
      </div>

      {/* History Modal */}
      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-medium text-zinc-100 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3 text-red-500" />
              Supprimer la séance
            </h3>
            <p className="text-zinc-400 mb-6">
              Êtes-vous sûr de vouloir supprimer cette séance ? Cela supprimera également les ajouts à l'arbre thérapeutique qui y sont liés. Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteSession}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-medium text-zinc-100 flex items-center">
                <Brain className="w-5 h-5 mr-3 text-emerald-500" />
                Votre Parcours Thérapeutique
              </h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {history.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Aucune session enregistrée pour le moment.</p>
              ) : (
                <>
                  <div className="space-y-8">
                    {history.slice().reverse().map((session) => {
                      const insights = parseInsights(session.insights);
                      const clinicalData = parseClinicalData(session.clinical_data);
                      const planData = parsePlanData(session.therapeutic_plan);
                      
                      return (
                        <div key={session.id} className="space-y-4">
                      <div className="flex items-start justify-between text-sm font-medium text-zinc-400">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(session.date).toLocaleDateString('fr-FR', { 
                              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                          <button
                            onClick={() => handleDownloadPDF(clinicalData, session.date, session.id, session.summary, insights)}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/50 w-fit"
                            title="Télécharger le dossier clinique"
                          >
                            {copiedSessionId === session.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Téléchargé</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Télécharger</span>
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-400/10"
                          title="Supprimer cette séance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="bg-zinc-950/50 rounded-xl p-5 border border-zinc-800/50 space-y-4">
                        <div>
                          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Résumé de la séance</h3>
                          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                            {session.summary}
                          </p>
                        </div>
                        
                        {insights.length > 0 && (
                          <div className="pt-4 border-t border-zinc-800/50">
                            <h3 className="text-xs font-semibold text-emerald-500/80 uppercase tracking-wider mb-3 flex items-center">
                              <Sparkles className="w-3 h-3 mr-1.5" />
                              Prises de conscience (Insights)
                            </h3>
                            <ul className="space-y-2">
                              {insights.map((insight: string, idx: number) => (
                                <li key={idx} className="text-sm text-zinc-200 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 flex items-start">
                                  <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                                  <span className="leading-relaxed">{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Clinical Data Section */}
                        {Object.keys(clinicalData).length > 0 && (
                          <div className="pt-4 border-t border-zinc-800/50 space-y-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider flex items-center">
                                <FileText className="w-3 h-3 mr-1.5" />
                                Notes Cliniques (Dossier de transfert)
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {clinicalData.emotional_state && (
                                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 md:col-span-2">
                                  <h4 className="text-xs font-medium text-zinc-400 flex items-center mb-2">
                                    <HeartPulse className="w-3 h-3 mr-1.5 text-rose-400" /> État Émotionnel
                                  </h4>
                                  <p className="text-sm text-zinc-300">{clinicalData.emotional_state}</p>
                                </div>
                              )}
                              
                              {clinicalData.symptoms && clinicalData.symptoms.length > 0 && (
                                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                  <h4 className="text-xs font-medium text-zinc-400 flex items-center mb-2">
                                    <Stethoscope className="w-3 h-3 mr-1.5" /> Symptômes
                                  </h4>
                                  <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                    {clinicalData.symptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                              
                              {clinicalData.triggers && clinicalData.triggers.length > 0 && (
                                <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                  <h4 className="text-xs font-medium text-zinc-400 flex items-center mb-2">
                                    <AlertTriangle className="w-3 h-3 mr-1.5" /> Déclencheurs
                                  </h4>
                                  <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                    {clinicalData.triggers.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {clinicalData.defense_mechanisms && clinicalData.defense_mechanisms.length > 0 && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                <h4 className="text-xs font-medium text-zinc-400 flex items-center mb-2">
                                  <ShieldCheck className="w-3 h-3 mr-1.5" /> Mécanismes de défense / adaptation
                                </h4>
                                <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
                                  {clinicalData.defense_mechanisms.map((d: string, i: number) => <li key={i}>{d}</li>)}
                                </ul>
                              </div>
                            )}

                            {clinicalData.risk_assessment && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
                                <h4 className="text-xs font-medium text-zinc-400 flex items-center mb-2">
                                  <AlertTriangle className="w-3 h-3 mr-1.5 text-orange-400" /> Évaluation des risques
                                </h4>
                                <p className="text-sm text-zinc-300">{clinicalData.risk_assessment}</p>
                              </div>
                            )}

                            {clinicalData.recommended_therapy?.type && (
                              <div className="bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20 md:col-span-2">
                                <h4 className="text-xs font-medium text-indigo-400 flex items-center mb-2">
                                  <Compass className="w-3 h-3 mr-1.5" /> Recommandation Thérapeutique
                                </h4>
                                <p className="text-sm font-bold text-indigo-300">{clinicalData.recommended_therapy.type}</p>
                                <p className="text-sm text-indigo-200/80 mt-1 leading-relaxed">{clinicalData.recommended_therapy.reason}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Therapeutic Plan Section */}
                        {planData && planData.focus && (
                          <div className="pt-4 border-t border-zinc-800/50 space-y-4">
                            <h3 className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider mb-3 flex items-center">
                              <Target className="w-3 h-3 mr-1.5" />
                              Plan d'Action
                            </h3>
                            
                            <div className="bg-amber-500/5 rounded-lg p-4 border border-amber-500/10">
                              <h4 className="text-sm font-medium text-amber-400 mb-2">Objectif : {planData.focus}</h4>
                              
                              {planData.actions && planData.actions.length > 0 && (
                                <ul className="space-y-2 mt-3">
                                  {planData.actions.map((action: string, idx: number) => (
                                    <li key={idx} className="text-sm text-zinc-300 flex items-start">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0 mt-0.5" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {planData.hygiene_and_wellbeing && planData.hygiene_and_wellbeing.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-amber-500/10">
                                  <h4 className="text-xs font-semibold text-rose-400/80 uppercase tracking-wider mb-2 flex items-center">
                                    <Heart className="w-3 h-3 mr-1.5" />
                                    Hygiène Mentale & Bien-être
                                  </h4>
                                  <ul className="space-y-2">
                                    {planData.hygiene_and_wellbeing.map((item: string, idx: number) => (
                                      <li key={idx} className="text-sm text-zinc-300 flex items-start">
                                        <Sparkles className="w-4 h-4 text-rose-400 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {planData.adjustments && (
                                <div className="mt-4 pt-3 border-t border-amber-500/10">
                                  <p className="text-xs text-amber-500/70 uppercase tracking-wider mb-1">Ajustements</p>
                                  <p className="text-sm text-zinc-400">{planData.adjustments}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tree Modal */}
      {showTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-[95vw] h-[95vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-medium text-zinc-100 flex items-center">
                <Network className="w-5 h-5 mr-3 text-indigo-500" />
                Arbre Thérapeutique
              </h2>
              <button 
                onClick={() => setShowTree(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col space-y-8">
              {history.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">Aucun arbre disponible pour le moment.</p>
              ) : (
                <>
                  {/* Global Therapy Tree */}
                  {latestTreeData.nodes && latestTreeData.nodes.length > 0 ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center shrink-0">
                        <Network className="w-4 h-4 mr-2 text-emerald-500" />
                        Cartographie des Problèmes
                      </h3>
                      <div className="flex-1 min-h-0">
                        <TherapyTree data={latestTreeData} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-center py-8">L'arbre thérapeutique est en cours de construction.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Therapeutic Plan Modal */}
      {showPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-medium text-zinc-100 flex items-center">
                <ClipboardList className="w-5 h-5 mr-3 text-amber-500" />
                Plan Thérapeutique
              </h2>
              <button 
                onClick={() => setShowPlan(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {history.length === 0 || !latestPlanData || !latestPlanData.focus ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">Aucun plan thérapeutique n'a encore été généré.</p>
                  <p className="text-zinc-500 text-sm mt-2">Un plan sera proposé à la fin de votre prochaine séance.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider flex items-center mb-3 relative z-10">
                      <Target className="w-4 h-4 mr-2" /> Objectif Principal
                    </h3>
                    <p className="text-zinc-200 text-lg relative z-10 font-medium">
                      {latestPlanData.focus}
                    </p>
                  </div>

                  {latestPlanData.actions && latestPlanData.actions.length > 0 && (
                    <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center mb-4">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Actions & Exercices Recommandés
                      </h3>
                      <ul className="space-y-3">
                        {latestPlanData.actions.map((action: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-zinc-300 leading-relaxed">{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestPlanData.hygiene_and_wellbeing && latestPlanData.hygiene_and_wellbeing.length > 0 && (
                    <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center mb-4">
                        <Heart className="w-4 h-4 mr-2 text-rose-500" /> Hygiène Mentale & Bien-être
                      </h3>
                      <ul className="space-y-3">
                        {latestPlanData.hygiene_and_wellbeing.map((item: string, idx: number) => (
                          <li key={idx} className="flex items-start">
                            <Sparkles className="w-5 h-5 text-rose-400 mr-3 flex-shrink-0 mt-0.5" />
                            <span className="text-zinc-300 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {latestPlanData.adjustments && (
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center mb-3">
                        <Activity className="w-4 h-4 mr-2 text-blue-400" /> Ajustements & Remarques
                      </h3>
                      <p className="text-zinc-300 leading-relaxed">
                        {latestPlanData.adjustments}
                      </p>
                    </div>
                  )}

                  <div className="text-center mt-8">
                    <p className="text-xs text-zinc-500">
                      Ce plan sera évalué et ajusté avec vous lors de la prochaine séance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-medium text-zinc-100 flex items-center">
                <Settings className="w-5 h-5 mr-3 text-zinc-400" />
                Paramètres & Confidentialité
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
                        <div className="space-y-4">
                                      <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Préférences</p>
                                      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                                      <div className="flex items-center gap-3">
                                                                        <Volume2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                                        <div className="text-left">
                                                                                            <p className="text-sm font-medium text-zinc-200">Voix de l'assistant</p>
                                                                                            <p className="text-xs text-zinc-500">Choisissez la voix qui vous convient.</p>
                                                                                          </div>
                                                                      </div>
                                                      <select value={voiceName} onChange={(e) => { setVoiceName(e.target.value); localStorage.setItem('psychoia_voice', e.target.value); }} className="w-full sm:w-auto bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2">
                                                                        <option value="Zephyr">Zephyr </option>
                                                                        <option value="Kore">Kore </option>
                                                                        <option value="Puck">Puck </option>
                                                                        <option value="Charon">Charon </option>
                                                                        <option value="Fenrir">Fenrir </option>
                                                                      </select>
                                                    </div>
                                    </div>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Données Personnelles (RGPD)</h3>
                
                <button 
                  onClick={handleDownloadData}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-700/50 group"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100">Exporter mes données</p>
                      <p className="text-xs text-zinc-500">Télécharger tout l'historique de vos séances au format JSON.</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.")) {
                      handleDeleteAccount();
                    }
                  }}
                  disabled={isDeletingAccount}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-red-950/20 hover:bg-red-950/40 transition-colors border border-red-900/30 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    {isDeletingAccount ? <Loader2 className="w-5 h-5 text-red-500 animate-spin" /> : <Trash2 className="w-5 h-5 text-red-500" />}
                    <div className="text-left">
                      <p className="text-sm font-medium text-red-400 group-hover:text-red-300">Supprimer mon compte</p>
                      <p className="text-xs text-red-500/70">Effacer définitivement toutes vos données de nos serveurs.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800">
              <h2 className="text-2xl font-medium text-zinc-100 flex items-center">
                <ShieldCheck className="w-6 h-6 mr-3 text-emerald-500" />
                Consentement & Confidentialité
              </h2>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Pour utiliser PsychoIA, nous avons besoin de votre consentement explicite concernant le traitement de vos données. Nous prenons votre vie privée très au sérieux.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={consentTOS}
                        onChange={(e) => setConsentTOS(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedTOS(!expandedTOS)}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-200">Conditions Générales d'Utilisation</p>
                        {expandedTOS ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                      </div>
                      {expandedTOS && (
                        <div className="mt-3 text-xs text-zinc-400 space-y-3 pr-4 max-h-48 overflow-y-auto">
                          <p><strong>1. Nature du Service :</strong> PsychoIA est un outil expérimental d'accompagnement basé sur l'Intelligence Artificielle. Ce service <strong>N'EST PAS</strong> un dispositif médical, ne propose pas de télémédecine, et ne remplace en aucun cas une consultation, un diagnostic ou un traitement par un médecin, un psychiatre ou un psychologue diplômé.</p>
                          <p><strong>2. Urgences :</strong> PsychoIA n'est pas conçu pour gérer les crises ou les urgences. En cas de détresse psychologique aiguë, de pensées suicidaires ou d'urgence médicale, contactez immédiatement les secours (15, 112) ou le numéro national de prévention du suicide (3114 en France).</p>
                          <p><strong>3. Limites de l'IA :</strong> L'intelligence artificielle peut générer des réponses inexactes, inappropriées ou hors contexte (hallucinations). Vous acceptez de ne pas prendre de décisions médicales, financières, légales ou vitales sur la base des échanges avec cette IA.</p>
                          <p><strong>4. Responsabilité :</strong> L'éditeur de PsychoIA décline toute responsabilité quant aux conséquences directes ou indirectes liées à l'utilisation de l'application. L'utilisation se fait à vos propres risques et périls.</p>
                          <p><strong>5. Âge requis :</strong> L'utilisation de ce service est strictement réservée aux personnes majeures (18 ans et plus).</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-800/50 border border-zinc-700/50 overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={consentHealthData}
                        onChange={(e) => setConsentHealthData(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedHealth(!expandedHealth)}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-200">Traitement des Données Sensibles (RGPD)</p>
                        {expandedHealth ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                      </div>
                      {expandedHealth && (
                        <div className="mt-3 text-xs text-zinc-400 space-y-3 pr-4 max-h-48 overflow-y-auto">
                          <p><strong>1. Consentement Explicite (Art. 9 RGPD) :</strong> En cochant cette case, vous consentez expressément à la collecte et au traitement de données à caractère personnel pouvant révéler des informations sur votre santé physique ou mentale, dans le but exclusif de faire fonctionner l'assistant PsychoIA.</p>
                          <p><strong>2. Données collectées et Anonymisation :</strong> Nous traitons vos entrées vocales et textuelles. L'audio n'est pas conservé après transcription. L'IA génère une version anonymisée de vos échanges (suppression des noms, lieux, etc.) qui est la seule version sauvegardée dans votre historique. Nous vous recommandons néanmoins de ne pas partager d'informations d'identification directe (nom de famille, adresse exacte, numéro de sécurité sociale).</p>
                          <p><strong>3. Sous-traitants :</strong> Le traitement de vos requêtes implique l'utilisation de modèles de langage tiers (ex: Google). Vos données sont transmises de manière sécurisée et chiffrée pour générer les réponses, mais ne sont pas utilisées pour entraîner publiquement ces modèles.</p>
                          <p><strong>4. Vos Droits :</strong> Conformément à la réglementation, vous disposez d'un droit d'accès, de rectification, d'effacement (droit à l'oubli), de limitation et de portabilité de vos données. L'application intègre des fonctionnalités vous permettant d'exporter vos données (format JSON) ou de supprimer définitivement votre compte et l'intégralité de votre historique en un clic depuis les paramètres.</p>
                          <p><strong>5. Durée de conservation :</strong> Vos données sont conservées uniquement tant que votre compte est actif. La suppression de votre compte entraîne l'effacement immédiat et irréversible de vos données de nos serveurs.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Refuser et se déconnecter
              </button>
              <button 
                onClick={handleConsentSubmit}
                disabled={!consentTOS || !consentHealthData}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                J'accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
