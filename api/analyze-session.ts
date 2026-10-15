/**
 * POST /api/analyze-session  { transcript, currentTree }
 * Produit côté serveur le résumé clinique, l'arbre, les notes et le plan d'une séance.
 * Le texte des consignes est fixé ici : le navigateur ne peut pas s'en servir comme
 * relais pour envoyer n'importe quelle requête à Gemini.
 */
import { gemini, handle, HttpError, json, rateLimit, readBody, requireUser } from './_lib/auth.js';

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  rateLimit(`analyze:${user.uid}`, 15, 60 * 60 * 1000);

  const body = await readBody<{ transcript?: unknown; currentTree?: unknown }>(req, 400_000);
  if (typeof body.transcript !== 'string' || !body.transcript.trim()) throw new HttpError(400, 'Transcription vide.');
  const transcript = body.transcript.slice(-150_000);
  const tree = body.currentTree && typeof body.currentTree === 'object' ? body.currentTree : { nodes: [], links: [] };
  const currentTree = JSON.stringify(tree).length < 100_000 ? tree : { nodes: [], links: [] };

  const response = await gemini().models.generateContent({
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
    config: { responseMimeType: 'application/json' },
  });

  let text = response.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (match) text = match[0];
  try {
    return json({ result: JSON.parse(text) });
  } catch {
    throw new HttpError(502, "L'analyse de la séance n'a pas abouti.");
  }
});
