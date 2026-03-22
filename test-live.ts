import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'test' });
const session = ai.live.connect({ model: 'test' });
session.then(s => {
  try {
    s.sendClientContent({ turns: "La séance commence." });
    console.log("sendClientContent ok");
  } catch (e) {
    console.error(e);
  }
});
