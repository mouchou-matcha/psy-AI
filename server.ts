import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
const logFile = fs.createWriteStream('server.log', { flags: 'a' });
const originalConsoleLog = console.log;
console.log = function (...args) {
  logFile.write(args.join(' ') + '\n');
  originalConsoleLog.apply(console, args);
};
const originalConsoleError = console.error;
console.error = function (...args) {
  logFile.write('ERROR: ' + args.join(' ') + '\n');
  originalConsoleError.apply(console, args);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/config', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
  });

  app.post('/api/log', (req: any, res: any) => {
    // Keep log endpoint just to receive logs, but don't save to DB
    console.log('Client Log:', JSON.stringify(req.body));
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
