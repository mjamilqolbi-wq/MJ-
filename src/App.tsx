import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  FileSpreadsheet,
  Landmark,
  Menu,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import type {
  BankProvider,
  CashflowEntry,
  PaymentMethod,
  Product,
  StoreSettings,
  StoreState,
  Transaction,
} from './types.ts';
import { PosTerminalView } from './components/PosTerminalView.tsx';
import { DashboardAnalyticsView } from './components/DashboardAnalyticsView.tsx';
import { InventoryView } from './components/InventoryView.tsx';
import { FinanceReportView } from './components/FinanceReportView.tsx';
import { BankingCashView } from './components/BankingCashView.tsx';
import { CustomersLoyaltyView } from './components/CustomersLoyaltyView.tsx';
import { LowStockDrawer } from './components/LowStockDrawer.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

type NavTab = 'pos' | 'analytics' | 'inventory' | 'finance' | 'banking' | 'customers';

const NAV_ITEMS: Array<{
  id: NavTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'pos', label: 'Kasir POS', icon: ShoppingCart },
  { id: 'analytics', label: 'Dasbor Analitik', icon: BarChart3 },
  { id: 'inventory', label: 'Stok & Barang', icon: Boxes },
  { id: 'finance', label: 'Laporan Keuangan', icon: FileSpreadsheet },
  { id: 'banking', label: 'Kas & Perbankan', icon: Landmark },
  { id: 'customers', label: 'Pelanggan & Member', icon: Users },
];

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
  }
  return data as T;
}

const LOCAL_CACHE_KEY = 'kasirnusa_store_v1';

