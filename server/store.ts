import fs from 'fs';
import path from 'path';
import type {
  BankAccount,
  BankProvider,
  CashflowEntry,
  Customer,
  LoyaltyLog,
  LoyaltyTier,
  PaymentMethod,
  Product,
  StockMovement,
  StoreState,
  Transaction,
  TransactionItem,
} from '../src/types.ts';

export const IS_EPHEMERAL =
  process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);

const DATA_DIR = IS_EPHEMERAL
  ? path.join('/tmp', 'kasirnusa-data')
  : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function computeTierFromSpend(totalSpend: number): LoyaltyTier {
  if (totalSpend >= 15_000_000) return 'Platinum';
  if (totalSpend >= 5_000_000) return 'Gold';
  if (totalSpend >= 1_500_000) return 'Silver';
  return 'Reguler';
}

function getTierDiscountPercent(tier?: LoyaltyTier): number {
  switch (tier) {
    case 'Platinum':
      return 8;
    case 'Gold':
      return 5;
    case 'Silver':
      return 3;
    default:
      return 0;
  }
}

function maskAccountNumber(fullNumber: string): string {
  const cleaned = fullNumber.replace(/\s+/g, '');
  const last4 = cleaned.slice(-4);
  return `•••• •••• ${last4}`;
}

function createInitialStoreState(): StoreState {
  const now = new Date();
  const hoursAgo = (h: number, m = 0) => {
    const d = new Date(now);
    d.setHours(Math.max(7, now.getHours() - h), m, 0, 0);
    return d.toISOString();
  };
  const daysAgoAt = (days: number, hour: number, minute = 15) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const products: Product[] = [
    {
      id: 'prd-1',
      sku: 'MNM-001',
      name: 'Kopi Susu Gula Aren',
      category: 'Minuman',
      buyPrice: 9500,
      sellPrice: 24000,
      stock: 42,
      minStock: 12,
      unit: 'cup',
      supplier: 'Roastery Nusantara',
      imageUrl: '/src/assets/images/product_iced_coffee_1794810478840.jpg',
      updatedAt: daysAgoAt(0, 8, 0),
    },
    {
      id: 'prd-2',
      sku: 'MNM-002',
      name: 'Matcha Oat Latte',
      category: 'Minuman',
      buyPrice: 12000,
      sellPrice: 29000,
      stock: 19,
      minStock: 10,
      unit: 'cup',
      supplier: 'Uji Matcha Indonesia',
      imageUrl: '/src/assets/images/product_iced_coffee_1794810478840.jpg',
      updatedAt: daysAgoAt(0, 8, 0),
    },
    {
      id: 'prd-3',
      sku: 'MNM-003',
      name: 'Americano Dingin',
      category: 'Minuman',
      buyPrice: 6500,
      sellPrice: 19000,
      stock: 35,
      minStock: 10,
      unit: 'cup',
      supplier: 'Roastery Nusantara',
      updatedAt: daysAgoAt(0, 8, 0),
    },
    {
      id: 'prd-4',
      sku: 'ROT-001',
      name: 'Croissant Mentega Prancis',
      category: 'Roti & Kue',
      buyPrice: 11000,
      sellPrice: 26000,
      stock: 4,
      minStock: 10,
      unit: 'pcs',
      supplier: 'Bakehouse Sentral',
      imageUrl: '/src/assets/images/product_artisan_bakery_1794810479212.jpg',
      updatedAt: daysAgoAt(0, 7, 30),
    },
    {
      id: 'prd-5',
      sku: 'ROT-002',
      name: 'Roti Sourdough Artisan',
      category: 'Roti & Kue',
      buyPrice: 18000,
      sellPrice: 42000,
      stock: 14,
      minStock: 6,
      unit: 'loaf',
      supplier: 'Bakehouse Sentral',
      imageUrl: '/src/assets/images/product_artisan_bakery_1794810479212.jpg',
      updatedAt: daysAgoAt(0, 7, 30),
    },
    {
      id: 'prd-6',
      sku: 'ROT-003',
      name: 'Cinnamon Roll Kayu Manis',
      category: 'Roti & Kue',
      buyPrice: 9000,
      sellPrice: 22000,
      stock: 16,
      minStock: 8,
      unit: 'pcs',
      supplier: 'Bakehouse Sentral',
      updatedAt: daysAgoAt(0, 7, 30),
    },
    {
      id: 'prd-7',
      sku: 'RTL-001',
      name: 'Biji Kopi Arabika Gayo 250g',
      category: 'Bahan & Ritel',
      buyPrice: 54000,
      sellPrice: 95000,
      stock: 3,
      minStock: 8,
      unit: 'pack',
      supplier: 'Roastery Nusantara',
      imageUrl: '/src/assets/images/product_pantry_goods_1794810479887.jpg',
      updatedAt: daysAgoAt(1, 14, 0),
    },
    {
      id: 'prd-8',
      sku: 'RTL-002',
      name: 'Minyak Zaitun Cold-Pressed 250ml',
      category: 'Bahan & Ritel',
      buyPrice: 68000,
      sellPrice: 118000,
      stock: 11,
      minStock: 5,
      unit: 'botol',
      supplier: 'Pangan Lestari',
      imageUrl: '/src/assets/images/product_pantry_goods_1794810479887.jpg',
      updatedAt: daysAgoAt(1, 14, 0),
    },
    {
      id: 'prd-9',
      sku: 'RTL-003',
      name: 'Susu Oat Barista 1L',
      category: 'Bahan & Ritel',
      buyPrice: 31000,
      sellPrice: 49000,
      stock: 0,
      minStock: 6,
      unit: 'karton',
      supplier: 'Distribusi Segar',
      updatedAt: daysAgoAt(0, 9, 15),
    },
    {
      id: 'prd-10',
      sku: 'RTL-004',
      name: 'Madu Hutan Sumbawa 350g',
      category: 'Bahan & Ritel',
      buyPrice: 58000,
      sellPrice: 98000,
      stock: 15,
      minStock: 5,
      unit: 'botol',
      supplier: 'Pangan Lestari',
      updatedAt: daysAgoAt(2, 11, 0),
    },
    {
      id: 'prd-11',
      sku: 'MRC-001',
      name: 'Tumbler Insulated Hijau 500ml',
      category: 'Merchandise',
      buyPrice: 92000,
      sellPrice: 175000,
      stock: 9,
      minStock: 4,
      unit: 'pcs',
      supplier: 'Kriya Logam Mandiri',
      imageUrl: '/src/assets/images/product_stainless_tumbler_1794810480718.jpg',
      updatedAt: daysAgoAt(3, 10, 0),
    },
    {
      id: 'prd-12',
      sku: 'MRC-002',
      name: 'Totebag Kanvas Tebal',
      category: 'Merchandise',
      buyPrice: 28000,
      sellPrice: 65000,
      stock: 22,
      minStock: 6,
      unit: 'pcs',
      supplier: 'Konveksi Karya',
      updatedAt: daysAgoAt(3, 10, 0),
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust-1',
      memberCode: 'MBR-1001',
      name: 'Rania Wijaya',
      phone: '0812-8840-1122',
      email: 'rania.wijaya@mail.id',
      tier: 'Platinum',
      points: 1840,
      totalSpend: 16450000,
      visitCount: 54,
      lastVisitAt: hoursAgo(1, 20),
      joinedAt: daysAgoAt(240, 10, 0),
      notes: 'Pelanggan tetap kopi susu & biji kopi Arabika.',
    },
    {
      id: 'cust-2',
      memberCode: 'MBR-1002',
      name: 'Bima Pratama',
      phone: '0813-4421-9087',
      email: 'bima.pratama@mail.id',
      tier: 'Gold',
      points: 720,
      totalSpend: 6820000,
      visitCount: 28,
      lastVisitAt: hoursAgo(2, 45),
      joinedAt: daysAgoAt(180, 11, 30),
      notes: 'Sering pesan paket sarapan sourdough & croissant.',
    },
    {
      id: 'cust-3',
      memberCode: 'MBR-1003',
      name: 'Siti Nurhaliza',
      phone: '0856-7712-3309',
      email: 'siti.nur@mail.id',
      tier: 'Silver',
      points: 310,
      totalSpend: 2480000,
      visitCount: 15,
      lastVisitAt: daysAgoAt(1, 15, 10),
      joinedAt: daysAgoAt(110, 14, 0),
    },
    {
      id: 'cust-4',
      memberCode: 'MBR-1004',
      name: 'Dimas Kurniawan',
      phone: '0878-9001-5432',
      email: 'dimas.k@mail.id',
      tier: 'Gold',
      points: 540,
      totalSpend: 5310000,
      visitCount: 22,
      lastVisitAt: daysAgoAt(12, 16, 40),
      joinedAt: daysAgoAt(200, 9, 15),
      notes: 'Perlu dikirim promo retensi karena belum berkunjung 12 hari.',
    },
    {
      id: 'cust-5',
      memberCode: 'MBR-1005',
      name: 'Nadia Kusuma',
      phone: '0821-3349-8820',
      email: 'nadia.kusuma@mail.id',
      tier: 'Reguler',
      points: 95,
      totalSpend: 640000,
      visitCount: 6,
      lastVisitAt: daysAgoAt(3, 13, 25),
      joinedAt: daysAgoAt(45, 16, 0),
    },
    {
      id: 'cust-6',
      memberCode: 'MBR-1006',
      name: 'Hendra Gunawan',
      phone: '0811-9204-7711',
      email: 'hendra.g@mail.id',
      tier: 'Silver',
      points: 260,
      totalSpend: 1950000,
      visitCount: 12,
      lastVisitAt: daysAgoAt(18, 10, 5),
      joinedAt: daysAgoAt(135, 12, 0),
      notes: 'Kandidat kampanye retensi member.',
    },
  ];

  const bankAccounts: BankAccount[] = [
    {
      id: 'acc-cash',
      provider: 'Brankas Tunai',
      accountName: 'Kas Laci Kasir & Brankas',
      maskedNumber: 'KAS-UTAMA-01',
      fullNumber: 'KAS-UTAMA-01',
      balance: 4850000,
      isCashVault: true,
      connectionStatus: 'Terhubung',
      encryptionStandard: 'Audit Shift Lokal',
      lastSyncedAt: hoursAgo(0, 10),
    },
    {
      id: 'acc-bca',
      provider: 'BCA Bisnis',
      accountName: 'PT KasirNusa Retailindo',
      maskedNumber: '•••• •••• 4821',
      fullNumber: '6012 8840 4821',
      balance: 38420000,
      isCashVault: false,
      connectionStatus: 'Terhubung',
      encryptionStandard: 'OAuth SNAP BI · TLS 1.3',
      lastSyncedAt: hoursAgo(0, 5),
    },
    {
      id: 'acc-mandiri',
      provider: 'Mandiri Kopra',
      accountName: 'PT KasirNusa Operasional',
      maskedNumber: '•••• •••• 9104',
      fullNumber: '1240 0091 9104',
      balance: 21750000,
      isCashVault: false,
      connectionStatus: 'Terhubung',
      encryptionStandard: 'OAuth SNAP BI · TLS 1.3',
      lastSyncedAt: hoursAgo(0, 15),
    },
  ];

  const makeSeedTx = (
    idx: number,
    createdAt: string,
    itemsSpec: Array<{ product: Product; qty: number }>,
    paymentMethod: PaymentMethod,
    bankAccount: BankAccount,
    customer?: Customer,
  ): Transaction => {
    const items: TransactionItem[] = itemsSpec.map(({ product, qty }) => ({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      qty,
      unitPrice: product.sellPrice,
      unitCost: product.buyPrice,
      subtotal: product.sellPrice * qty,
    }));
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const totalCost = items.reduce((s, i) => s + i.unitCost * i.qty, 0);
    const discountPct = customer ? getTierDiscountPercent(customer.tier) : 0;
    const tierDiscountAmount = Math.round((subtotal * discountPct) / 100);
    const total = subtotal - tierDiscountAmount;
    const grossProfit = total - totalCost;
    const pointsEarned = customer ? Math.floor(total / 10000) : 0;

    return {
      id: `tx-seed-${idx}`,
      receiptNo: `INV-${String(1040 + idx)}`,
      items,
      subtotal,
      tierDiscountAmount,
      pointsRedeemed: 0,
      pointsDiscountAmount: 0,
      taxAmount: 0,
      total,
      totalCost,
      grossProfit,
      paymentMethod,
      bankAccountId: bankAccount.id,
      bankAccountName: `${bankAccount.provider} (${bankAccount.maskedNumber})`,
      cashReceived: paymentMethod === 'Tunai' ? Math.ceil(total / 50000) * 50000 : total,
      changeAmount: paymentMethod === 'Tunai' ? Math.ceil(total / 50000) * 50000 - total : 0,
      customerId: customer?.id,
      customerName: customer?.name,
      customerTier: customer?.tier,
      pointsEarned,
      cashierName: 'Alya Putri',
      createdAt,
    };
  };

  const transactions: Transaction[] = [
    // Hari ini
    makeSeedTx(1, hoursAgo(4, 15), [{ product: products[0], qty: 2 }, { product: products[3], qty: 2 }], 'QRIS', bankAccounts[1], customers[0]),
    makeSeedTx(2, hoursAgo(3, 40), [{ product: products[1], qty: 1 }, { product: products[4], qty: 1 }], 'Tunai', bankAccounts[0], customers[1]),
    makeSeedTx(3, hoursAgo(2, 50), [{ product: products[6], qty: 2 }, { product: products[10], qty: 1 }], 'Transfer Bank', bankAccounts[1], customers[0]),
    makeSeedTx(4, hoursAgo(2, 10), [{ product: products[2], qty: 3 }, { product: products[5], qty: 2 }], 'QRIS', bankAccounts[1]),
    makeSeedTx(5, hoursAgo(1, 25), [{ product: products[7], qty: 1 }, { product: products[9], qty: 1 }], 'Debit', bankAccounts[2], customers[2]),
    makeSeedTx(6, hoursAgo(0, 35), [{ product: products[0], qty: 3 }, { product: products[11], qty: 1 }], 'Tunai', bankAccounts[0]),
    // 6 hari sebelumnya untuk grafik analitik harian
    makeSeedTx(7, daysAgoAt(1, 10, 20), [{ product: products[0], qty: 4 }, { product: products[6], qty: 2 }, { product: products[3], qty: 3 }], 'QRIS', bankAccounts[1], customers[2]),
    makeSeedTx(8, daysAgoAt(1, 15, 45), [{ product: products[10], qty: 2 }, { product: products[4], qty: 2 }], 'Transfer Bank', bankAccounts[2], customers[1]),
    makeSeedTx(9, daysAgoAt(2, 11, 10), [{ product: products[7], qty: 2 }, { product: products[0], qty: 5 }], 'QRIS', bankAccounts[1], customers[0]),
    makeSeedTx(10, daysAgoAt(2, 16, 30), [{ product: products[9], qty: 2 }, { product: products[5], qty: 4 }], 'Tunai', bankAccounts[0], customers[4]),
    makeSeedTx(11, daysAgoAt(3, 9, 50), [{ product: products[1], qty: 4 }, { product: products[4], qty: 3 }], 'Debit', bankAccounts[2]),
    makeSeedTx(12, daysAgoAt(4, 14, 15), [{ product: products[6], qty: 3 }, { product: products[11], qty: 2 }, { product: products[0], qty: 3 }], 'QRIS', bankAccounts[1], customers[1]),
    makeSeedTx(13, daysAgoAt(5, 13, 5), [{ product: products[7], qty: 2 }, { product: products[10], qty: 1 }], 'Transfer Bank', bankAccounts[1], customers[0]),
    makeSeedTx(14, daysAgoAt(6, 11, 40), [{ product: products[0], qty: 6 }, { product: products[3], qty: 4 }, { product: products[9], qty: 1 }], 'Tunai', bankAccounts[0]),
  ];

  const seedCashflowBase: CashflowEntry[] = [
    ...transactions.map((tx): CashflowEntry => ({
      id: `cf-${tx.id}`,
      accountId: tx.bankAccountId,
      accountName: tx.bankAccountName,
      direction: 'IN',
      category: 'Penjualan POS',
      amount: tx.total,
      description: `Penjualan ${tx.receiptNo} (${tx.paymentMethod})${tx.customerName ? ` · ${tx.customerName}` : ''}`,
      referenceNo: tx.receiptNo,
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: tx.createdAt,
    })),
    {
      id: 'cf-exp-1',
      accountId: 'acc-bca',
      accountName: 'BCA Bisnis (•••• •••• 4821)',
      direction: 'OUT',
      category: 'Pembelian Stok',
      amount: 1450000,
      description: 'Restok Biji Kopi & Susu Segar — Roastery Nusantara',
      referenceNo: 'PO-2026-089',
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: daysAgoAt(2, 9, 0),
    },
    {
      id: 'cf-exp-2',
      accountId: 'acc-mandiri',
      accountName: 'Mandiri Kopra (•••• •••• 9104)',
      direction: 'OUT',
      category: 'Operasional',
      amount: 650000,
      description: 'Tagihan Listrik & Internet Outlet Utama',
      referenceNo: 'OPR-1102',
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: daysAgoAt(1, 10, 0),
    },
    {
      id: 'cf-exp-3',
      accountId: 'acc-cash',
      accountName: 'Brankas Tunai (KAS-UTAMA-01)',
      direction: 'OUT',
      category: 'Operasional',
      amount: 185000,
      description: 'Pembelian Es Batu Kristal & Kemasan Cup Tambahan',
      referenceNo: 'KAS-0412',
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: hoursAgo(3, 10),
    },
    {
      id: 'cf-pending-1',
      accountId: 'acc-bca',
      accountName: 'BCA Bisnis (•••• •••• 4821)',
      direction: 'IN',
      category: 'Modal & Lainnya',
      amount: 450000,
      description: 'Settlement Batch QRIS Harian (Mutasi Otomatis SNAP BI)',
      referenceNo: 'QRIS-BATCH-1511',
      reconciliationStatus: 'Menunggu Cek',
      createdAt: hoursAgo(0, 45),
    },
  ];

  const cashflowEntries: CashflowEntry[] = seedCashflowBase.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const stockMovements: StockMovement[] = [
    {
      id: 'sm-1',
      productId: 'prd-4',
      productName: 'Croissant Mentega Prancis',
      sku: 'ROT-001',
      type: 'PENJUALAN',
      delta: -2,
      stockBefore: 6,
      stockAfter: 4,
      note: 'Terjual di transaksi INV-1041',
      referenceId: 'INV-1041',
      createdAt: hoursAgo(4, 15),
    },
    {
      id: 'sm-2',
      productId: 'prd-7',
      productName: 'Biji Kopi Arabika Gayo 250g',
      sku: 'RTL-001',
      type: 'PENJUALAN',
      delta: -2,
      stockBefore: 5,
      stockAfter: 3,
      note: 'Terjual di transaksi INV-1043',
      referenceId: 'INV-1043',
      createdAt: hoursAgo(2, 50),
    },
    {
      id: 'sm-3',
      productId: 'prd-9',
      productName: 'Susu Oat Barista 1L',
      sku: 'RTL-003',
      type: 'OPNAME',
      delta: -2,
      stockBefore: 2,
      stockAfter: 0,
      note: 'Pemakaian internal bar & stok habis',
      createdAt: daysAgoAt(0, 9, 15),
    },
    {
      id: 'sm-4',
      productId: 'prd-1',
      productName: 'Kopi Susu Gula Aren',
      sku: 'MNM-001',
      type: 'RESTOK',
      delta: 25,
      stockBefore: 17,
      stockAfter: 42,
      note: 'Restok pagi dari Roastery Nusantara',
      referenceId: 'PO-2026-089',
      createdAt: daysAgoAt(2, 9, 0),
    },
  ];

  const loyaltyLogs: LoyaltyLog[] = [
    {
      id: 'll-1',
      customerId: 'cust-1',
      customerName: 'Rania Wijaya',
      type: 'EARN',
      pointsDelta: 34,
      description: 'Poin belanja dari transaksi INV-1043',
      referenceId: 'INV-1043',
      createdAt: hoursAgo(2, 50),
    },
    {
      id: 'll-2',
      customerId: 'cust-2',
      customerName: 'Bima Pratama',
      type: 'EARN',
      pointsDelta: 6,
      description: 'Poin belanja dari transaksi INV-1042',
      referenceId: 'INV-1042',
      createdAt: hoursAgo(3, 40),
    },
    {
      id: 'll-3',
      customerId: 'cust-3',
      customerName: 'Siti Nurhaliza',
      type: 'EARN',
      pointsDelta: 21,
      description: 'Poin belanja dari transaksi INV-1045',
      referenceId: 'INV-1045',
      createdAt: hoursAgo(1, 25),
    },
  ];

  return {
    settings: {
      storeName: 'KasirNusa Flagship Store',
      storeAddress: 'Jl. Kemang Raya No. 48, Jakarta Selatan',
      storePhone: '021-7192-4480',
      cashierName: 'Alya Putri',
      taxRatePercent: 0,
      pointsPerAmount: 10000,
      pointValueRupiah: 100,
      securityPin: '123456',
    },
    products,
    stockMovements,
    customers,
    loyaltyLogs,
    transactions,
    bankAccounts,
    cashflowEntries,
  };
}

