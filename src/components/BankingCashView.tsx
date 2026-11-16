import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import type { BankAccount, BankProvider, CashflowEntry } from '../types.ts';
import { formatDateTimeID, formatRupiah } from '../utils/format.ts';
import { PinPromptModal } from './PinPromptModal.tsx';

interface BankingCashViewProps {
  bankAccounts: BankAccount[];
  cashflowEntries: CashflowEntry[];
  onVerifyPin: (pin: string) => Promise<void>;
  onLinkBank: (payload: {
    provider: BankProvider;
    accountName: string;
    fullNumber: string;
    initialBalance: number;
    pin: string;
  }) => Promise<void>;
  onRecordCashflow: (payload: {
    accountId: string;
    direction: 'IN' | 'OUT';
    category: CashflowEntry['category'];
    amount: number;
    description: string;
    pin?: string;
  }) => Promise<void>;
  onTransferBetweenAccounts: (payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
    pin: string;
  }) => Promise<void>;
  onReconcileEntry: (entryId: string) => Promise<void>;
  onSyncAccount: (accountId: string) => Promise<void>;
}

const BANK_PROVIDERS: BankProvider[] = [
  'BCA Bisnis',
  'Mandiri Kopra',
  'BRI Qlola',
  'BNI Direct',
  'BSI Net',
];

