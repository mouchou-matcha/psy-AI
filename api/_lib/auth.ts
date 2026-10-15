/**
 * Utilitaires communs aux fonctions serveur.
 * La clé Gemini (GEMINI_API_KEY) n'existe QUE côté serveur, dans les variables
 * d'environnement Vercel. Elle n'est jamais renvoyée au navigateur.
 */
import { GoogleGenAI } from '@google/genai';

// Configuration publique du projet Firebase (identique à firebase-applet-config.json, non secrète).
const FIREBASE_API_KEY = 'AIzaSyA7uSpBM9O5lrs2lKru-LiIqNy5zVLVVnk';
const FIREBASE_PROJECT_ID = 'project-6e303031-13a5-4b6f-bd5';
const FIRESTORE_DATABASE_ID = 'ai-studio-f1d94d0f-7c6d-465b-b286-b5782c0121e4';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Enveloppe : gère les erreurs sans jamais exposer de détail interne. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error('[api]', err);
      return json({ error: 'Erreur interne du serveur.' }, 500);
    }
  };
}

export interface VerifiedUser {
  uid: string;
  idToken: string;
}

/** Vérifie le jeton de connexion Firebase envoyé par le navigateur (en-tête Authorization). */
export async function requireUser(req: Request): Promise<VerifiedUser> {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, 'Connexion requise.');
  const idToken = match[1];

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new HttpError(401, 'Session expirée, reconnectez-vous.');
  const data = (await res.json()) as { users?: { localId?: string; disabled?: boolean }[] };
  const user = data.users?.[0];
  if (!user?.localId || user.disabled) throw new HttpError(401, 'Session expirée, reconnectez-vous.');
  return { uid: user.localId, idToken };
}

/** Lit le profil Firestore de l'utilisateur (avec ses propres droits). */
export async function readUserProfile(user: VerifiedUser): Promise<{ hasConsented: boolean; availableTime: number | null }> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/users/${encodeURIComponent(user.uid)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${user.idToken}` } });
  if (res.status === 404) return { hasConsented: false, availableTime: null };
  if (!res.ok) throw new HttpError(503, 'Profil indisponible, réessayez.');
  const doc = (await res.json()) as { fields?: Record<string, any> };
  const f = doc.fields || {};
  const t = f.availableTime;
  const availableTime = t ? Number(t.integerValue ?? t.doubleValue) : null;
  return { hasConsented: f.hasConsented?.booleanValue === true, availableTime: Number.isFinite(availableTime) ? availableTime : null };
}

export function gemini(apiVersion?: string): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new HttpError(500, 'Configuration serveur incomplète.');
  return new GoogleGenAI({ apiKey, ...(apiVersion ? { httpOptions: { apiVersion } } : {}) });
}

/** Limitation simple du nombre d'appels par utilisateur (par instance de serveur). */
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, 'Trop de requêtes, patientez quelques minutes.');
  list.push(now);
  hits.set(key, list);
}

export async function readBody<T>(req: Request, maxBytes: number): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Requête trop volumineuse.');
  try {
    return JSON.parse(text || '{}') as T;
  } catch {
    throw new HttpError(400, 'Requête invalide.');
  }
}
