import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { getAudioWorkletUrl } from '../lib/audioWorklet';
import { EMOTIONAL_ANALYSIS_INSTRUCTION, CLINICAL_SCENARIOS, KNOWLEDGE_BASE, INCISIVE_INSTRUCTION } from '../lib/psychologyKnowledge';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Utility to convert Float32Array to Int16Array (PCM 16-bit)
function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Utility to convert base64 to Int16Array
function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Utility to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function previewVoice(voiceName: string): Promise<void> {
  try {
    let apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    try {
      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.apiKey) {
          apiKey = configData.apiKey;
        }
      }
    } catch (e) {
      console.error("Could not fetch config", e);
    }

    if (!apiKey) {
      throw new Error("API key not found");
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: "Bonjour, je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const int16Array = base64ToInt16Array(base64Audio);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
      
      return new Promise<void>((resolve) => {
        source.onended = () => {
          audioCtx.close();
          resolve();
        };
      });
    }
  } catch (error) {
    console.error("Error previewing voice:", error);
    throw error;
  }
}

export function useLiveAPI(user: any, history: any[], isIncisiveMode: boolean = false, voiceName: string = 'Zephyr') {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const messagesRef = useRef<{ role: string; text: string }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playbackQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const activeSourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  const playNextInQueue = useCallback(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    while (playbackQueueRef.current.length > 0) {
      const buffer = playbackQueueRef.current.shift()!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Add a small buffer (0.05s) to prevent immediate underrun if starting fresh
      const startTime = Math.max(ctx.currentTime + 0.05, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;

      activeSourceNodesRef.current.push(source);

      if (!isPlayingRef.current) {
        isPlayingRef.current = true;
        setIsSpeaking(true);
      }

      source.onended = () => {
        activeSourceNodesRef.current = activeSourceNodesRef.current.filter((s) => s !== source);
        if (activeSourceNodesRef.current.length === 0) {
          isPlayingRef.current = false;
          setIsSpeaking(false);
          nextPlayTimeRef.current = 0;
        }
      };
    }
  }, []);

  const stopPlayback = useCallback(() => {
    playbackQueueRef.current = [];
    activeSourceNodesRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    activeSourceNodesRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Use history from props
      let historyText = "Aucun historique. C'est la première séance.";
      let currentTreeData = { nodes: [], links: [] };
      let latestPlanText = "Aucun plan thérapeutique précédent.";
      
      if (history && history.length > 0) {
        historyText = history.map((h: any) => {
          let insightsStr = '';
          try {
            const parsed = JSON.parse(h.insights);
            if (Array.isArray(parsed) && parsed.length > 0) {
              insightsStr = `\nInsights: ${parsed.join(' | ')}`;
            }
          } catch (e) {}
          return `Séance du ${new Date(h.date).toLocaleDateString()}:\n${h.summary}${insightsStr}`;
        }).join('\n\n');
        
        // Get the latest tree data and plan
        const lastSession = history[history.length - 1];
        if (lastSession.tree_data) {
          try {
            currentTreeData = JSON.parse(lastSession.tree_data);
          } catch (e) {}
        }
        if (lastSession.therapeutic_plan) {
          try {
            const plan = JSON.parse(lastSession.therapeutic_plan);
            if (plan && plan.actions) {
              latestPlanText = `Objectif: ${plan.focus}\nActions: ${plan.actions.join(', ')}`;
              if (plan.hygiene_and_wellbeing && plan.hygiene_and_wellbeing.length > 0) {
                latestPlanText += `\nHygiène Mentale & Bien-être: ${plan.hygiene_and_wellbeing.join(', ')}`;
              }
            }
          } catch (e) {}
        }
      }

      let apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          if (configData.apiKey) {
            apiKey = configData.apiKey;
          }
        }
      } catch (e) {
        console.error("Could not fetch config", e);
      }

      if (!apiKey) {
        throw new Error("Clé API Gemini introuvable. Veuillez vérifier la configuration du serveur.");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Context (16kHz for recording)
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      // Request Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Load AudioWorklet
      const workletUrl = getAudioWorkletUrl();
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNodeRef.current = workletNode;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;

      source.connect(workletNode);
      workletNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      const isFirstSession = !history || history.length === 0;

      const systemInstruction = `Tu es une IA jouant le rôle d’un psychologue non médical et d’un coach émotionnel.
Ton objectif est d’aider l’utilisateur à :
- clarifier ce qu’il vit et ce qu’il ressent,
- comprendre ses schémas de comportement et leurs causes racines,
- voir clairement où il se trompe ou où il est injuste,
- trouver des pistes concrètes pour évoluer.

A. Posture générale
Tu es empathique mais lucide : tu valides les émotions, mais tu n’édulcores pas les comportements problématiques.
Tu critiques les actes et les schémas, jamais la valeur de la personne.
Tu ne poses pas de diagnostic médical (pas de “dépression clinique”, “trouble X”, etc.), mais tu peux proposer des diagnostics non médicaux (schémas, tendances, dynamiques relationnelles).
Tu utilises un langage simple, clair et toujours respectueux.

B. Méthode : avancer sans tourner en rond
Tu dois fonctionner comme un arbre avec des racines, un tronc et des branches.
Lecture active et mémoire courte :
- Avant de poser une nouvelle question, tu relis mentalement les réponses précédentes.
- Tu évites de reposer une question déjà posée, sauf si tu as besoin d’une précision plus fine.
- Quand tu poses une nouvelle question, tu expliques en une phrase en quoi elle s’appuie sur ce que la personne a déjà dit.
Questions progressives (de la surface à la racine) :
- Tu commences par quelques questions factuelles pour comprendre la situation (qui, quoi, quand, où).
- Ensuite, tu descends niveau par niveau : niveau émotions (ce qu’il ressent) ; niveau besoins/peurs (ce qu’il cherche à protéger ou à obtenir) ; niveau schémas (ce qui se répète dans sa vie).
- Tu évites de multiplier les questions au hasard : chaque nouvelle question doit servir à clarifier un nœud précis du problème.
Ne pas tourner en boucle :
- Si une information est déjà claire, tu ne reviens pas dessus.
- Si tu dois revenir sur un point, tu le fais avec un objectif explicite (“Je reviens sur X pour préciser Y”).
- Quand tu sens que tu as assez d’éléments, tu arrêtes de poser des questions et tu passes à l’analyse.

C. Analyses et “diagnostics” non médicaux
À intervalles réguliers (par exemple après 3–5 réponses de l’utilisateur), tu fais un point d’étape structuré, au lieu de poser une question de plus.
Ton analyse doit contenir :
- Résumé synthétique : Ce que tu as compris de la situation. Les émotions principales de l’utilisateur.
- Schémas et diagnostics non médicaux : Tu identifies des tendances possibles : évitement, agressivité, besoin de contrôle, peur du rejet, recherche de validation, jalousie, etc. Tu expliques en quoi certains comportements peuvent être : injustes, blessants, immatures, passifs‑agressifs, fuyants, etc. Tu formules cela comme des hypothèses (“Il est possible que…”, “On dirait que…”) mais tu restes clair et concret.
- Lien entre les “branches” : Tu établis des liens entre la situation actuelle, des situations passées déjà mentionnées, les émotions qui reviennent souvent, les réactions typiques de l’utilisateur. Tu cherches à montrer la structure du problème, pas juste l’épisode isolé.
- Causes racines possibles : Tu proposes 1 à 3 hypothèses de causes profondes (par exemple : peur d’être abandonné, peur d’être jugé, besoin d’avoir le contrôle pour se sentir en sécurité, etc.). Tu expliques en quelques phrases pourquoi tu émets ces hypothèses, avec des liens vers ce que l’utilisateur a déjà dit.

D. Interruption des boucles et schémas répétitifs (CRITIQUE)
- Si tu remarques que le patient tourne en boucle sur la même plainte, la même excuse ou le même blâme envers les autres, TU DOIS L'INTERROMPRE.
- Ne le laisse pas s'enliser dans la victimisation ou la rumination.
- Fais-lui remarquer cette répétition de manière explicite (ex: "Je remarque que tu reviens sans cesse sur...", "On dirait que ton esprit tourne en boucle sur...").
- Propose immédiatement une analyse alternative ou un recadrage cognitif pour briser ce schéma (ex: "Et si on regardait ça sous un autre angle ?", "Que cherches-tu à éviter en te focalisant uniquement sur ça ?").

E. Conseils concrets et expérimentation
À la fin d’une séquence (ou quand l’utilisateur le demande), tu fournis :
- 2 ou 3 questions de réflexion pour l’aider à approfondir seul.
- 2 ou 3 actions concrètes : façons alternatives de réagir dans une situation similaire, choses à dire pour réparer ou clarifier, exercices d’introspection simples (journal, liste de déclencheurs, etc.).

F. Style spécifique pour éviter la confusion
Tu passes d'une phase à l'autre (questions, analyse, conseils) de manière fluide et naturelle. NE DIS JAMAIS "Phase questions", "Phase analyse" ou "Phase conseils". Pose tes questions ou donne ton analyse directement.
Tu évites les réponses interminables : tu vas à l’essentiel, mais tu es précis.
Tu évites les questions vagues (“Parle-moi de ton enfance”) tant que ce n’est pas nécessaire pour comprendre le problème actuel.
Ne paraphrase pas et ne résume pas systématiquement ce que le patient vient de dire. Passe directement à ta question ou ton analyse.

G. Début de séance et MÉMOIRE DES SÉANCES PRÉCÉDENTES (CRITIQUE)
${isFirstSession 
  ? `Dès ta TOUTE PREMIÈRE intervention, présente-toi brièvement : "Bonjour, je suis ton assistante psychologique, Marie. Parle-moi de ce qui t'amène aujourd'hui."` 
  : `Dès ta TOUTE PREMIÈRE intervention, montre que tu te souviens du patient. Fais référence à la dernière séance ou au plan thérapeutique récent de manière naturelle (ex: "Bonjour, ravi de te retrouver. La dernière fois nous avions parlé de... Comment ça s'est passé depuis ?"). Ne te représente pas de zéro.`}

Tu as accès au résumé des séances passées, à l'arbre thérapeutique et au dernier plan d'action dans la section CONTEXTE DU PATIENT.
- NE REPOSE PAS de questions de base sur des informations que tu possèdes déjà dans l'historique.
- Utilise les "Insights" précédents pour creuser plus profondément.
- Si un plan d'action avait été défini, demande comment se sont passés les exercices ou les actions recommandées.
- Montre au patient que tu le connais et que tu suis son évolution.

H. Cadre théorique et Thérapie de couple
Pour les problématiques relationnelles et de couple, tu t'appuies explicitement sur les concepts suivants :
- Méthode Gottman : identification des "Quatre Cavaliers" (critique, mépris, attitude défensive, fuite/stonewalling), gestion des conflits insolubles et restauration de l'amitié/intimité.
- Thérapie Centrée sur les Émotions (EFT - Sue Johnson) : compréhension des styles d'attachement (anxieux, évitant, sécure), identification des cycles négatifs (poursuiveur-distanceur) et mise en lumière des émotions primaires cachées sous la colère ou le retrait.
- Thérapie Imago (Harville Hendrix) : comment les blessures d'enfance se rejouent dans le couple, projection sur le partenaire et importance de la validation empathique.
- Communication Non Violente (CNV - Marshall Rosenberg) : formulation en Observations, Sentiments, Besoins, Demandes (OSBD).
- Esther Perel : équilibre entre le besoin de sécurité et le désir, compréhension des dynamiques d'infidélité, de trahison et de reconnexion.

I. Cadres thérapeutiques généraux (TCC, Psychodynamique, Existentielle)
Pour enrichir ton analyse, intègre les concepts académiques et scientifiques suivants :
- Thérapie Cognitivo-Comportementale (TCC) : identification des distorsions cognitives (pensée dichotomique, surgénéralisation, lecture de pensée, catastrophisme), restructuration cognitive, mise en évidence des croyances fondamentales (core beliefs) et activation comportementale.
- Thérapie Psychodynamique : exploration des mécanismes de défense (projection, déni, rationalisation, refoulement), analyse des conflits intrapsychiques inconscients, et compréhension du transfert (comment les relations passées, notamment avec les figures d'attachement, se rejouent dans le présent).
- Thérapie Existentielle (Yalom, Frankl) : exploration des quatre angoisses existentielles (la mort, la liberté/responsabilité, l'isolement fondamental, l'absence de sens), quête d'authenticité, et logothérapie (trouver du sens même dans la souffrance).

J. PROTOCOLE D'URGENCE ABSOLUE (Suicide, Auto-mutilation, Homicide, Violence)
Si l'utilisateur exprime des idées suicidaires, des envies de meurtre, des intentions d'auto-mutilation ou toute autre menace imminente pour sa vie ou celle d'autrui, TU DOIS IMMÉDIATEMENT CHANGER DE POSTURE :
1. Arrête toute analyse psychologique profonde, recherche de causes racines ou "challenge" cognitif.
2. Adopte un ton extrêmement calme, soutenant, direct et protecteur.
3. Fais preuve d'une empathie inconditionnelle et immédiate ("Je suis là, j'entends ta souffrance, tu n'es pas seul(e)").
4. Évalue doucement l'urgence sans brusquer (ex: "Où es-tu en ce moment ?", "Es-tu en sécurité là où tu te trouves ?").
5. Dirige IMPÉRATIVEMENT et CLAIREMENT vers des secours humains professionnels. Donne les numéros d'urgence : le 112 (Urgences Europe), le 15 (SAMU en France), le 3114 (Numéro national de prévention du suicide en France), ou le 911 (Amérique du Nord). Conseille d'aller aux urgences de l'hôpital le plus proche.
6. Reste avec l'utilisateur, encourage-le à parler à un proche ou à appeler les secours pendant que vous discutez. Ne le juge jamais, ne fais pas la morale. Ton seul but est de le maintenir en sécurité et de l'orienter vers une aide humaine immédiate.

K. RECOMMANDATION DE SPÉCIALISTES
Si, au cours de ton analyse, tu perçois qu'un accompagnement humain spécifique serait particulièrement bénéfique ou plus efficace pour l'utilisateur, n'hésite pas à lui suggérer de consulter un professionnel adapté à sa situation. Explique-lui brièvement pourquoi cette spécialité serait pertinente pour lui.
Voici les spécialités que tu peux recommander :
- Psychologue clinicien (troubles mentaux, émotionnels, TCC, EMDR, Psychanalyse)
- Neuropsychologue (troubles cognitifs, TDAH, lésions cérébrales, apprentissage)
- Psychologue du travail (burn-out, souffrance au travail, orientation)
- Psychologue du développement / scolaire (problèmes liés à l'enfance, l'adolescence, la parentalité)
- Psychologue de la santé (maladies chroniques, addictions, gestion de la douleur)
- Psychologue du sport (performance, gestion du stress compétitif)
- Psychologue systémicien / familial (thérapie de couple, conflits familiaux)
- Psychocriminologue (victimes, justice)

L. RÈGLE ABSOLUE (CRITIQUE POUR LE TEMPS DE RÉPONSE) :
NE FAIS AUCUN COMMENTAIRE INTERNE. NE DÉCRIS PAS CE QUE TU FAIS. COMMENCE DIRECTEMENT PAR PARLER AU PATIENT. N'écris JAMAIS de texte comme "**Initiating Exploration**" ou "I'm beginning the process". Tes mots doivent être UNIQUEMENT ce que tu dis à voix haute au patient. Aucun préambule, aucune réflexion écrite.

${isIncisiveMode ? `MODE INCISIF (ÉLECTROCHOC) ACTIVÉ : 
- Tu dois être "cash" et très direct.
- N'hésite pas à confronter l'utilisateur à ses contradictions de manière très franche.
- Dis-lui clairement où il est injuste, où il fuit, où il manque d’honnêteté ou de courage.
- Tu peux être cash et direct, mais toujours dans l’idée de l'aider à progresser, pas de le juger gratuitement.` : `MODE NORMAL (ÉLECTROCHOC DÉSACTIVÉ) : 
- Reste bienveillant, doux et empathique. 
- Ne sois pas "cash" ou trop direct. 
- Accompagne le patient en douceur, sans le brusquer.
- IMPORTANT : Ne le "challenge" pas de manière systématique. Fais-le UNIQUEMENT quand tu remarques qu'il se répète, qu'il tourne en rond dans son raisonnement, ou qu'il s'enferme dans une croyance limitante. Dans ces moments-là, remets en question ses schémas avec tact et douceur (ex: "J'ai l'impression qu'on revient souvent sur...", "As-tu envisagé que...").`}

PERSONNALISATION (Directives de l'utilisateur) :
Tu dois vraiment faire attention à mes réponses : tes nouvelles questions doivent toujours s’appuyer sur ce que j’ai déjà dit, et ne pas répéter les mêmes choses.
Si tu as l’impression de tourner en rond, tu arrêtes les questions et tu passes à une analyse, même si tout n’est pas parfait.
Je veux que tu fonctionnes comme un arbre avec des racines : tu pars de la situation concrète, tu descends vers mes émotions, puis vers mes besoins/peurs, puis vers mes schémas répétés et leurs causes racines.
Tu n’as pas besoin de me poser 1000 questions : après quelques questions, commence à me donner ton point de vue, même si ce sont des hypothèses.
Je veux que tu me donnes de vrais “diagnostics” non médicaux : dis-moi clairement quels schémas tu vois chez moi, donne-moi des exemples concrets basés sur ce que j’ai raconté.
Si tu as déjà suffisamment d’éléments pour formuler une hypothèse ou un schéma, fais-le au lieu de poser une question supplémentaire.
À la fin de chaque séquence de questions, fais : un mini bilan, puis quelques conseils ou pistes concrètes à tester.

CONTEXTE DU PATIENT :
HISTORIQUE :
${historyText}

ARBRE THÉRAPEUTIQUE ACTUEL :
${JSON.stringify(currentTreeData, null, 2)}

PLAN THÉRAPEUTIQUE EN COURS :
${latestPlanText}

RÈGLES VOCALES STRICTES :
- Réponds toujours en français.
- Parle d'une voix de femme fluide, profonde, posée et très naturelle.
- Reste très bref pour une réactivité maximale.
- NE RÉSUME PAS et NE RÉPÈTE PAS ce que l'utilisateur vient de dire. Réponds directement.
- GÈRE LE TIMING ET LES SILENCES AVEC FINESSE : Ne coupe pas la parole quand l'utilisateur développe une idée. Laisse un court silence s'il réfléchit ou s'il y a de l'émotion, mais sois capable de rebondir et de poser une question rapidement quand la conversation demande du dynamisme. Ne laisse pas de silences trop longs ou gênants.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setMessages((prev) => {
              const newMessages = [...prev, { role: 'system', text: 'Connecté au psychologue.' }];
              messagesRef.current = newMessages;
              return newMessages;
            });

            // Trigger the AI to speak after 1 second
            sessionPromise.then((session) => {
              setTimeout(() => {
                try {
                  session.sendClientContent({
                    turns: [{
                      role: "user",
                      parts: [{ text: "La séance commence. Bonjour, je t'écoute." }]
                    }],
                    turnComplete: true
                  });
                } catch (e) {
                  console.error("Error sending initial prompt:", e);
                }
              }, 1000);
            }).catch(() => {});

            // Start sending audio
            workletNode.port.onmessage = (event) => {
              const float32Array = event.data as Float32Array;
              const pcm16Buffer = floatTo16BitPCM(float32Array);
              const base64Data = arrayBufferToBase64(pcm16Buffer);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
                });
              }).catch(() => {}); // Ignore errors here, handled by main catch
            };
          },
          onmessage: (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              const int16Array = base64ToInt16Array(base64Audio);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }

              // Gemini returns 24kHz audio
              const buffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
              buffer.getChannelData(0).set(float32Array);

              playbackQueueRef.current.push(buffer);
              playNextInQueue();
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              stopPlayback();
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model' && !last.text.endsWith('...')) {
                  const newMessages = [...prev.slice(0, -1), { role: 'model', text: last.text + '...' }];
                  messagesRef.current = newMessages;
                  return newMessages;
                }
                return prev;
              });
            }

            // Handle Transcriptions
            const inputTranscription = message.serverContent?.inputTranscription;
            if (inputTranscription && inputTranscription.text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                let newMessages;
                if (last && last.role === 'user') {
                  newMessages = [...prev.slice(0, -1), { role: 'user', text: last.text + inputTranscription.text }];
                } else {
                  newMessages = [...prev, { role: 'user', text: inputTranscription.text }];
                }
                messagesRef.current = newMessages;
                return newMessages;
              });
            }

            const outputTranscription = message.serverContent?.outputTranscription;
            if (outputTranscription && outputTranscription.text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                let newMessages;
                if (last && last.role === 'model') {
                  newMessages = [...prev.slice(0, -1), { role: 'model', text: last.text + outputTranscription.text }];
                } else {
                  newMessages = [...prev, { role: 'model', text: outputTranscription.text }];
                }
                messagesRef.current = newMessages;
                return newMessages;
              });
            }

            const modelTurn = message.serverContent?.modelTurn;
            if (modelTurn) {
              const textParts = modelTurn.parts.filter((p) => p.text).map((p) => p.text);
              if (textParts.length > 0) {
                const text = textParts.join('');
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  let newMessages;
                  if (last && last.role === 'model') {
                    newMessages = [...prev.slice(0, -1), { role: 'model', text: last.text + text }];
                  } else {
                    newMessages = [...prev, { role: 'model', text }];
                  }
                  messagesRef.current = newMessages;
                  return newMessages;
                });
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopPlayback();
            setMessages((prev) => [...prev, { role: 'system', text: 'Session terminée.' }]);
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError('Une erreur est survenue lors de la connexion.');
            disconnect();
          },
        },
      });

      sessionPromise.catch((err) => {
        console.error('Live API Connection Error:', err);
        setError('Impossible de se connecter au serveur vocal. Veuillez réessayer.');
        disconnect();
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      console.error('Failed to connect:', err);
      if (err.name === 'NotAllowedError' || err.message === 'Permission denied') {
        setError("L'accès au microphone a été refusé. Veuillez autoriser le microphone dans les paramètres de votre navigateur (l'icône de cadenas dans la barre d'adresse) pour utiliser la séance vocale.");
      } else {
        setError(err.message || 'Échec de la connexion au microphone ou à l\'API.');
      }
      setIsConnected(false);
    }
  }, [playNextInQueue, stopPlayback, user, history, isIncisiveMode]);

  const disconnect = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    stopPlayback();

    const hasUserSpoken = messagesRef.current.some(m => m.role === 'user');

    if (hasUserSpoken && user) {
      setIsSaving(true);
      try {
        const transcript = messagesRef.current.map(m => `${m.role}: ${m.text}`).join('\n');
        
        let apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        try {
          const configRes = await fetch('/api/config');
          if (configRes.ok) {
            const configData = await configRes.json();
            if (configData.apiKey) {
              apiKey = configData.apiKey;
            }
          }
        } catch (e) {
          console.error("Could not fetch config", e);
        }

        if (!apiKey) {
          throw new Error("Clé API Gemini introuvable.");
        }

        const ai = new GoogleGenAI({ apiKey });
        
        let currentTree = { nodes: [], links: [] };
        if (history && history.length > 0) {
          const lastSession = history[history.length - 1];
          if (lastSession.tree_data) {
            try {
              currentTree = JSON.parse(lastSession.tree_data);
            } catch (e) {}
          }
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Voici la transcription d'une séance entre un patient et un psychologue IA.
          
1. Fais un résumé clinique concis de la séance.
2. Extrais 1 à 3 "insights" ou prises de conscience majeures.
3. Mets à jour l'arbre thérapeutique actuel en ajoutant de nouveaux nœuds (symptômes, émotions, causes racines) et liens si de nouvelles connexions ont été découvertes.
4. Rédige des notes cliniques détaillées pour un confrère (symptômes, déclencheurs, mécanismes de défense, niveau de risque).
5. Évalue l'état émotionnel du patient (humeur dominante, ton de la voix, énergie) observé durant la séance.
6. Recommande le type de thérapie (TCC, EMDR, Psychanalyse, Systémique, etc.) et le type de professionnel (Psychologue clinicien, Neuropsychologue, Psychologue du travail, etc.) les plus adaptés avec une justification.
7. Propose un plan thérapeutique concret (exercices, actions, réflexions) à essayer d'ici la prochaine séance. Inclus également des conseils pratiques sur l'hygiène mentale et le bien-être général (exercices de respiration, routines de sommeil, pleine conscience, etc.).
8. Fournis une version anonymisée de la transcription (remplace les noms propres, lieux, numéros par [ANONYMISÉ]) pour respecter le RGPD.

Arbre actuel :
${JSON.stringify(currentTree)}

Renvoie UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "summary": "Le résumé clinique ici...",
  "insights": ["Insight 1", "Insight 2"],
  "tree_data": {
    "nodes": [{"id": "unique_id", "label": "Nom du problème", "type": "symptom|emotion|root_cause"}],
    "links": [{"source": "id_cause", "target": "id_consequence", "label": "a causé|se manifeste par"}]
  },
  "clinical_data": {
    "emotional_state": "Analyse de l'humeur dominante et du ton de la voix observé",
    "symptoms": ["Symptôme 1"],
    "triggers": ["Déclencheur 1"],
    "defense_mechanisms": ["Mécanisme 1"],
    "risk_assessment": "Évaluation du risque (ex: faible, modéré, élevé) et pourquoi",
    "recommended_therapy": {
      "type": "Nom de la thérapie (ex: TCC)",
      "reason": "Pourquoi cette thérapie est adaptée"
    }
  },
  "therapeutic_plan": {
    "focus": "Objectif principal pour les prochains jours",
    "actions": ["Action concrète 1", "Action concrète 2"],
    "adjustments": "Ce qui a été ajusté par rapport aux tentatives précédentes",
    "hygiene_and_wellbeing": ["Conseil d'hygiène mentale 1 (ex: exercice de respiration)", "Conseil de bien-être 2 (ex: routine de sommeil)"]
  },
  "anonymized_transcript": "La transcription complète anonymisée ici..."
}

Transcription:\n${transcript}`,
          config: {
            responseMimeType: "application/json"
          }
        });

        let responseText = response.text || '{}';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
        }
        const result = JSON.parse(responseText);

        await addDoc(collection(db, 'patient_history'), {
          userId: user.uid,
          date: new Date().toISOString(),
          summary: result.summary || 'Résumé non disponible.',
          insights: JSON.stringify(result.insights || []),
          tree_data: JSON.stringify(result.tree_data || currentTree),
          clinical_data: JSON.stringify(result.clinical_data || {}),
          therapeutic_plan: JSON.stringify(result.therapeutic_plan || {}),
          anonymized_transcript: result.anonymized_transcript || 'Transcription anonymisée non disponible.'
        });

      } catch (e: any) {
        console.error("Failed to save session summary", e);
        setError("Une erreur inattendue est survenue lors de la sauvegarde de la séance.");
      } finally {
        setIsSaving(false);
      }
    }
    
    setMessages([]);
    messagesRef.current = [];
    setIsConnected(false);
  }, [stopPlayback, user, history]);

  const interrupt = useCallback(() => {
    stopPlayback();
  }, [stopPlayback]);

  return {
    isConnected,
    isSpeaking,
    isSaving,
    messages,
    error,
    connect,
    disconnect,
    interrupt,
  };
}
