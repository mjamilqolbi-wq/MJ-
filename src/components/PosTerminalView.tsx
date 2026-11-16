import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Copy,
  CreditCard,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  BankAccount,
  Customer,
  PaymentMethod,
  Product,
  ProductCategory,
  StoreSettings,
  Transaction,
} from '../types.ts';
import {
  formatDateTimeID,
  formatRupiah,
  getTierDiscountPercent,
} from '../utils/format.ts';

interface CartItem {
  product: Product;
  qty: number;
}

interface PosTerminalViewProps {
  products: Product[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  settings: StoreSettings;
  onCheckout: (payload: {
    items: Array<{ productId: string; qty: number }>;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
    cashReceived: number;
    customerId?: string;
    redeemPoints?: number;
  }) => Promise<Transaction>;
  onOpenNewCustomer: () => void;
}

const CATEGORIES: Array<'Semua' | ProductCategory> = [
  'Semua',
  'Minuman',
  'Roti & Kue',
  'Bahan & Ritel',
  'Merchandise',
];

const ProductThumb: React.FC<{ product: Product }> = ({ product }) => {
  const [failed, setFailed] = useState(false);

  if (!product.imageUrl || failed) {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Package className="h-7 w-7" />
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-28 w-full rounded-lg object-cover bg-slate-100"
    />
  );
};

export const PosTerminalView: React.FC<PosTerminalViewProps> = ({
  products,
  customers,
  bankAccounts,
  settings,
  onCheckout,
  onOpenNewCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | ProductCategory>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [redeemPointsEnabled, setRedeemPointsEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const cashVault = useMemo(
    () => bankAccounts.find((b) => b.isCashVault) || bankAccounts[0],
    [bankAccounts],
  );
  const linkedBanks = useMemo(
    () => bankAccounts.filter((b) => !b.isCashVault),
    [bankAccounts],
  );

  const effectiveBankId = useMemo(() => {
    if (paymentMethod === 'Tunai') {
      return cashVault?.id || '';
    }
    if (selectedBankId && linkedBanks.some((b) => b.id === selectedBankId)) {
      return selectedBankId;
    }
    return linkedBanks[0]?.id || bankAccounts[0]?.id || '';
  }, [paymentMethod, selectedBankId, cashVault, linkedBanks, bankAccounts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, search, selectedCategory]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sellPrice * item.qty, 0),
    [cart],
  );

  const tierDiscountPct = selectedCustomer ? getTierDiscountPercent(selectedCustomer.tier) : 0;
  const tierDiscountAmount = Math.round((subtotal * tierDiscountPct) / 100);

  const maxRedeemablePoints = useMemo(() => {
    if (!selectedCustomer || !redeemPointsEnabled) return 0;
    const afterTier = Math.max(0, subtotal - tierDiscountAmount);
    const maxByTotal = Math.floor(afterTier / Math.max(1, settings.pointValueRupiah));
    return Math.min(selectedCustomer.points, maxByTotal);
  }, [selectedCustomer, redeemPointsEnabled, subtotal, tierDiscountAmount, settings.pointValueRupiah]);

  const pointsDiscountAmount = maxRedeemablePoints * settings.pointValueRupiah;
  const afterDiscounts = Math.max(0, subtotal - tierDiscountAmount - pointsDiscountAmount);
  const taxAmount = Math.round((afterDiscounts * settings.taxRatePercent) / 100);
  const grandTotal = afterDiscounts + taxAmount;

  const cashReceivedNum = Number(cashReceivedInput.replace(/[^0-9]/g, '')) || 0;
  const changeAmount = paymentMethod === 'Tunai' ? Math.max(0, cashReceivedNum - grandTotal) : 0;

  const addToCart = (product: Product) => {
    setError('');
    if (product.stock <= 0) {
      setError(`Stok ${product.name} sedang habis.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          setError(`Maksimal stok tersedia untuk ${product.name} adalah ${product.stock} ${product.unit}.`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setError('');
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.qty + delta;
          if (nextQty > item.product.stock) {
            setError(`Stok ${item.product.name} tersisa ${item.product.stock} ${item.product.unit}.`);
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((item) => item.qty > 0),
    );
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) {
      setError('Tambahkan minimal satu barang ke keranjang.');
      return;
    }
    if (paymentMethod === 'Tunai' && cashReceivedNum < grandTotal) {
      setError('Nominal uang tunai belum mencukupi total tagihan.');
      return;
    }

    setError('');
    setProcessing(true);
    try {
      const tx = await onCheckout({
        items: cart.map((c) => ({ productId: c.product.id, qty: c.qty })),
        paymentMethod,
        bankAccountId: effectiveBankId,
        cashReceived: paymentMethod === 'Tunai' ? cashReceivedNum : grandTotal,
        customerId: selectedCustomer?.id,
        redeemPoints: redeemPointsEnabled ? maxRedeemablePoints : 0,
      });
      setCompletedTx(tx);
      setCart([]);
      setSelectedCustomerId('');
      setRedeemPointsEnabled(false);
      setCashReceivedInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses transaksi.');
    } finally {
      setProcessing(false);
    }
  };

  const copyReceiptText = () => {
    if (!completedTx) return;
    const lines = [
      `*${settings.storeName}*`,
      `No. Struk: ${completedTx.receiptNo}`,
      `Tanggal: ${formatDateTimeID(completedTx.createdAt)}`,
      completedTx.customerName ? `Member: ${completedTx.customerName} (${completedTx.customerTier})` : '',
      '---',
      ...completedTx.items.map((i) => `${i.name} x${i.qty} = ${formatRupiah(i.subtotal)}`),
      '---',
      `Total: ${formatRupiah(completedTx.total)}`,
      `Pembayaran: ${completedTx.paymentMethod}`,
      completedTx.pointsEarned > 0 ? `Poin Didapat: +${completedTx.pointsEarned} poin` : '',
      'Terima kasih telah berbelanja!',
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(lines);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      {/* Kiri: Katalog Produk Kasir */}
      <div className="space-y-5 lg:col-span-7 xl:col-span-8">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang atau pindai kode SKU..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const inCartQty = cart.find((c) => c.product.id === product.id)?.qty || 0;
            const remainingStock = product.stock - inCartQty;
            const isOut = product.stock === 0;
            const isLow = product.stock > 0 && product.stock <= product.minStock;

            return (
              <button
                key={product.id}
                type="button"
                disabled={isOut}
                onClick={() => addToCart(product)}
                className={`group flex flex-col justify-between rounded-xl border bg-white p-3.5 text-left transition-colors ${
                  isOut
                    ? 'cursor-not-allowed border-slate-200 opacity-60'
                    : inCartQty > 0
                      ? 'border-emerald-600 ring-1 ring-emerald-600/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <ProductThumb product={product} />
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono">{product.sku}</span>
                    <span className="truncate">{product.category}</span>
                  </div>
                  <h3 className="mt-1 line-clamp-2 font-display text-sm font-semibold text-slate-900">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2.5">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                      {formatRupiah(product.sellPrice)}
                    </p>
                    <p
                      className={`mt-0.5 text-xs tabular-nums ${
                        isOut
                          ? 'font-semibold text-red-600'
                          : isLow
                            ? 'font-semibold text-amber-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {isOut
                        ? 'Stok habis'
                        : isLow
                          ? `Menipis · ${remainingStock} ${product.unit}`
                          : `Stok ${remainingStock} ${product.unit}`}
                    </p>
                  </div>

                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold ${
                      inCartQty > 0
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-100 text-slate-700 group-hover:bg-emerald-700 group-hover:text-white'
                    }`}
                  >
                    {inCartQty > 0 ? `${inCartQty}` : <Plus className="h-4 w-4" />}
                  </span>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="font-display text-sm font-semibold text-slate-900">
                Barang tidak ditemukan
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ubah kata kunci pencarian atau pilih kategori lain.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Kanan: Keranjang & Pembayaran */}
      <div className="rounded-xl border border-slate-200 bg-white lg:sticky lg:top-6 lg:col-span-5 xl:col-span-4">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-emerald-700" />
            <h2 className="font-display text-base font-semibold text-slate-900">
              Keranjang Kasir
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-medium text-slate-500 hover:text-red-600"
            >
              Kosongkan
            </button>
          )}
        </div>

        {/* Pelanggan Member */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
              Member & Loyalitas
            </label>
            <button
              type="button"
              onClick={onOpenNewCustomer}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              + Daftar Member
            </button>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setRedeemPointsEnabled(false);
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Pelanggan Umum (Non-Member)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.tier} ({c.points} poin)
              </option>
            ))}
          </select>

