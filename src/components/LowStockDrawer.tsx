import React from 'react';
import { AlertTriangle, PackagePlus, X } from 'lucide-react';
import type { Product } from '../types.ts';
import { formatRupiah } from '../utils/format.ts';

interface LowStockDrawerProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onQuickRestock: (product: Product) => void;
  onGoToInventory: () => void;
}

export const LowStockDrawer: React.FC<LowStockDrawerProps> = ({
  isOpen,
  products,
  onClose,
  onQuickRestock,
  onGoToInventory,
}) => {
  if (!isOpen) return null;

  const lowStockItems = products
    .filter((p) => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Notifikasi Stok Menipis
              </h2>
              <p className="text-xs text-slate-500">
                {lowStockItems.length} barang perlu segera diisi ulang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup panel notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {lowStockItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <p className="font-display text-sm font-semibold text-slate-900">
                Semua Persediaan Aman
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Tidak ada barang yang berada di bawah batas minimum stok saat ini.
              </p>
            </div>
          ) : (
            lowStockItems.map((item) => {
              const isOut = item.stock === 0;
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{item.sku}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.supplier}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs tabular-nums">
                      <span className={isOut ? 'font-semibold text-red-600' : 'font-semibold text-amber-700'}>
                        {isOut ? 'Stok Habis (0)' : `Sisa ${item.stock} ${item.unit}`}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-500">Min. {item.minStock} {item.unit}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-600">HPP {formatRupiah(item.buyPrice)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onQuickRestock(item);
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    <PackagePlus className="h-3.5 w-3.5" />
                    Restok
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToInventory();
            }}
            className="w-full whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Buka Manajemen Stok & Barang
          </button>
        </div>
      </div>
    </div>
  );
};
