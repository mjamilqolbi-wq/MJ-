import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  Edit3,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BankAccount,
  Product,
  ProductCategory,
  StockMovement,
} from '../types.ts';
import { formatDateTimeID, formatRupiah } from '../utils/format.ts';

interface InventoryViewProps {
  products: Product[];
  stockMovements: StockMovement[];
  bankAccounts: BankAccount[];
  restockTarget: Product | null;
  onClearRestockTarget: () => void;
  onCreateProduct: (payload: Omit<Product, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateProduct: (id: string, payload: Partial<Omit<Product, 'id'>>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onRestockProduct: (
    productId: string,
    payload: { qty: number; unitCost?: number; bankAccountId: string; note?: string },
  ) => Promise<void>;
}

const CATEGORIES: ProductCategory[] = [
  'Minuman',
  'Roti & Kue',
  'Bahan & Ritel',
  'Merchandise',
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  stockMovements,
  bankAccounts,
  restockTarget,
  onClearRestockTarget,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRestockProduct,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'movements'>('catalog');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [localRestockProduct, setLocalRestockProduct] = useState<Product | null>(null);

  const activeRestock = restockTarget || localRestockProduct;

  const [formState, setFormState] = useState({
    sku: '',
    name: '',
    category: 'Minuman' as ProductCategory,
    buyPrice: 10000,
    sellPrice: 20000,
    stock: 20,
    minStock: 8,
    unit: 'pcs',
    supplier: '',
  });

  const [restockForm, setRestockForm] = useState({
    qty: 12,
    unitCost: 0,
    bankAccountId: bankAccounts[1]?.id || bankAccounts[0]?.id || '',
    note: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= p.minStock).length,
    [products],
  );

  const totalInventoryValuation = useMemo(
    () => products.reduce((sum, p) => sum + p.buyPrice * p.stock, 0),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchLow = stockFilter === 'all' || p.stock <= p.minStock;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q);
      return matchLow && matchSearch;
    });
  }, [products, search, stockFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormError('');
    setFormState({
      sku: `SKU-${String(products.length + 101)}`,
      name: '',
      category: 'Minuman',
      buyPrice: 12000,
      sellPrice: 25000,
      stock: 15,
      minStock: 6,
      unit: 'pcs',
      supplier: 'Pemasok Utama',
    });
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormError('');
    setFormState({
      sku: product.sku,
      name: product.name,
      category: product.category,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      supplier: product.supplier,
    });
    setIsProductModalOpen(true);
  };

  const openRestockModal = (product: Product) => {
    setFormError('');
    setLocalRestockProduct(product);
    setRestockForm({
      qty: Math.max(10, product.minStock * 2 - product.stock),
      unitCost: product.buyPrice,
      bankAccountId: bankAccounts[1]?.id || bankAccounts[0]?.id || '',
      note: `Restok ${product.name} dari ${product.supplier}`,
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, formState);
      } else {
        await onCreateProduct(formState);
      }
      setIsProductModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data barang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestock) return;
    setFormError('');
    setSubmitting(true);
    try {
      await onRestockProduct(activeRestock.id, {
        qty: restockForm.qty,
        unitCost: restockForm.unitCost > 0 ? restockForm.unitCost : activeRestock.buyPrice,
        bankAccountId: restockForm.bankAccountId || bankAccounts[0]?.id || '',
        note: restockForm.note,
      });
      setLocalRestockProduct(null);
      onClearRestockTarget();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memproses restok.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner Peringatan Stok Menipis */}
      {lowStockCount > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Peringatan Stok Menipis: {lowStockCount} barang berada di bawah batas minimum
              </p>
              <p className="text-xs text-amber-800">
                Segera lakukan restok agar operasional kasir tidak terhambat saat jam ramai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('catalog');
              setStockFilter(stockFilter === 'low' ? 'all' : 'low');
            }}
            className="whitespace-nowrap shrink-0 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            {stockFilter === 'low' ? 'Tampilkan Semua Barang' : 'Filter Barang Menipis'}
          </button>
        </div>
      )}

      {/* Ringkasan & Toolbar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total SKU Terdaftar</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {products.length} item
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Nilai Aset Persediaan (HPP)</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatRupiah(totalInventoryValuation)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Status Perlu Restok</p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {lowStockCount} barang
          </p>
        </div>
      </div>

      {/* Sub-Nav & Search */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveSubTab('catalog')}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeSubTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Barang & Stok
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('movements')}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeSubTab === 'movements'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              Kartu Stok Otomatis
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSubTab === 'catalog' && (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari SKU, barang, pemasok..."
                    className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                      stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter('low')}
                    className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                      stockFilter === 'low' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Menipis ({lowStockCount})
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Barang
            </button>
          </div>
        </div>

        {activeSubTab === 'catalog' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="px-4 py-3 font-medium">SKU / Barang</th>
                  <th className="px-4 py-3 font-medium">Kategori & Pemasok</th>
                  <th className="px-4 py-3 text-right font-medium">HPP (Beli)</th>
                  <th className="px-4 py-3 text-right font-medium">Harga Jual</th>
                  <th className="px-4 py-3 text-right font-medium">Stok / Min</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isOut = p.stock === 0;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const marginPct =
                    p.sellPrice > 0
                      ? (((p.sellPrice - p.buyPrice) / p.sellPrice) * 100).toFixed(0)
                      : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="font-mono text-[11px] text-slate-500">{p.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span>{p.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-slate-500">{p.supplier}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                        {formatRupiah(p.buyPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <p className="font-semibold text-slate-900">{formatRupiah(p.sellPrice)}</p>
                        <p className="text-[11px] text-emerald-700">Margin {marginPct}%</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span className="font-semibold text-slate-900">{p.stock}</span>
                        <span className="text-slate-400"> / {p.minStock} </span>
                        <span className="text-slate-500">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="font-semibold text-red-600">Stok Habis</span>
                        ) : isLow ? (
                          <span className="font-semibold text-amber-700">Stok Menipis</span>
                        ) : (
                          <span className="font-medium text-emerald-700">Stok Aman</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openRestockModal(p)}
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            <PackagePlus className="h-3.5 w-3.5" />
                            Restok
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            aria-label={`Edit ${p.name}`}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(p.id)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Hapus ${p.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Tidak ada barang yang cocok dengan filter saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium">Barang</th>
                  <th className="px-4 py-3 font-medium">Jenis Mutasi</th>
                  <th className="px-4 py-3 text-right font-medium">Perubahan</th>
                  <th className="px-4 py-3 text-right font-medium">Stok Akhir</th>
                  <th className="px-4 py-3 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.slice(0, 40).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatDateTimeID(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{m.productName}</span>
                      <span className="ml-1.5 font-mono text-[11px] text-slate-400">{m.sku}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {m.type === 'PENJUALAN'
                        ? 'Penjualan Kasir'
                        : m.type === 'RESTOK'
                          ? 'Restok Pembelian'
                          : 'Stok Opname'}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        m.delta >= 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-900">
                      {m.stockAfter}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Barang */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {editingProduct ? 'Edit Data Barang' : 'Pendataan Barang Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={formState.sku}
                    onChange={(e) => setFormState({ ...formState, sku: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Nama Barang</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="Contoh: Kopi Arabika Toraja 250g"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Kategori</label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({ ...formState, category: e.target.value as ProductCategory })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Pemasok (Supplier)</label>
                  <input
                    type="text"
                    required
                    value={formState.supplier}
                    onChange={(e) => setFormState({ ...formState, supplier: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">HPP Beli (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.buyPrice}
                    onChange={(e) => setFormState({ ...formState, buyPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.sellPrice}
                    onChange={(e) => setFormState({ ...formState, sellPrice: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Stok Saat Ini</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.stock}
                    onChange={(e) => setFormState({ ...formState, stock: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Batas Minimum</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formState.minStock}
                    onChange={(e) => setFormState({ ...formState, minStock: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Satuan (Unit)</label>
                <input
                  type="text"
                  required
                  value={formState.unit}
                  onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                  placeholder="cup / pcs / botol / pack"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restok Cepat Terintegrasi Pembayaran Kas/Bank */}
      {activeRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Restok Persediaan Barang
                </h3>
                <p className="text-xs text-slate-500">
                  {activeRestock.name} ({activeRestock.sku}) · Sisa {activeRestock.stock}{' '}
                  {activeRestock.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocalRestockProduct(null);
                  onClearRestockTarget();
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Jumlah Tambah ({activeRestock.unit})
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={restockForm.qty}
                    onChange={(e) => setRestockForm({ ...restockForm, qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Harga Beli Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={restockForm.unitCost || activeRestock.buyPrice}
                    onChange={(e) =>
                      setRestockForm({ ...restockForm, unitCost: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Sumber Dana Pembayaran (Kas / Bank)
                </label>
                <select
                  value={restockForm.bankAccountId || bankAccounts[0]?.id || ''}
                  onChange={(e) =>
                    setRestockForm({ ...restockForm, bankAccountId: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.provider} ({acc.maskedNumber}) · Saldo {formatRupiah(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Catatan PO / Pemasok</label>
                <input
                  type="text"
                  value={restockForm.note}
                  onChange={(e) => setRestockForm({ ...restockForm, note: e.target.value })}
                  placeholder={`Restok dari ${activeRestock.supplier}`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                <span className="text-slate-600">Total Tagihan Pembelian</span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatRupiah(
                    restockForm.qty * (restockForm.unitCost || activeRestock.buyPrice),
                  )}
                </span>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocalRestockProduct(null);
                    onClearRestockTarget();
                  }}
                  className="whitespace-nowrap rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi Restok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