          {selectedCustomer && (
            <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="text-slate-600">
                <span>Tier {selectedCustomer.tier}</span>
                <span aria-hidden="true"> · </span>
                <span>Diskon {tierDiscountPct}%</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {selectedCustomer.points} poin
                </span>
              </div>

              {selectedCustomer.points > 0 && (
                <label className="flex cursor-pointer items-center gap-1.5 font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={redeemPointsEnabled}
                    onChange={(e) => setRedeemPointsEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  Tukar Poin
                </label>
              )}
            </div>
          )}
        </div>

        {/* Daftar Item Keranjang */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 px-5">
          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-600">Belum ada barang dipilih</p>
              <p className="mt-1 text-xs text-slate-400">
                Klik kartu produk di sebelah kiri untuk menambahkan ke transaksi.
              </p>
            </div>
          ) : (
            cart.map(({ product, qty }) => (
              <div key={product.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                  <p className="font-mono text-xs text-slate-500 tabular-nums">
                    {formatRupiah(product.sellPrice)} × {qty}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCartQty(product.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center font-mono text-xs font-semibold tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(product.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCartQty(product.id, -qty)}
                    className="ml-1 rounded-md p-1 text-slate-400 hover:text-red-600"
                    aria-label="Hapus item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ringkasan & Metode Bayar */}
        <div className="space-y-4 border-t border-slate-200 p-5">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatRupiah(subtotal)}</span>
            </div>
            {tierDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Diskon Member ({selectedCustomer?.tier} {tierDiscountPct}%)</span>
                <span className="font-mono tabular-nums">-{formatRupiah(tierDiscountAmount)}</span>
              </div>
            )}
            {pointsDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Potongan {maxRedeemablePoints} Poin</span>
                <span className="font-mono tabular-nums">-{formatRupiah(pointsDiscountAmount)}</span>
              </div>
            )}
            {settings.taxRatePercent > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>PPN ({settings.taxRatePercent}%)</span>
                <span className="font-mono tabular-nums">{formatRupiah(taxAmount)}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
              <span className="font-display text-sm font-semibold text-slate-900">Total Tagihan</span>
              <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                {formatRupiah(grandTotal)}
              </span>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-700">Metode Pembayaran</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'QRIS', label: 'QRIS', icon: QrCode },
                  { id: 'Tunai', label: 'Tunai', icon: Banknote },
                  { id: 'Transfer Bank', label: 'Transfer VA', icon: CreditCard },
                  { id: 'Debit', label: 'Kartu Debit', icon: CreditCard },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    paymentMethod === id
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tujuan Rekening Bank / Input Tunai */}
          {paymentMethod === 'Tunai' ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Uang Tunai Diterima</span>
                <span className="text-slate-500">Masuk ke Brankas Tunai</span>
              </div>
              <input
                type="number"
                min={0}
                value={cashReceivedInput}
                onChange={(e) => setCashReceivedInput(e.target.value)}
                placeholder="Contoh: 100000"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5">
                {[grandTotal, 50000, 100000, 200000]
                  .filter((v, idx, arr) => v > 0 && arr.indexOf(v) === idx)
                  .map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashReceivedInput(String(amt))}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {amt === grandTotal ? 'Uang Pas' : formatRupiah(amt)}
                    </button>
                  ))}
              </div>
              {cashReceivedNum >= grandTotal && grandTotal > 0 && (
                <div className="flex justify-between pt-1 text-xs font-semibold text-emerald-700">
                  <span>Kembalian</span>
                  <span className="font-mono tabular-nums">{formatRupiah(changeAmount)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="block text-xs font-medium text-slate-700">
                Rekening Bank Penerima (Settlement Otomatis)
              </label>
              <select
                value={effectiveBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                {linkedBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.provider} · {bank.maskedNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={cart.length === 0 || processing}
            onClick={handleCheckoutSubmit}
            className="w-full whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing
              ? 'Memproses Pembayaran...'
              : `Bayar & Selesaikan · ${formatRupiah(grandTotal)}`}
          </button>
        </div>
      </div>

      {/* Modal Struk Digital & Cetak */}
      {completedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    Transaksi Berhasil
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stok, laporan keuangan & mutasi kas telah diperbarui otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletedTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup struk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              id="receipt-print-area"
              className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-xs text-slate-800"
            >
              <div className="text-center">
                <p className="font-display text-sm font-bold text-slate-900">{settings.storeName}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{settings.storeAddress}</p>
                <p className="text-[11px] text-slate-500">{settings.storePhone}</p>
              </div>

              <div className="my-3 border-t border-dashed border-slate-300 pt-2.5 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>No. Struk</span>
                  <span className="font-semibold">{completedTx.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu</span>
                  <span>{formatDateTimeID(completedTx.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir</span>
                  <span>{completedTx.cashierName}</span>
                </div>
                {completedTx.customerName && (
                  <div className="flex justify-between">
                    <span>Member</span>
                    <span>
                      {completedTx.customerName} ({completedTx.customerTier})
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 py-2.5 space-y-1.5">
                {completedTx.items.map((item) => (
                  <div key={item.productId} className="flex justify-between gap-2">
                    <span className="truncate">
                      {item.name} ×{item.qty}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatRupiah(completedTx.subtotal)}</span>
                </div>
                {completedTx.tierDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon Member</span>
                    <span className="tabular-nums">-{formatRupiah(completedTx.tierDiscountAmount)}</span>
                  </div>
                )}
                {completedTx.pointsDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Tukar Poin ({completedTx.pointsRedeemed})</span>
                    <span className="tabular-nums">-{formatRupiah(completedTx.pointsDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
                  <span>TOTAL</span>
                  <span className="tabular-nums">{formatRupiah(completedTx.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Bayar ({completedTx.paymentMethod})</span>
                  <span className="tabular-nums">{formatRupiah(completedTx.cashReceived)}</span>
                </div>
                {completedTx.changeAmount > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Kembalian</span>
                    <span className="tabular-nums">{formatRupiah(completedTx.changeAmount)}</span>
                  </div>
                )}
                {completedTx.pointsEarned > 0 && (
                  <div className="mt-2 rounded bg-emerald-50 px-2 py-1 text-center text-[11px] font-semibold text-emerald-800">
                    +{completedTx.pointsEarned} Poin Loyalitas Ditambahkan
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={copyReceiptText}
                className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedReceipt ? 'Tersalin!' : 'Salin Struk WA'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
