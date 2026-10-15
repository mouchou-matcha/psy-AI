/**
 * POST /api/gemini-token
 * Délivre un jeton Gemini TEMPORAIRE (usage unique, 30 min max) à un utilisateur connecté
 * qui a encore du temps de séance. La vraie clé API reste sur le serveur.
 */
import { gemini, handle, HttpError, json, rateLimit, readUserProfile, requireUser } from './_lib/auth.js';

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  rateLimit(`token:${user.uid}`, 30, 60 * 60 * 1000);

  const profile = await readUserProfile(user);
  if (!profile.hasConsented) throw new HttpError(403, 'Consentement requis avant la première séance.');
  if (profile.availableTime !== null && profile.availableTime <= 0) throw new HttpError(402, 'Votre crédit de temps est épuisé.');

  const now = Date.now();
  const token = await gemini('v1alpha').authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
      httpOptions: { apiVersion: 'v1alpha' },
    },
  });
  if (!token?.name) throw new HttpError(502, 'Impossible de démarrer la séance, réessayez.');
  return json({ token: token.name });
});
