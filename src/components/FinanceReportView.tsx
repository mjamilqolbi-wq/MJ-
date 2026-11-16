import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import type { CashflowEntry, Transaction } from '../types.ts';
import { formatDateTimeID, formatRupiah } from '../utils/format.ts';

interface FinanceReportViewProps {
  transactions: Transaction[];
  cashflowEntries: CashflowEntry[];
}

type PeriodFilter = 'today' | '7d' | '30d' | 'all';

export const FinanceReportView: React.FC<FinanceReportViewProps> = ({
  transactions,
  cashflowEntries,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('7d');

  const isInPeriod = (iso: string) => {
    if (period === 'all') return true;
    const d = new Date(iso);
    const now = new Date();
    if (period === 'today') {
      return d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    }
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return d >= cutoff;
  };

  const filteredTx = useMemo(
    () => transactions.filter((t) => isInPeriod(t.createdAt)),
    [transactions, period],
  );
  const filteredCashflow = useMemo(
    () => cashflowEntries.filter((c) => isInPeriod(c.createdAt)),
    [cashflowEntries, period],
  );

  const report = useMemo(() => {
    const grossSales = filteredTx.reduce((s, t) => s + t.subtotal, 0);
    const totalDiscounts = filteredTx.reduce(
      (s, t) => s + t.tierDiscountAmount + t.pointsDiscountAmount,
      0,
    );
    const netSales = filteredTx.reduce((s, t) => s + (t.total - t.taxAmount), 0);
    const totalTax = filteredTx.reduce((s, t) => s + t.taxAmount, 0);
    const cogs = filteredTx.reduce((s, t) => s + t.totalCost, 0);
    const grossProfit = netSales - cogs;
    const operatingExpenses = filteredCashflow
      .filter((c) => c.direction === 'OUT' && c.category === 'Operasional')
      .reduce((s, c) => s + c.amount, 0);
    const stockPurchases = filteredCashflow
      .filter((c) => c.direction === 'OUT' && c.category === 'Pembelian Stok')
      .reduce((s, c) => s + c.amount, 0);
    const netProfit = grossProfit - operatingExpenses;

    const totalCashIn = filteredCashflow
      .filter((c) => c.direction === 'IN')
      .reduce((s, c) => s + c.amount, 0);
    const totalCashOut = filteredCashflow
      .filter((c) => c.direction === 'OUT')
      .reduce((s, c) => s + c.amount, 0);

    return {
      grossSales,
      totalDiscounts,
      netSales,
      totalTax,
      cogs,
      grossProfit,
      grossMarginPct: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
      operatingExpenses,
      stockPurchases,
      netProfit,
      netMarginPct: netSales > 0 ? (netProfit / netSales) * 100 : 0,
      totalCashIn,
      totalCashOut,
      netCashflow: totalCashIn - totalCashOut,
    };
  }, [filteredTx, filteredCashflow]);

  const exportCsv = () => {
    const header = [
      'Waktu',
      'Referensi',
      'Rekening',
      'Arah',
      'Kategori',
      'Nominal (Rp)',
      'Status',
      'Keterangan',
    ];
    const rows = filteredCashflow.map((e) => [
      formatDateTimeID(e.createdAt),
      e.referenceNo,
      e.accountName,
      e.direction === 'IN' ? 'Kas Masuk' : 'Kas Keluar',
      e.category,
      String(e.direction === 'IN' ? e.amount : -e.amount),
      e.reconciliationStatus,
      `"${e.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Keuangan_KasirNusa_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Filter & Export */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Laporan Keuangan Real-Time
          </h2>
          <p className="text-xs text-slate-500">
            Laba rugi dan jurnal kas tersinkronisasi otomatis dari setiap transaksi kasir & restok
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: '7d', label: '7 Hari' },
                { id: '30d', label: '30 Hari' },
                { id: 'all', label: 'Semua' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === opt.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Unduh CSV
          </button>
        </div>
      </div>

      {/* Ringkasan Keuangan Utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Pendapatan Penjualan Bersih</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(report.netSales)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {filteredTx.length} transaksi · Diskon {formatRupiah(report.totalDiscounts)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Laba Kotor (Setelah HPP)</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {formatRupiah(report.grossProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Gross Margin {report.grossMarginPct.toFixed(1)}% · HPP {formatRupiah(report.cogs)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Beban Operasional</p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-red-600 tabular-nums">
            {formatRupiah(report.operatingExpenses)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Belanja Restok Stok: {formatRupiah(report.stockPurchases)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Laba Bersih Operasional</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
              report.netProfit >= 0 ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {formatRupiah(report.netProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Net Margin {report.netMarginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Laba Rugi Terstruktur & Jurnal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Ikhtisar Laba Rugi (Income Statement)
            </h3>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Penjualan Kotor</span>
              <span className="font-mono tabular-nums">{formatRupiah(report.grossSales)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Diskon Member & Penukaran Poin</span>
              <span className="font-mono tabular-nums">-{formatRupiah(report.totalDiscounts)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
              <span>Pendapatan Penjualan Bersih</span>
              <span className="font-mono tabular-nums">{formatRupiah(report.netSales)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Harga Pokok Penjualan (HPP)</span>
              <span className="font-mono tabular-nums">-{formatRupiah(report.cogs)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-emerald-700">
              <span>Laba Kotor (Gross Profit)</span>
              <span className="font-mono tabular-nums">{formatRupiah(report.grossProfit)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Biaya Operasional Kas</span>
              <span className="font-mono tabular-nums">-{formatRupiah(report.operatingExpenses)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-200 pt-3 text-sm font-bold text-slate-900">
              <span>Laba Bersih (Net Profit)</span>
              <span className="font-mono tabular-nums">{formatRupiah(report.netProfit)}</span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
            <p className="font-semibold text-slate-800">Ringkasan Arus Kas Periode Ini</p>
            <div className="mt-2.5 space-y-1.5 tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Total Kas Masuk</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{formatRupiah(report.totalCashIn)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Kas Keluar</span>
                <span className="font-mono font-semibold text-red-600">
                  -{formatRupiah(report.totalCashOut)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-semibold text-slate-900">
                <span>Surplus / Defisit Kas</span>
                <span className="font-mono">{formatRupiah(report.netCashflow)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Jurnal Keuangan Real-Time
            </h3>
            <p className="text-xs text-slate-500">
              Catatan otomatis dari penjualan POS, restok persediaan, dan pengeluaran operasional
            </p>
          </div>

          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2.5 font-medium">Waktu & Ref</th>
                  <th className="px-4 py-2.5 font-medium">Akun / Keterangan</th>
                  <th className="px-4 py-2.5 text-right font-medium">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCashflow.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-[11px] font-medium text-slate-900">
                        {entry.referenceNo}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        {formatDateTimeID(entry.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{entry.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {entry.category} · {entry.accountName}
                      </p>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        entry.direction === 'IN' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {entry.direction === 'IN' ? '+' : '-'}
                      {formatRupiah(entry.amount)}
                    </td>
                  </tr>
                ))}
                {filteredCashflow.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                      Belum ada entri jurnal pada rentang waktu ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
