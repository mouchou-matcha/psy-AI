import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const apiKey = process.env.GEMINI_API_KEY;

async function run() {
  const ai = new GoogleGenAI({ apiKey });
  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
    },
    callbacks: {
      onopen: () => {
        console.log("Connected");
        sessionPromise.then(s => {
          setTimeout(() => {
            console.log("Sending text...");
            s.sendRealtimeInput([{ text: "Bonjour" }]);
          }, 1000);
        });
      },
      onmessage: (msg) => {
        console.log("Message received", Object.keys(msg));
        if (msg.serverContent?.modelTurn) {
          console.log("Got model turn!");
        }
      },
      onerror: (err) => console.error(err),
      onclose: () => console.log("Closed")
    }
  });
}
run();
