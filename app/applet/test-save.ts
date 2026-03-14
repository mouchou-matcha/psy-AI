import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function test() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Voici la transcription des réponses d'un psychologue IA lors d'une séance (les paroles du patient sont déduites des réponses).
      
1. Fais un résumé clinique concis de la séance.
2. Extrais 1 à 3 "insights" ou prises de conscience majeures.
3. Mets à jour l'arbre thérapeutique actuel en ajoutant de nouveaux nœuds (symptômes, émotions, causes racines) et liens si de nouvelles connexions ont été découvertes.
4. Rédige des notes cliniques détaillées pour un confrère (symptômes, déclencheurs, mécanismes de défense, niveau de risque).
5. Évalue l'état émotionnel du patient (humeur dominante, ton de la voix, énergie) observé durant la séance.
6. Recommande le type de thérapie le plus adapté (TCC, EMDR, Psychanalyse, Systémique, etc.) avec une justification.
7. Propose un plan thérapeutique concret (exercices, actions, réflexions) à essayer d'ici la prochaine séance. N'hésite pas à y inclure des sessions de méditation ou de pleine conscience pour éclaircir l'esprit dans les moments de troubles ou pour la gestion des émotions.

Arbre actuel :
{"nodes":[],"links":[]}

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
    "adjustments": "Ce qui a été ajusté par rapport aux tentatives précédentes"
  }
}

Transcription:
system: Connecté au psychologue.
model: Bonjour, je vous écoute. Comment vous sentez-vous aujourd'hui ?`,
      config: {
        responseMimeType: "application/json"
      }
    });
    console.log(response.text);
  } catch (e) {
    console.error(e);
  }
}
test();
