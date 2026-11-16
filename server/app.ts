import express from 'express';
import { IS_EPHEMERAL, storeManager } from './store.ts';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ephemeral: IS_EPHEMERAL });
  });

  app.get('/api/state', (_req, res) => {
    res.json(storeManager.getState());
  });

  app.post('/api/state/sync', (req, res) => {
    try {
      const nextState = storeManager.replaceState(req.body);
      res.json(nextState);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyinkronkan data.' });
    }
  });

  app.post('/api/security/verify-pin', (req, res) => {
    const { pin } = req.body as { pin?: string };
    if (!pin || !storeManager.verifyPin(pin)) {
      res.status(403).json({ ok: false, error: 'PIN keamanan tidak valid.' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/transactions', (req, res) => {
    try {
      const tx = storeManager.createTransaction(req.body);
      res.status(201).json({ transaction: tx, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memproses transaksi.' });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const product = storeManager.createProduct(req.body);
      res.status(201).json({ product, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menambah barang.' });
    }
  });

  app.patch('/api/products/:id', (req, res) => {
    try {
      const product = storeManager.updateProduct(req.params.id, req.body);
      res.json({ product, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui barang.' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      storeManager.deleteProduct(req.params.id);
      res.json({ ok: true, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghapus barang.' });
    }
  });

  app.post('/api/products/:id/restock', (req, res) => {
    try {
      const product = storeManager.restockProduct(req.params.id, req.body);
      res.json({ product, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal melakukan restok.' });
    }
  });

  app.post('/api/customers', (req, res) => {
    try {
      const customer = storeManager.createCustomer(req.body);
      res.status(201).json({ customer, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal mendaftarkan pelanggan.' });
    }
  });

  app.post('/api/customers/:id/bonus', (req, res) => {
    try {
      const { points, description } = req.body as { points: number; description: string };
      const customer = storeManager.grantLoyaltyBonus(req.params.id, points, description);
      res.json({ customer, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal mengirim bonus poin.' });
    }
  });

  app.post('/api/banking/accounts', (req, res) => {
    try {
      const account = storeManager.linkBankAccount(req.body);
      res.status(201).json({ account, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menghubungkan rekening bank.' });
    }
  });

  app.post('/api/banking/accounts/:id/sync', (req, res) => {
    try {
      const account = storeManager.syncBankAccount(req.params.id);
      res.json({ account, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal menyinkronkan mutasi.' });
    }
  });

  app.post('/api/banking/cashflow', (req, res) => {
    try {
      const entry = storeManager.recordCashflow(req.body);
      res.status(201).json({ entry, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal mencatat arus kas.' });
    }
  });

  app.post('/api/banking/transfer', (req, res) => {
    try {
      storeManager.transferBetweenAccounts(req.body);
      res.status(201).json({ ok: true, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memproses transfer dana.' });
    }
  });

  app.post('/api/banking/cashflow/:id/reconcile', (req, res) => {
    try {
      const entry = storeManager.reconcileCashflowEntry(req.params.id);
      res.json({ entry, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal merekonsiliasi mutasi.' });
    }
  });

  app.patch('/api/settings', (req, res) => {
    try {
      const settings = storeManager.updateSettings(req.body);
      res.json({ settings, state: storeManager.getState() });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui pengaturan.' });
    }
  });

  return app;
}
