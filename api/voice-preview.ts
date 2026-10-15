/**
 * POST /api/voice-preview  { voice }
 * Génère côté serveur un court extrait audio de la voix choisie.
 */
import { Modality } from '@google/genai';
import { gemini, handle, HttpError, json, rateLimit, readBody, requireUser } from './_lib/auth.js';

const VOICES = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  rateLimit(`voice:${user.uid}`, 20, 60 * 60 * 1000);
  const { voice } = await readBody<{ voice?: string }>(req, 1000);
  if (!voice || !VOICES.includes(voice)) throw new HttpError(400, 'Voix inconnue.');

  const response = await gemini().models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: "Bonjour, je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?",
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audio) throw new HttpError(502, "Aperçu vocal indisponible.");
  return json({ audio });
});
