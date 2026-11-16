import React, { useMemo, useState } from 'react';
import {
  Award,
  Copy,
  Gift,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  Customer,
  LoyaltyLog,
  LoyaltyTier,
  StoreSettings,
  Transaction,
} from '../types.ts';
import {
  formatDateTimeID,
  formatRupiah,
  getNextTierInfo,
  getTierDiscountPercent,
} from '../utils/format.ts';

interface CustomersLoyaltyViewProps {
  customers: Customer[];
  loyaltyLogs: LoyaltyLog[];
  transactions: Transaction[];
  settings: StoreSettings;
  isAddModalOpen: boolean;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onCreateCustomer: (payload: {
    name: string;
    phone: string;
    email: string;
    notes?: string;
  }) => Promise<void>;
  onGrantBonus: (customerId: string, points: number, description: string) => Promise<void>;
}

const TIERS: Array<'Semua' | LoyaltyTier> = ['Semua', 'Platinum', 'Gold', 'Silver', 'Reguler'];

export const CustomersLoyaltyView: React.FC<CustomersLoyaltyViewProps> = ({
  customers,
  loyaltyLogs,
  transactions,
  settings,
  isAddModalOpen,
  onOpenAddModal,
  onCloseAddModal,
  onCreateCustomer,
  onGrantBonus,
}) => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'Semua' | LoyaltyTier>('Semua');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [bonusPoints, setBonusPoints] = useState(50);
  const [bonusDesc, setBonusDesc] = useState('Voucher retensi belanja berikutnya');
  const [copiedPromo, setCopiedPromo] = useState(false);

  const [newForm, setNewForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const totalPointsPool = useMemo(
    () => customers.reduce((s, c) => s + c.points, 0),
    [customers],
  );
  const totalMemberSpend = useMemo(
    () => customers.reduce((s, c) => s + c.totalSpend, 0),
    [customers],
  );
  const retentionRiskCount = useMemo(() => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    return customers.filter((c) => new Date(c.lastVisitAt).getTime() < tenDaysAgo).length;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchTier = tierFilter === 'Semua' || c.tier === tierFilter;
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.memberCode.toLowerCase().includes(q);
      return matchTier && matchSearch;
    });
  }, [customers, search, tierFilter]);

  const selectedCustomerRecord = useMemo(
    () => customers.find((c) => c.id === selectedCustomer?.id) || selectedCustomer,
    [customers, selectedCustomer],
  );

  const customerTransactions = useMemo(() => {
    if (!selectedCustomerRecord) return [];
    return transactions.filter((t) => t.customerId === selectedCustomerRecord.id);
  }, [transactions, selectedCustomerRecord]);

  const customerLogs = useMemo(() => {
    if (!selectedCustomerRecord) return [];
    return loyaltyLogs.filter((l) => l.customerId === selectedCustomerRecord.id);
  }, [loyaltyLogs, selectedCustomerRecord]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateCustomer(newForm);
      setNewForm({ name: '', phone: '', email: '', notes: '' });
      onCloseAddModal();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerRecord) return;
    setSubmitting(true);
    try {
      await onGrantBonus(selectedCustomerRecord.id, bonusPoints, bonusDesc);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRetentionMessage = (c: Customer) => {
    const msg = `Halo Kak ${c.name}, terima kasih telah menjadi member ${c.tier} di ${settings.storeName}! Poin loyalitas Anda saat ini ${c.points} poin (senilai ${formatRupiah(c.points * settings.pointValueRupiah)}) + nikmati diskon ${getTierDiscountPercent(c.tier)}% di kunjungan berikutnya.`;
    navigator.clipboard.writeText(msg);
    setCopiedPromo(true);
    setTimeout(() => setCopiedPromo(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Ringkasan Loyalitas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Member Terdaftar</span>
            <Users className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {customers.length} member
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {customers.filter((c) => c.tier === 'Platinum' || c.tier === 'Gold').length} member Gold & Platinum
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Akumulasi Belanja Member</span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalMemberSpend)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            1 poin tiap belanja {formatRupiah(settings.pointsPerAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Poin Aktif Member</span>
            <Gift className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {totalPointsPool.toLocaleString('id-ID')} poin
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Setara nilai tukar {formatRupiah(totalPointsPool * settings.pointValueRupiah)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Perlu Follow-Up Retensi (&gt;10 Hari)</p>
          <p
            className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
              retentionRiskCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {retentionRiskCount} member
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Kirim bonus poin atau pesan promo personal
          </p>
        </div>
      </div>

      {/* Panduan Skema Tier Member */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        {(
          [
            { tier: 'Reguler', rule: 'Mulai Rp 0', benefit: '1 poin / Rp 10 rb' },
            { tier: 'Silver', rule: 'Belanja >= Rp 1,5 jt', benefit: 'Diskon 3% otomatis' },
            { tier: 'Gold', rule: 'Belanja >= Rp 5 jt', benefit: 'Diskon 5% otomatis' },
            { tier: 'Platinum', rule: 'Belanja >= Rp 15 jt', benefit: 'Diskon 8% otomatis' },
          ] as const
        ).map((item) => (
          <div key={item.tier} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
            <p className="font-display text-xs font-bold text-slate-900">Tier {item.tier}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{item.rule}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">{item.benefit}</p>
          </div>
        ))}
      </div>

      {/* Tabel Pelanggan & Loyalitas */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, telepon, kode member..."
                className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTierFilter(tier)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                    tierFilter === tier
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Daftar Member Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                <th className="px-4 py-3 font-medium">Pelanggan</th>
                <th className="px-4 py-3 font-medium">Tier & Progres</th>
                <th className="px-4 py-3 text-right font-medium">Kunjungan</th>
                <th className="px-4 py-3 text-right font-medium">Total Belanja</th>
                <th className="px-4 py-3 text-right font-medium">Poin</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const tierProgress = getNextTierInfo(c.tier, c.totalSpend);
                const daysSinceVisit = Math.floor(
                  (Date.now() - new Date(c.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24),
                );

                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {c.memberCode} · {c.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {c.tier} ({getTierDiscountPercent(c.tier)}%)
                        </span>
                        {tierProgress.nextTier && (
                          <span className="text-slate-400">
                            Menuju {tierProgress.nextTier}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100">
                        <div
                          style={{ width: `${tierProgress.progressPercent}%` }}
                          className="h-full rounded-full bg-emerald-700"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <p className="font-mono font-medium text-slate-900">{c.visitCount}× transaksi</p>
                      <p
                        className={`text-[11px] ${
                          daysSinceVisit > 10 ? 'font-semibold text-amber-700' : 'text-slate-500'
                        }`}
                      >
                        {daysSinceVisit === 0 ? 'Hari ini' : `${daysSinceVisit} hari lalu`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                      {formatRupiah(c.totalSpend)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                      {c.points}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(c)}
                        className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Detail & Retensi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Member & Kampanye Retensi */}
      {selectedCustomerRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-xs text-slate-500">
                  {selectedCustomerRecord.memberCode} · Tier {selectedCustomerRecord.tier}
                </p>
                <h3 className="mt-0.5 font-display text-lg font-bold text-slate-900">
                  {selectedCustomerRecord.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCustomerRecord.phone} · {selectedCustomerRecord.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <p className="text-slate-500">Total Belanja</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatRupiah(selectedCustomerRecord.totalSpend)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Poin Aktif</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  {selectedCustomerRecord.points} poin
                </p>
              </div>
              <div>
                <p className="text-slate-500">Diskon Member</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {getTierDiscountPercent(selectedCustomerRecord.tier)}% otomatis
                </p>
              </div>
            </div>

            {/* Kirim Bonus Poin & Pesan Retensi */}
            <div className="mt-5 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-semibold text-slate-900">
                  Program Retensi & Bonus Poin Member
                </h4>
                <button
                  type="button"
                  onClick={() => copyRetentionMessage(selectedCustomerRecord)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedPromo ? 'Pesan WA Tersalin!' : 'Salin Pesan Promo WA'}
                </button>
              </div>

              <form onSubmit={handleSendBonus} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={bonusPoints}
                  onChange={(e) => setBonusPoints(Number(e.target.value))}
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={bonusDesc}
                  onChange={(e) => setBonusDesc(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Kirim Poin
                </button>
              </form>
            </div>

            {/* Riwayat Poin & Transaksi */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">Riwayat Transaksi Member</h4>
                <div className="mt-2 max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {customerTransactions.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">Belum ada transaksi.</p>
                  ) : (
                    customerTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <div>
                          <p className="font-mono font-medium text-slate-900">{tx.receiptNo}</p>
                          <p className="text-[11px] text-slate-500">{formatDateTimeID(tx.createdAt)}</p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatRupiah(tx.total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-800">Log Poin Loyalitas</h4>
                <div className="mt-2 max-h-44 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {customerLogs.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400">Belum ada aktivitas poin.</p>
                  ) : (
                    customerLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{log.description}</p>
                          <p className="text-[11px] text-slate-400">{formatDateTimeID(log.createdAt)}</p>
                        </div>
                        <span
                          className={`shrink-0 font-mono font-semibold tabular-nums ${
                            log.pointsDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {log.pointsDelta >= 0 ? `+${log.pointsDelta}` : log.pointsDelta}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pelanggan Member Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Pendaftaran Member Loyalitas Baru
              </h3>
              <button
                type="button"
                onClick={onCloseAddModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="Contoh: Tari Saraswati"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    required
                    value={newForm.phone}
                    onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={newForm.email}
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                    placeholder="nama@email.id"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Catatan Preferensi</label>
                <input
                  type="text"
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="Opsional (minuman favorit, alergi, dll.)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Member baru otomatis mendapatkan <strong>+50 Poin Selamat Datang</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Mendaftarkan...' : 'Daftarkan Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