export default function App() {
  const [store, setStoreState] = useState<StoreState | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLowStockDrawerOpen, setIsLowStockDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const setStore = (next: StoreState) => {
    setStoreState(next);
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  useEffect(() => {
    let active = true;
    let es: EventSource | null = null;

    const init = async () => {
      try {
        const health = await apiJson<{ ok: boolean; ephemeral: boolean }>('/api/health').catch(
          () => ({ ok: true, ephemeral: false }),
        );

        if (health.ephemeral) {
          const cachedRaw = localStorage.getItem(LOCAL_CACHE_KEY);
          if (cachedRaw) {
            try {
              const cached = JSON.parse(cachedRaw) as StoreState;
              const synced = await apiJson<StoreState>('/api/state/sync', {
                method: 'POST',
                body: JSON.stringify(cached),
              });
              if (active) setStore(synced);
              return;
            } catch {
              // Fall back to fresh server state
            }
          }
          const initial = await apiJson<StoreState>('/api/state');
          if (active) setStore(initial);
          return;
        }

        const initial = await apiJson<StoreState>('/api/state');
        if (active) setStore(initial);

        es = new EventSource('/api/events');
        es.addEventListener('store', (event) => {
          try {
            const nextState = JSON.parse((event as MessageEvent).data) as StoreState;
            if (active) setStore(nextState);
          } catch {
            // Ignore malformed frame
          }
        });
        es.onerror = () => {
          es?.close();
        };
      } catch (err) {
        console.error('Failed to load initial state:', err);
        const cachedRaw = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cachedRaw && active) {
          try {
            setStoreState(JSON.parse(cachedRaw) as StoreState);
          } catch {
            // Ignore
          }
        }
      }
    };

    init();

    return () => {
      active = false;
      es?.close();
    };
  }, []);

  const lowStockCount = useMemo(() => {
    if (!store) return 0;
    return store.products.filter((p) => p.stock <= p.minStock).length;
  }, [store]);

  const activeNavTitle = useMemo(
    () => NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Kasir POS',
    [activeTab],
  );

  const handleCheckout = async (payload: {
    items: Array<{ productId: string; qty: number }>;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
    cashReceived: number;
    customerId?: string;
    redeemPoints?: number;
  }): Promise<Transaction> => {
    const res = await apiJson<{ transaction: Transaction; state: StoreState }>(
      '/api/transactions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    setStore(res.state);
    showToast(`Transaksi ${res.transaction.receiptNo} berhasil dicatat.`);
    return res.transaction;
  };

  const handleCreateProduct = async (payload: Omit<Product, 'id' | 'updatedAt'>) => {
    const res = await apiJson<{ state: StoreState }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Barang baru berhasil ditambahkan.');
  };

  const handleUpdateProduct = async (id: string, payload: Partial<Omit<Product, 'id'>>) => {
    const res = await apiJson<{ state: StoreState }>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Data barang diperbarui.');
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await apiJson<{ state: StoreState }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
    setStore(res.state);
    showToast('Barang dihapus dari katalog.');
  };

  const handleRestockProduct = async (
    productId: string,
    payload: { qty: number; unitCost?: number; bankAccountId: string; note?: string },
  ) => {
    const res = await apiJson<{ state: StoreState }>(`/api/products/${productId}/restock`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Stok berhasil diisi ulang & kas tercatat otomatis.');
  };

  const handleCreateCustomer = async (payload: {
    name: string;
    phone: string;
    email: string;
    notes?: string;
  }) => {
    const res = await apiJson<{ state: StoreState }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Member baru terdaftar dengan bonus +50 poin.');
  };

  const handleGrantBonus = async (customerId: string, points: number, description: string) => {
    const res = await apiJson<{ state: StoreState }>(`/api/customers/${customerId}/bonus`, {
      method: 'POST',
      body: JSON.stringify({ points, description }),
    });
    setStore(res.state);
    showToast(`+${points} poin loyalitas berhasil dikirim.`);
  };

  const handleVerifyPin = async (pin: string) => {
    await apiJson('/api/security/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  };

  const handleLinkBank = async (payload: {
    provider: BankProvider;
    accountName: string;
    fullNumber: string;
    initialBalance: number;
    pin: string;
  }) => {
    const res = await apiJson<{ state: StoreState }>('/api/banking/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast(`Rekening ${payload.provider} berhasil dihubungkan.`);
  };

  const handleRecordCashflow = async (payload: {
    accountId: string;
    direction: 'IN' | 'OUT';
    category: CashflowEntry['category'];
    amount: number;
    description: string;
    pin?: string;
  }) => {
    const res = await apiJson<{ state: StoreState }>('/api/banking/cashflow', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Catatan arus kas berhasil disimpan.');
  };

  const handleTransferBetweenAccounts = async (payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
    pin: string;
  }) => {
    const res = await apiJson<{ state: StoreState }>('/api/banking/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setStore(res.state);
    showToast('Transfer & setor tunai antar rekening selesai.');
  };

  const handleReconcileEntry = async (entryId: string) => {
    const res = await apiJson<{ state: StoreState }>(
      `/api/banking/cashflow/${entryId}/reconcile`,
      { method: 'POST' },
    );
    setStore(res.state);
    showToast('Mutasi bank berhasil direkonsiliasi.');
  };

  const handleSyncAccount = async (accountId: string) => {
    const res = await apiJson<{ state: StoreState }>(
      `/api/banking/accounts/${accountId}/sync`,
      { method: 'POST' },
    );
    setStore(res.state);
    showToast('Saldo dan mutasi rekening bank tersinkronisasi.');
  };

  const handleUpdateSettings = async (next: Partial<StoreSettings>) => {
    const res = await apiJson<{ state: StoreState }>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(next),
    });
    setStore(res.state);
    showToast('Pengaturan outlet diperbarui.');
  };

  const openQuickRestock = (product: Product) => {
    setRestockTarget(product);
    setActiveTab('inventory');
  };

  if (!store) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <aside className="hidden w-64 border-r border-slate-200 bg-white lg:block" />
        <div className="flex-1 p-8">
          <div className="h-10 w-64 rounded-lg bg-slate-200/70" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="h-28 rounded-xl bg-slate-200/60" />
            <div className="h-28 rounded-xl bg-slate-200/60" />
            <div className="h-28 rounded-xl bg-slate-200/60" />
            <div className="h-28 rounded-xl bg-slate-200/60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Backdrop Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigasi */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            KasirNusa
          </span>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveTab(id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  {label}
                </span>
                {id === 'inventory' && lowStockCount > 0 && (
                  <span className="font-mono text-xs font-bold text-amber-700 tabular-nums">
                    {lowStockCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-xs font-semibold text-slate-900">
              {store.settings.storeName}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              Kasir: {store.settings.cashierName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            Pengaturan Outlet & PIN
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 truncate text-sm">
              <span className="hidden text-slate-400 sm:inline">{store.settings.storeName}</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="truncate font-display font-semibold text-slate-900">
                {activeNavTitle}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsLowStockDrawerOpen(true)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                lowStockCount > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bell className={`h-3.5 w-3.5 ${lowStockCount > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
              <span>
                {lowStockCount > 0 ? `${lowStockCount} Stok Menipis` : 'Stok Aman'}
              </span>
            </button>

            {activeTab !== 'pos' && (
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Buka Kasir
              </button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'pos' && (
            <PosTerminalView
              products={store.products}
              customers={store.customers}
              bankAccounts={store.bankAccounts}
              settings={store.settings}
              onCheckout={handleCheckout}
              onOpenNewCustomer={() => {
                setActiveTab('customers');
                setIsAddCustomerOpen(true);
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <DashboardAnalyticsView
              transactions={store.transactions}
              products={store.products}
              bankAccounts={store.bankAccounts}
              cashflowEntries={store.cashflowEntries}
              onQuickRestock={openQuickRestock}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={store.products}
              stockMovements={store.stockMovements}
              bankAccounts={store.bankAccounts}
              restockTarget={restockTarget}
              onClearRestockTarget={() => setRestockTarget(null)}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onRestockProduct={handleRestockProduct}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceReportView
              transactions={store.transactions}
              cashflowEntries={store.cashflowEntries}
            />
          )}

          {activeTab === 'banking' && (
            <BankingCashView
              bankAccounts={store.bankAccounts}
              cashflowEntries={store.cashflowEntries}
              onVerifyPin={handleVerifyPin}
              onLinkBank={handleLinkBank}
              onRecordCashflow={handleRecordCashflow}
              onTransferBetweenAccounts={handleTransferBetweenAccounts}
              onReconcileEntry={handleReconcileEntry}
              onSyncAccount={handleSyncAccount}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersLoyaltyView
              customers={store.customers}
              loyaltyLogs={store.loyaltyLogs}
              transactions={store.transactions}
              settings={store.settings}
              isAddModalOpen={isAddCustomerOpen}
              onOpenAddModal={() => setIsAddCustomerOpen(true)}
              onCloseAddModal={() => setIsAddCustomerOpen(false)}
              onCreateCustomer={handleCreateCustomer}
              onGrantBonus={handleGrantBonus}
            />
          )}
        </main>
      </div>

      {/* Drawers & Modals */}
      <LowStockDrawer
        isOpen={isLowStockDrawerOpen}
        products={store.products}
        onClose={() => setIsLowStockDrawerOpen(false)}
        onQuickRestock={openQuickRestock}
        onGoToInventory={() => setActiveTab('inventory')}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={store.settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleUpdateSettings}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