class StoreManager {
  private state: StoreState;
  private listeners: Set<(state: StoreState) => void> = new Set();

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): StoreState {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as StoreState;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.bankAccounts)) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed reading store.json, recreating initial dataset:', err);
    }
    const fresh = createInitialStoreState();
    this.persist(fresh);
    return fresh;
  }

  private persist(nextState: StoreState): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(nextState, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DATA_FILE);
  }

  private commit(): void {
    this.persist(this.state);
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): StoreState {
    return this.state;
  }

  verifyPin(pin: string): boolean {
    return pin === this.state.settings.securityPin;
  }

  createTransaction(payload: {
    items: Array<{ productId: string; qty: number }>;
    paymentMethod: PaymentMethod;
    bankAccountId: string;
    cashReceived: number;
    customerId?: string;
    redeemPoints?: number;
  }): Transaction {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Keranjang belanja masih kosong.');
    }

    const nowIso = new Date().toISOString();
    const bankAccount = this.state.bankAccounts.find((a) => a.id === payload.bankAccountId);
    if (!bankAccount) {
      throw new Error('Rekening tujuan pembayaran tidak ditemukan.');
    }

    const txItems: TransactionItem[] = [];
    for (const reqItem of payload.items) {
      const product = this.state.products.find((p) => p.id === reqItem.productId);
      if (!product) {
        throw new Error(`Produk tidak ditemukan (${reqItem.productId}).`);
      }
      if (reqItem.qty <= 0 || !Number.isInteger(reqItem.qty)) {
        throw new Error(`Jumlah untuk ${product.name} tidak valid.`);
      }
      if (product.stock < reqItem.qty) {
        throw new Error(`Stok ${product.name} tidak mencukupi (sisa ${product.stock} ${product.unit}).`);
      }
      txItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        qty: reqItem.qty,
        unitPrice: product.sellPrice,
        unitCost: product.buyPrice,
        subtotal: product.sellPrice * reqItem.qty,
      });
    }

    const subtotal = txItems.reduce((sum, i) => sum + i.subtotal, 0);
    const totalCost = txItems.reduce((sum, i) => sum + i.unitCost * i.qty, 0);

    let customer: Customer | undefined;
    let tierDiscountAmount = 0;
    let pointsRedeemed = 0;
    let pointsDiscountAmount = 0;

    if (payload.customerId) {
      customer = this.state.customers.find((c) => c.id === payload.customerId);
      if (!customer) {
        throw new Error('Data pelanggan member tidak ditemukan.');
      }
      const discountPct = getTierDiscountPercent(customer.tier);
      tierDiscountAmount = Math.round((subtotal * discountPct) / 100);

      if (payload.redeemPoints && payload.redeemPoints > 0) {
        pointsRedeemed = Math.min(customer.points, Math.floor(payload.redeemPoints));
        const maxPossibleDiscount = Math.max(0, subtotal - tierDiscountAmount);
        const rawPointsDiscount = pointsRedeemed * this.state.settings.pointValueRupiah;
        if (rawPointsDiscount > maxPossibleDiscount) {
          pointsRedeemed = Math.floor(maxPossibleDiscount / this.state.settings.pointValueRupiah);
          pointsDiscountAmount = pointsRedeemed * this.state.settings.pointValueRupiah;
        } else {
          pointsDiscountAmount = rawPointsDiscount;
        }
      }
    }

    const afterDiscount = Math.max(0, subtotal - tierDiscountAmount - pointsDiscountAmount);
    const taxAmount = Math.round((afterDiscount * this.state.settings.taxRatePercent) / 100);
    const total = afterDiscount + taxAmount;
    const grossProfit = afterDiscount - totalCost;

    const cashReceived = payload.paymentMethod === 'Tunai' ? payload.cashReceived : total;
    if (payload.paymentMethod === 'Tunai' && cashReceived < total) {
      throw new Error('Nominal uang tunai yang diterima kurang dari total tagihan.');
    }
    const changeAmount = payload.paymentMethod === 'Tunai' ? cashReceived - total : 0;

    const receiptNumber = 1041 + this.state.transactions.length;
    const receiptNo = `INV-${receiptNumber}`;
    const pointsEarned = customer
      ? Math.floor(total / Math.max(1000, this.state.settings.pointsPerAmount))
      : 0;

    const newTransaction: Transaction = {
      id: uid('tx'),
      receiptNo,
      items: txItems,
      subtotal,
      tierDiscountAmount,
      pointsRedeemed,
      pointsDiscountAmount,
      taxAmount,
      total,
      totalCost,
      grossProfit,
      paymentMethod: payload.paymentMethod,
      bankAccountId: bankAccount.id,
      bankAccountName: `${bankAccount.provider} (${bankAccount.maskedNumber})`,
      cashReceived,
      changeAmount,
      customerId: customer?.id,
      customerName: customer?.name,
      customerTier: customer?.tier,
      pointsEarned,
      cashierName: this.state.settings.cashierName,
      createdAt: nowIso,
    };

    // Deduct stock and record stock movements
    for (const item of txItems) {
      const product = this.state.products.find((p) => p.id === item.productId)!;
      const stockBefore = product.stock;
      product.stock -= item.qty;
      product.updatedAt = nowIso;

      this.state.stockMovements.unshift({
        id: uid('sm'),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'PENJUALAN',
        delta: -item.qty,
        stockBefore,
        stockAfter: product.stock,
        note: `Terjual di transaksi ${receiptNo}`,
        referenceId: receiptNo,
        createdAt: nowIso,
      });
    }

    // Update customer loyalty
    if (customer) {
      customer.points = Math.max(0, customer.points - pointsRedeemed + pointsEarned);
      customer.totalSpend += total;
      customer.visitCount += 1;
      customer.lastVisitAt = nowIso;
      customer.tier = computeTierFromSpend(customer.totalSpend);

      if (pointsRedeemed > 0) {
        this.state.loyaltyLogs.unshift({
          id: uid('ll'),
          customerId: customer.id,
          customerName: customer.name,
          type: 'REDEEM',
          pointsDelta: -pointsRedeemed,
          description: `Penukaran poin di transaksi ${receiptNo}`,
          referenceId: receiptNo,
          createdAt: nowIso,
        });
      }
      if (pointsEarned > 0) {
        this.state.loyaltyLogs.unshift({
          id: uid('ll'),
          customerId: customer.id,
          customerName: customer.name,
          type: 'EARN',
          pointsDelta: pointsEarned,
          description: `Poin belanja dari transaksi ${receiptNo}`,
          referenceId: receiptNo,
          createdAt: nowIso,
        });
      }
    }

    // Credit bank account or cash vault & log cashflow
    bankAccount.balance += total;
    bankAccount.lastSyncedAt = nowIso;

    this.state.cashflowEntries.unshift({
      id: uid('cf'),
      accountId: bankAccount.id,
      accountName: `${bankAccount.provider} (${bankAccount.maskedNumber})`,
      direction: 'IN',
      category: 'Penjualan POS',
      amount: total,
      description: `Penjualan ${receiptNo} (${payload.paymentMethod})${customer ? ` · ${customer.name}` : ''}`,
      referenceNo: receiptNo,
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: nowIso,
    });

    this.state.transactions.unshift(newTransaction);
    this.commit();
    return newTransaction;
  }

  createProduct(payload: Omit<Product, 'id' | 'updatedAt'>): Product {
    const nowIso = new Date().toISOString();
    const product: Product = {
      ...payload,
      id: uid('prd'),
      updatedAt: nowIso,
    };
    this.state.products.unshift(product);
    if (product.stock > 0) {
      this.state.stockMovements.unshift({
        id: uid('sm'),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'RESTOK',
        delta: product.stock,
        stockBefore: 0,
        stockAfter: product.stock,
        note: 'Stok awal produk baru',
        createdAt: nowIso,
      });
    }
    this.commit();
    return product;
  }

  updateProduct(id: string, payload: Partial<Omit<Product, 'id'>>): Product {
    const product = this.state.products.find((p) => p.id === id);
    if (!product) {
      throw new Error('Barang tidak ditemukan.');
    }
    const nowIso = new Date().toISOString();
    const oldStock = product.stock;
    Object.assign(product, payload, { updatedAt: nowIso });

    if (typeof payload.stock === 'number' && payload.stock !== oldStock) {
      const delta = payload.stock - oldStock;
      this.state.stockMovements.unshift({
        id: uid('sm'),
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'OPNAME',
        delta,
        stockBefore: oldStock,
        stockAfter: product.stock,
        note: 'Penyesuaian stok opname manual',
        createdAt: nowIso,
      });
    }
    this.commit();
    return product;
  }

  deleteProduct(id: string): void {
    const idx = this.state.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error('Barang tidak ditemukan.');
    }
    this.state.products.splice(idx, 1);
    this.commit();
  }

  restockProduct(
    productId: string,
    payload: {
      qty: number;
      unitCost?: number;
      bankAccountId: string;
      note?: string;
    },
  ): Product {
    const product = this.state.products.find((p) => p.id === productId);
    if (!product) throw new Error('Barang tidak ditemukan.');
    if (payload.qty <= 0) throw new Error('Jumlah restok harus lebih dari 0.');

    const bankAccount = this.state.bankAccounts.find((a) => a.id === payload.bankAccountId);
    if (!bankAccount) throw new Error('Rekening sumber dana tidak ditemukan.');

    const nowIso = new Date().toISOString();
    const unitCost = typeof payload.unitCost === 'number' && payload.unitCost > 0 ? payload.unitCost : product.buyPrice;
    const totalCost = unitCost * payload.qty;

    if (bankAccount.balance < totalCost) {
      throw new Error(`Saldo ${bankAccount.provider} tidak mencukupi untuk pembayaran restok.`);
    }

    const stockBefore = product.stock;
    product.stock += payload.qty;
    product.buyPrice = unitCost;
    product.updatedAt = nowIso;

    const poRef = `PO-${Date.now().toString().slice(-6)}`;

    this.state.stockMovements.unshift({
      id: uid('sm'),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'RESTOK',
      delta: payload.qty,
      stockBefore,
      stockAfter: product.stock,
      note: payload.note || `Restok dari ${product.supplier}`,
      referenceId: poRef,
      createdAt: nowIso,
    });

    bankAccount.balance -= totalCost;
    bankAccount.lastSyncedAt = nowIso;

    this.state.cashflowEntries.unshift({
      id: uid('cf'),
      accountId: bankAccount.id,
      accountName: `${bankAccount.provider} (${bankAccount.maskedNumber})`,
      direction: 'OUT',
      category: 'Pembelian Stok',
      amount: totalCost,
      description: `Restok ${payload.qty} ${product.unit} ${product.name} (${product.supplier})`,
      referenceNo: poRef,
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: nowIso,
    });

    this.commit();
    return product;
  }

  createCustomer(payload: {
    name: string;
    phone: string;
    email: string;
    notes?: string;
    initialPoints?: number;
  }): Customer {
    const nowIso = new Date().toISOString();
    const nextNum = 1001 + this.state.customers.length;
    const customer: Customer = {
      id: uid('cust'),
      memberCode: `MBR-${nextNum}`,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      tier: 'Reguler',
      points: payload.initialPoints || 50,
      totalSpend: 0,
      visitCount: 0,
      lastVisitAt: nowIso,
      joinedAt: nowIso,
      notes: payload.notes,
    };
    this.state.customers.unshift(customer);
    if (customer.points > 0) {
      this.state.loyaltyLogs.unshift({
        id: uid('ll'),
        customerId: customer.id,
        customerName: customer.name,
        type: 'BONUS',
        pointsDelta: customer.points,
        description: 'Bonus pendaftaran member baru',
        createdAt: nowIso,
      });
    }
    this.commit();
    return customer;
  }

  grantLoyaltyBonus(customerId: string, points: number, description: string): Customer {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Member tidak ditemukan.');
    if (points <= 0) throw new Error('Jumlah poin bonus harus positif.');
    const nowIso = new Date().toISOString();
    customer.points += points;
    this.state.loyaltyLogs.unshift({
      id: uid('ll'),
      customerId: customer.id,
      customerName: customer.name,
      type: 'CAMPAIGN',
      pointsDelta: points,
      description,
      createdAt: nowIso,
    });
    this.commit();
    return customer;
  }

  linkBankAccount(payload: {
    provider: BankProvider;
    accountName: string;
    fullNumber: string;
    initialBalance: number;
    pin: string;
  }): BankAccount {
    if (!this.verifyPin(payload.pin)) {
      throw new Error('PIN keamanan salah. Otorisasi integrasi bank ditolak.');
    }
    const nowIso = new Date().toISOString();
    const account: BankAccount = {
      id: uid('acc'),
      provider: payload.provider,
      accountName: payload.accountName,
      maskedNumber: maskAccountNumber(payload.fullNumber),
      fullNumber: payload.fullNumber,
      balance: Math.max(0, payload.initialBalance),
      isCashVault: false,
      connectionStatus: 'Terhubung',
      encryptionStandard: 'OAuth SNAP BI · TLS 1.3',
      lastSyncedAt: nowIso,
    };
    this.state.bankAccounts.push(account);
    if (account.balance > 0) {
      this.state.cashflowEntries.unshift({
        id: uid('cf'),
        accountId: account.id,
        accountName: `${account.provider} (${account.maskedNumber})`,
        direction: 'IN',
        category: 'Modal & Lainnya',
        amount: account.balance,
        description: `Saldo awal rekening terhubung ${account.provider}`,
        referenceNo: `LINK-${Date.now().toString().slice(-5)}`,
        reconciliationStatus: 'Terekonsiliasi',
        createdAt: nowIso,
      });
    }
    this.commit();
    return account;
  }

  recordCashflow(payload: {
    accountId: string;
    direction: 'IN' | 'OUT';
    category: CashflowEntry['category'];
    amount: number;
    description: string;
    pin?: string;
  }): CashflowEntry {
    if (payload.amount <= 0) throw new Error('Nominal harus lebih dari Rp 0.');
    const account = this.state.bankAccounts.find((a) => a.id === payload.accountId);
    if (!account) throw new Error('Rekening kas tidak ditemukan.');

    if (payload.direction === 'OUT') {
      if (!payload.pin || !this.verifyPin(payload.pin)) {
        throw new Error('PIN keamanan diperlukan dan harus benar untuk mencatat kas keluar.');
      }
      if (account.balance < payload.amount) {
        throw new Error(`Saldo ${account.provider} tidak mencukupi.`);
      }
      account.balance -= payload.amount;
    } else {
      account.balance += payload.amount;
    }

    const nowIso = new Date().toISOString();
    account.lastSyncedAt = nowIso;

    const entry: CashflowEntry = {
      id: uid('cf'),
      accountId: account.id,
      accountName: `${account.provider} (${account.maskedNumber})`,
      direction: payload.direction,
      category: payload.category,
      amount: payload.amount,
      description: payload.description,
      referenceNo: `${payload.direction === 'IN' ? 'KM' : 'KK'}-${Date.now().toString().slice(-6)}`,
      reconciliationStatus: 'Terekonsiliasi',
      createdAt: nowIso,
    };

    this.state.cashflowEntries.unshift(entry);
    this.commit();
    return entry;
  }

  transferBetweenAccounts(payload: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
    pin: string;
  }): void {
    if (!this.verifyPin(payload.pin)) {
      throw new Error('PIN keamanan salah. Transfer dana dibatalkan.');
    }
    if (payload.fromAccountId === payload.toAccountId) {
      throw new Error('Rekening asal dan tujuan tidak boleh sama.');
    }
    if (payload.amount <= 0) {
      throw new Error('Nominal transfer harus lebih dari Rp 0.');
    }
    const fromAcc = this.state.bankAccounts.find((a) => a.id === payload.fromAccountId);
    const toAcc = this.state.bankAccounts.find((a) => a.id === payload.toAccountId);
    if (!fromAcc || !toAcc) throw new Error('Rekening tidak ditemukan.');
    if (fromAcc.balance < payload.amount) {
      throw new Error(`Saldo ${fromAcc.provider} tidak mencukupi.`);
    }

    const nowIso = new Date().toISOString();
    const refNo = `TRF-${Date.now().toString().slice(-6)}`;

    fromAcc.balance -= payload.amount;
    toAcc.balance += payload.amount;
    fromAcc.lastSyncedAt = nowIso;
    toAcc.lastSyncedAt = nowIso;

    const cat: CashflowEntry['category'] = fromAcc.isCashVault ? 'Setor Tunai' : 'Tarik Tunai';

    this.state.cashflowEntries.unshift(
      {
        id: uid('cf'),
        accountId: toAcc.id,
        accountName: `${toAcc.provider} (${toAcc.maskedNumber})`,
        direction: 'IN',
        category: cat,
        amount: payload.amount,
        description: `Dana masuk dari ${fromAcc.provider}: ${payload.note}`,
        referenceNo: refNo,
        reconciliationStatus: 'Terekonsiliasi',
        createdAt: nowIso,
      },
      {
        id: uid('cf'),
        accountId: fromAcc.id,
        accountName: `${fromAcc.provider} (${fromAcc.maskedNumber})`,
        direction: 'OUT',
        category: cat,
        amount: payload.amount,
        description: `Transfer ke ${toAcc.provider}: ${payload.note}`,
        referenceNo: refNo,
        reconciliationStatus: 'Terekonsiliasi',
        createdAt: nowIso,
      },
    );

    this.commit();
  }

  reconcileCashflowEntry(entryId: string): CashflowEntry {
    const entry = this.state.cashflowEntries.find((e) => e.id === entryId);
    if (!entry) throw new Error('Mutasi kas tidak ditemukan.');
    entry.reconciliationStatus = 'Terekonsiliasi';
    this.commit();
    return entry;
  }

  syncBankAccount(accountId: string): BankAccount {
    const acc = this.state.bankAccounts.find((a) => a.id === accountId);
    if (!acc) throw new Error('Rekening tidak ditemukan.');
    acc.lastSyncedAt = new Date().toISOString();
    acc.connectionStatus = 'Terhubung';
    this.commit();
    return acc;
  }

  updateSettings(payload: Partial<StoreState['settings']>): StoreState['settings'] {
    Object.assign(this.state.settings, payload);
    this.commit();
    return this.state.settings;
  }

  replaceState(nextState: StoreState): StoreState {
    if (
      !nextState ||
      !nextState.settings ||
      !Array.isArray(nextState.products) ||
      !Array.isArray(nextState.bankAccounts) ||
      !Array.isArray(nextState.transactions)
    ) {
      throw new Error('Format state sinkronisasi tidak valid.');
    }
    this.state = nextState;
    this.commit();
    return this.state;
  }
}

export const storeManager = new StoreManager();
