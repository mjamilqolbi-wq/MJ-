export type ProductCategory =
  | 'Minuman'
  | 'Roti & Kue'
  | 'Bahan & Ritel'
  | 'Merchandise';

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Transfer Bank' | 'Debit';

export type LoyaltyTier = 'Reguler' | 'Silver' | 'Gold' | 'Platinum';

export type BankProvider =
  | 'BCA Bisnis'
  | 'Mandiri Kopra'
  | 'BRI Qlola'
  | 'BNI Direct'
  | 'BSI Net'
  | 'Brankas Tunai';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
  imageUrl?: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: 'PENJUALAN' | 'RESTOK' | 'OPNAME';
  delta: number;
  stockBefore: number;
  stockAfter: number;
  note: string;
  referenceId?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  email: string;
  tier: LoyaltyTier;
  points: number;
  totalSpend: number;
  visitCount: number;
  lastVisitAt: string;
  joinedAt: string;
  notes?: string;
}

export interface LoyaltyLog {
  id: string;
  customerId: string;
  customerName: string;
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'CAMPAIGN';
  pointsDelta: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface TransactionItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  receiptNo: string;
  items: TransactionItem[];
  subtotal: number;
  tierDiscountAmount: number;
  pointsRedeemed: number;
  pointsDiscountAmount: number;
  taxAmount: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  bankAccountId: string;
  bankAccountName: string;
  cashReceived: number;
  changeAmount: number;
  customerId?: string;
  customerName?: string;
  customerTier?: LoyaltyTier;
  pointsEarned: number;
  cashierName: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  provider: BankProvider;
  accountName: string;
  maskedNumber: string;
  fullNumber: string;
  balance: number;
  isCashVault: boolean;
  connectionStatus: 'Terhubung' | 'Sinkronisasi';
  encryptionStandard: string;
  lastSyncedAt: string;
}

export interface CashflowEntry {
  id: string;
  accountId: string;
  accountName: string;
  direction: 'IN' | 'OUT';
  category:
    | 'Penjualan POS'
    | 'Pembelian Stok'
    | 'Operasional'
    | 'Setor Tunai'
    | 'Tarik Tunai'
    | 'Modal & Lainnya';
  amount: number;
  description: string;
  referenceNo: string;
  reconciliationStatus: 'Terekonsiliasi' | 'Menunggu Cek';
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  cashierName: string;
  taxRatePercent: number;
  pointsPerAmount: number;
  pointValueRupiah: number;
  securityPin: string;
}

export interface StoreState {
  settings: StoreSettings;
  products: Product[];
  stockMovements: StockMovement[];
  customers: Customer[];
  loyaltyLogs: LoyaltyLog[];
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  cashflowEntries: CashflowEntry[];
}