export const BankingCashView: React.FC<BankingCashViewProps> = ({
  bankAccounts,
  cashflowEntries,
  onVerifyPin,
  onLinkBank,
  onRecordCashflow,
  onTransferBetweenAccounts,
  onReconcileEntry,
  onSyncAccount,
}) => {
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [pinTargetAccount, setPinTargetAccount] = useState<BankAccount | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modals
  const [isLinkBankOpen, setIsLinkBankOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [linkForm, setLinkForm] = useState({
    provider: 'BRI Qlola' as BankProvider,
    accountName: 'PT KasirNusa Retailindo',
    fullNumber: '',
    initialBalance: 5000000,
    pin: '',
  });

  const [cashForm, setCashForm] = useState({
    accountId: bankAccounts[0]?.id || '',
    direction: 'OUT' as 'IN' | 'OUT',
    category: 'Operasional' as CashflowEntry['category'],
    amount: 150000,
    description: '',
    pin: '',
  });

  const [transferForm, setTransferForm] = useState({
    fromAccountId: bankAccounts[0]?.id || '',
    toAccountId: bankAccounts[1]?.id || bankAccounts[0]?.id || '',
    amount: 1000000,
    note: 'Setor tunai harian ke rekening bank',
    pin: '',
  });

  const totalLiquidity = useMemo(
    () => bankAccounts.reduce((s, b) => s + b.balance, 0),
    [bankAccounts],
  );
  const totalIn = useMemo(
    () => cashflowEntries.filter((e) => e.direction === 'IN').reduce((s, e) => s + e.amount, 0),
    [cashflowEntries],
  );
  const totalOut = useMemo(
    () => cashflowEntries.filter((e) => e.direction === 'OUT').reduce((s, e) => s + e.amount, 0),
    [cashflowEntries],
  );
  const pendingCount = useMemo(
    () => cashflowEntries.filter((e) => e.reconciliationStatus === 'Menunggu Cek').length,
    [cashflowEntries],
  );

  const filteredEntries = useMemo(() => {
    return cashflowEntries.filter((e) => {
      const matchAcc = accountFilter === 'all' || e.accountId === accountFilter;
      const matchDir = directionFilter === 'ALL' || e.direction === directionFilter;
      return matchAcc && matchDir;
    });
  }, [cashflowEntries, accountFilter, directionFilter]);

  const handleRevealClick = (acc: BankAccount) => {
    if (revealedIds[acc.id]) {
      setRevealedIds((prev) => ({ ...prev, [acc.id]: false }));
      return;
    }
    setPinTargetAccount(acc);
  };

  const handleSync = async (accId: string) => {
    setSyncingId(accId);
    try {
      await onSyncAccount(accId);
    } finally {
      setSyncingId(null);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await onLinkBank(linkForm);
      setIsLinkBankOpen(false);
      setLinkForm({ ...linkForm, fullNumber: '', pin: '' });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal menghubungkan rekening.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await onRecordCashflow({
        ...cashForm,
        accountId: cashForm.accountId || bankAccounts[0]?.id || '',
      });
      setIsCashModalOpen(false);
      setCashForm({ ...cashForm, description: '', pin: '' });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal mencatat arus kas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await onTransferBetweenAccounts({
        ...transferForm,
        fromAccountId: transferForm.fromAccountId || bankAccounts[0]?.id || '',
        toAccountId: transferForm.toAccountId || bankAccounts[1]?.id || '',
      });
      setIsTransferOpen(false);
      setTransferForm({ ...transferForm, pin: '' });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Gagal memproses transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Keamanan & Aksi */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Integrasi Perbankan & Pengawasan Kas Aman
            </h2>
            <p className="text-xs text-slate-500">
              Nomor rekening terenkripsi dan dilindungi otorisasi PIN untuk setiap pengeluaran & setor tunai
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setIsTransferOpen(true);
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Setor Tunai / Transfer
          </button>
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setIsCashModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Wallet className="h-3.5 w-3.5" />
            Catat Kas Masuk/Keluar
          </button>
          <button
            type="button"
            onClick={() => {
              setModalError('');
              setIsLinkBankOpen(true);
            }}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Hubungkan Bank
          </button>
        </div>
      </div>

      {/* Ringkasan Likuiditas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Likuiditas Kas & Bank</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalLiquidity)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Akumulasi Kas Masuk</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            +{formatRupiah(totalIn)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Akumulasi Kas Keluar</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums">
            -{formatRupiah(totalOut)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Rekonsiliasi Tertunda</p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              pendingCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {pendingCount} mutasi
          </p>
        </div>
      </div>

      {/* Rekening Bank & Brankas Kas Terhubung */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {bankAccounts.map((acc) => {
          const isRevealed = Boolean(revealedIds[acc.id]);
          return (
            <div
              key={acc.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      {acc.isCashVault ? (
                        <Wallet className="h-4 w-4" />
                      ) : (
                        <Landmark className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        {acc.provider}
                      </h3>
                      <p className="text-xs text-slate-500">{acc.accountName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-700">
                    {acc.connectionStatus}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="font-mono text-xs font-medium text-slate-700 tabular-nums">
                    {isRevealed ? acc.fullNumber : acc.maskedNumber}
                  </span>
                  {!acc.isCashVault && (
                    <button
                      type="button"
                      onClick={() => handleRevealClick(acc)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Sembunyikan
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Buka (PIN)
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-4 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {formatRupiah(acc.balance)}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                <span>{acc.encryptionStandard}</span>
                <button
                  type="button"
                  onClick={() => handleSync(acc.id)}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${syncingId === acc.id ? 'animate-spin' : ''}`}
                  />
                  Sinkronkan
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buku Mutasi Kas & Rekening */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Mutasi Kas Masuk & Keluar
            </h3>
            <p className="text-xs text-slate-500">
              Pemantauan real-time arus kas operasional & settlement rekening bank
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="all">Semua Rekening & Kas</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.provider} ({acc.maskedNumber})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'ALL', label: 'Semua' },
                  { id: 'IN', label: 'Kas Masuk' },
                  { id: 'OUT', label: 'Kas Keluar' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDirectionFilter(opt.id)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                    directionFilter === opt.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-4 py-3 font-medium">Waktu & Ref</th>
                <th className="px-4 py-3 font-medium">Rekening</th>
                <th className="px-4 py-3 font-medium">Kategori & Keterangan</th>
                <th className="px-4 py-3 text-right font-medium">Nominal</th>
                <th className="px-4 py-3 font-medium">Rekonsiliasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-[11px] font-medium text-slate-900">
                      {entry.referenceNo}
                    </p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      {formatDateTimeID(entry.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{entry.accountName}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{entry.description}</p>
                    <p className="text-[11px] text-slate-500">{entry.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        entry.direction === 'IN' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {entry.direction === 'IN' ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                      {entry.direction === 'IN' ? '+' : '-'}
                      {formatRupiah(entry.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {entry.reconciliationStatus === 'Terekonsiliasi' ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terekonsiliasi
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReconcileEntry(entry.id)}
                        className="whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Verifikasi Mutasi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal PIN untuk Buka Nomor Rekening */}
      <PinPromptModal
        isOpen={Boolean(pinTargetAccount)}
        title={`Tampilkan Nomor Rekening ${pinTargetAccount?.provider || ''}`}
        description="Masukkan PIN keamanan outlet untuk membuka nomor rekening penuh yang terhubung melalui enkripsi SNAP BI."
        onClose={() => setPinTargetAccount(null)}
        onConfirm={async (pin) => {
          await onVerifyPin(pin);
          if (pinTargetAccount) {
            setRevealedIds((prev) => ({ ...prev, [pinTargetAccount.id]: true }));
          }
        }}
      />

      {/* Modal Hubungkan Rekening Bank Baru */}
      {isLinkBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-700" />
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Hubungkan Rekening Bank (SNAP BI)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkBankOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Bank Penyedia</label>
                <select
                  value={linkForm.provider}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, provider: e.target.value as BankProvider })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {BANK_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nama Pemilik Rekening</label>
                <input
                  type="text"
                  required
                  value={linkForm.accountName}
                  onChange={(e) => setLinkForm({ ...linkForm, accountName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={linkForm.fullNumber}
                    onChange={(e) => setLinkForm({ ...linkForm, fullNumber: e.target.value })}
                    placeholder="0091 8821 4410"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Saldo Awal (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={linkForm.initialBalance}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, initialBalance: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  PIN Keamanan Otorisasi (standar: 123456)
                </label>
                <input
                  type="password"
                  required
                  value={linkForm.pin}
                  onChange={(e) => setLinkForm({ ...linkForm, pin: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm tracking-widest text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkBankOpen(false)}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Menghubungkan...' : 'Hubungkan Rekening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Kas Masuk / Keluar */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Catat Kas Masuk / Keluar
              </h3>
              <button
                type="button"
                onClick={() => setIsCashModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCashSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCashForm({ ...cashForm, direction: 'IN', category: 'Modal & Lainnya' })}
                  className={`rounded-md py-1.5 text-xs font-semibold ${
                    cashForm.direction === 'IN' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Kas Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setCashForm({ ...cashForm, direction: 'OUT', category: 'Operasional' })}
                  className={`rounded-md py-1.5 text-xs font-semibold ${
                    cashForm.direction === 'OUT' ? 'bg-white text-red-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Kas Keluar
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Rekening / Kas</label>
                <select
                  value={cashForm.accountId || bankAccounts[0]?.id || ''}
                  onChange={(e) => setCashForm({ ...cashForm, accountId: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.provider} ({acc.maskedNumber}) · {formatRupiah(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Kategori</label>
                  <select
                    value={cashForm.category}
                    onChange={(e) =>
                      setCashForm({
                        ...cashForm,
                        category: e.target.value as CashflowEntry['category'],
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Operasional">Operasional</option>
                    <option value="Pembelian Stok">Pembelian Stok</option>
                    <option value="Modal & Lainnya">Modal & Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Nominal (Rp)</label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={cashForm.amount}
                    onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Keterangan Transaksi</label>
                <input
                  type="text"
                  required
                  value={cashForm.description}
                  onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                  placeholder="Contoh: Bayar tagihan air & kebersihan"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {cashForm.direction === 'OUT' && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    PIN Keamanan (wajib untuk kas keluar · standar: 123456)
                  </label>
                  <input
                    type="password"
                    required
                    value={cashForm.pin}
                    onChange={(e) => setCashForm({ ...cashForm, pin: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm tracking-widest text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(false)}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Catatan Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Setor Tunai / Transfer Antar Rekening */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Setor Tunai / Transfer Antar Rekening
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Dari Rekening / Kas</label>
                <select
                  value={transferForm.fromAccountId || bankAccounts[0]?.id || ''}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, fromAccountId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.provider} ({formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Ke Rekening Tujuan</label>
                <select
                  value={transferForm.toAccountId || bankAccounts[1]?.id || ''}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, toAccountId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.provider} ({acc.maskedNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nominal Transfer (Rp)</label>
                <input
                  type="number"
                  min={1000}
                  required
                  value={transferForm.amount}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, amount: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Catatan</label>
                <input
                  type="text"
                  required
                  value={transferForm.note}
                  onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  PIN Keamanan Otorisasi (standar: 123456)
                </label>
                <input
                  type="password"
                  required
                  value={transferForm.pin}
                  onChange={(e) => setTransferForm({ ...transferForm, pin: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm tracking-widest text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {modalError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Eksekusi Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
