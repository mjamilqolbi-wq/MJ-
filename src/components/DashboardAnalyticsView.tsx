import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  PackagePlus,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { BankAccount, CashflowEntry, Product, Transaction } from '../types.ts';
import {
  formatCompactRupiah,
  formatDateShortID,
  formatRupiah,
  formatTimeID,
} from '../utils/format.ts';

interface DashboardAnalyticsViewProps {
  transactions: Transaction[];
  products: Product[];
  bankAccounts: BankAccount[];
  cashflowEntries: CashflowEntry[];
  onQuickRestock: (product: Product) => void;
  onNavigate: (tab: 'pos' | 'inventory' | 'finance' | 'banking' | 'customers') => void;
}

export const DashboardAnalyticsView: React.FC<DashboardAnalyticsViewProps> = ({
  transactions,
  products,
  bankAccounts,
  onQuickRestock,
  onNavigate,
}) => {
  const [chartMode, setChartMode] = useState<'7d' | 'today'>('7d');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);

  const todayTx = useMemo(
    () => transactions.filter((t) => t.createdAt.slice(0, 10) === todayKey),
    [transactions, todayKey],
  );
  const yesterdayTx = useMemo(
    () => transactions.filter((t) => t.createdAt.slice(0, 10) === yesterdayKey),
    [transactions, yesterdayKey],
  );

  const todayRevenue = todayTx.reduce((s, t) => s + t.total, 0);
  const yesterdayRevenue = yesterdayTx.reduce((s, t) => s + t.total, 0);
  const revenueDeltaPct =
    yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 100;

  const todayProfit = todayTx.reduce((s, t) => s + t.grossProfit, 0);
  const avgBasket = todayTx.length > 0 ? Math.round(todayRevenue / todayTx.length) : 0;
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock),
    [products],
  );

  const totalCashAndBank = bankAccounts.reduce((s, b) => s + b.balance, 0);

  // Chart series: 7 days or Today hourly
  const chartData = useMemo(() => {
    if (chartMode === '7d') {
      const days: Array<{ label: string; revenue: number; profit: number; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayTx = transactions.filter((t) => t.createdAt.slice(0, 10) === key);
        days.push({
          label: i === 0 ? 'Hari Ini' : formatDateShortID(d.toISOString()),
          revenue: dayTx.reduce((s, t) => s + t.total, 0),
          profit: dayTx.reduce((s, t) => s + t.grossProfit, 0),
          count: dayTx.length,
        });
      }
      return days;
    } else {
      const buckets: Array<{ label: string; revenue: number; profit: number; count: number }> = [];
      const hours = [8, 10, 12, 14, 16, 18, 20];
      for (const h of hours) {
        const bucketTx = todayTx.filter((t) => {
          const hr = new Date(t.createdAt).getHours();
          return hr >= h && hr < h + 2;
        });
        buckets.push({
          label: `${String(h).padStart(2, '0')}:00`,
          revenue: bucketTx.reduce((s, t) => s + t.total, 0),
          profit: bucketTx.reduce((s, t) => s + t.grossProfit, 0),
          count: bucketTx.length,
        });
      }
      return buckets;
    }
  }, [chartMode, transactions, todayTx]);

  const maxChartValue = Math.max(
    100000,
    ...chartData.map((d) => d.revenue),
  );

  // Payment method distribution (all recent or today)
  const paymentBreakdown = useMemo(() => {
    const source = todayTx.length > 0 ? todayTx : transactions;
    const total = source.reduce((s, t) => s + t.total, 0) || 1;
    const groups = ['QRIS', 'Tunai', 'Transfer Bank', 'Debit'] as const;
    return groups.map((method) => {
      const sum = source
        .filter((t) => t.paymentMethod === method)
        .reduce((s, t) => s + t.total, 0);
      return {
        method,
        amount: sum,
        percent: Math.round((sum / total) * 100),
      };
    });
  }, [todayTx, transactions]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
    for (const tx of transactions) {
      for (const item of tx.items) {
        const prev = map.get(item.productId) || {
          name: item.name,
          sku: item.sku,
          qty: 0,
          revenue: 0,
        };
        prev.qty += item.qty;
        prev.revenue += item.subtotal;
        map.set(item.productId, prev);
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [transactions]);

  const memberTxCount = todayTx.filter((t) => Boolean(t.customerId)).length;
  const memberSharePct =
    todayTx.length > 0 ? Math.round((memberTxCount / todayTx.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Penjualan Hari Ini</span>
            <TrendingUp className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(todayRevenue)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            <span className={revenueDeltaPct >= 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>
              {revenueDeltaPct >= 0 ? '+' : ''}
              {revenueDeltaPct.toFixed(1)}%
            </span>{' '}
            dibanding kemarin · {todayTx.length} transaksi
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Laba Kotor Hari Ini</span>
            <BarChart3 className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(todayProfit)}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            Margin{' '}
            <span className="font-semibold text-slate-900">
              {todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : '0.0'}%
            </span>{' '}
            · Rata-rata {formatRupiah(avgBasket)}/struk
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Saldo Kas & Bank</span>
            <CreditCard className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalCashAndBank)}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('banking')}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Pantau {bankAccounts.length} rekening terhubung
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Retensi Member & Stok</span>
            <Users className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {memberSharePct}% Transaksi Member
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            <span className={lowStockProducts.length > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
              {lowStockProducts.length} barang stok menipis
            </span>{' '}
            perlu perhatian
          </p>
        </div>
      </div>

      {/* Grafik Analitik & Metode Pembayaran */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Analitik Penjualan & Laba Kotor
              </h2>
              <p className="text-xs text-slate-500">
                Grafik perbandingan omzet kotor dan laba produk secara real-time
              </p>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setChartMode('7d')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMode === '7d' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => setChartMode('today')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartMode === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini (Per Jam)
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-700" />
                Omzet Penjualan
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-300" />
                Laba Kotor
              </span>
            </div>

            <div className="relative mt-4 h-64 w-full">
              <div className="flex h-full items-end gap-3 border-b border-slate-200 pb-7 pt-4">
                {chartData.map((bar, idx) => {
                  const revHeightPct = Math.max(4, Math.round((bar.revenue / maxChartValue) * 100));
                  const profitHeightPct = Math.max(2, Math.round((bar.profit / maxChartValue) * 100));
                  const isHovered = hoveredIdx === idx;

                  return (
                    <div
                      key={bar.label}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      {isHovered && (
                        <div className="absolute -top-2 z-10 w-44 -translate-y-full rounded-lg border border-slate-200 bg-slate-900 p-2.5 text-xs text-white shadow-sm">
                          <p className="font-semibold">{bar.label}</p>
                          <p className="mt-1 flex justify-between font-mono tabular-nums">
                            <span className="text-slate-300">Omzet:</span>
                            <span>{formatCompactRupiah(bar.revenue)}</span>
                          </p>
                          <p className="flex justify-between font-mono tabular-nums">
                            <span className="text-slate-300">Laba:</span>
                            <span className="text-emerald-300">{formatCompactRupiah(bar.profit)}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {bar.count} transaksi
                          </p>
                        </div>
                      )}

                      <div className="flex h-full w-full max-w-14 items-end justify-center gap-1">
                        <div
                          style={{ height: `${bar.revenue === 0 ? 3 : revHeightPct}%` }}
                          className={`w-1/2 rounded-t transition-colors ${
                            bar.revenue === 0
                              ? 'bg-slate-100'
                              : isHovered
                                ? 'bg-emerald-800'
                                : 'bg-emerald-700'
                          }`}
                        />
                        <div
                          style={{ height: `${bar.profit === 0 ? 2 : profitHeightPct}%` }}
                          className={`w-1/2 rounded-t transition-colors ${
                            bar.profit === 0 ? 'bg-slate-100' : 'bg-emerald-300'
                          }`}
                        />
                      </div>

                      <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-medium text-slate-500">
                        {bar.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Komposisi Metode Pembayaran */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Aliran Metode Pembayaran
          </h2>
          <p className="text-xs text-slate-500">
            Distribusi kas masuk dari terminal kasir
          </p>

          <div className="mt-6 space-y-4">
            {paymentBreakdown.map((item) => (
              <div key={item.method}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{item.method}</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {formatRupiah(item.amount)} · {item.percent}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${item.percent}%` }}
                    className="h-full rounded-full bg-emerald-700 transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-800">Transaksi Terakhir Hari Ini</h3>
            <div className="mt-2.5 space-y-2">
              {todayTx.slice(0, 3).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="font-mono font-medium text-slate-900">{tx.receiptNo}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-500">{formatTimeID(tx.createdAt)}</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-600">{tx.paymentMethod}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(tx.total)}
                  </span>
                </div>
              ))}
              {todayTx.length === 0 && (
                <p className="text-xs text-slate-400">Belum ada transaksi hari ini.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Baris Bawah: Produk Terlaris & Peringatan Stok Menipis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Produk Terlaris
              </h2>
              <p className="text-xs text-slate-500">Kontributor omzet tertinggi</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Buka Kasir
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 font-medium">Barang</th>
                  <th className="py-2.5 text-right font-medium">Terjual</th>
                  <th className="py-2.5 text-right font-medium">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <tr key={p.sku} className="hover:bg-slate-50">
                    <td className="py-2.5">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{p.sku}</p>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                      {p.qty}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatRupiah(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Peringatan Stok Menipis
                </h2>
                <p className="text-xs text-slate-500">
                  Barang di bawah ambang minimum stok
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Kelola Stok
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {lowStockProducts.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                Seluruh stok produk masih di atas batas minimum.
              </p>
            ) : (
              lowStockProducts.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs tabular-nums text-slate-500">
                      <span className={item.stock === 0 ? 'font-semibold text-red-600' : 'font-semibold text-amber-700'}>
                        {item.stock === 0 ? 'Stok Habis (0)' : `Sisa ${item.stock} ${item.unit}`}
                      </span>
                      {' / '}
                      Min. {item.minStock} {item.unit}
                      {' · '}
                      {item.supplier}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onQuickRestock(item)}
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Restok
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
