import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';
import { storeManager } from './server/store.ts';

const PORT = 3000;

async function startServer() {
  const app = createApiApp();

  // Real-time Server-Sent Events stream for persistent Node/Express environments
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendState = () => {
      res.write(`event: store\ndata: ${JSON.stringify(storeManager.getState())}\n\n`);
    };

    sendState();
    const unsubscribe = storeManager.subscribe(() => {
      sendState();
    });

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KasirNusa server listening on http://localhost:${PORT}`);
  });
}

startServer();
