# Panduan Deploy & Share di Vercel (KasirNusa)

Aplikasi **KasirNusa** sudah dikonfigurasi agar siap di-deploy ke **Vercel** (frontend Vite + React di `dist/` dan backend Express Serverless di `api/index.ts`).

## Cara 1: Deploy Lewat GitHub + Vercel Dashboard (Direkomendasikan)

1. Push seluruh kode proyek ini ke repositori **GitHub** Anda.
2. Buka [vercel.com/new](https://vercel.com/new), pilih **Import Git Repository**, lalu pilih repo proyek ini.
3. Vercel otomatis membaca file `vercel.json`:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **API Serverless**: `/api/(.*)` otomatis diarahkan ke `/api/index.ts`.
4. Klik **Deploy**. Setelah selesai, Anda langsung mendapatkan link publik (`https://nama-proyek.vercel.app`) yang siap dibagikan!

## Cara 2: Deploy Langsung Lewat Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

## Catatan Penyimpanan Data di Vercel
- Saat berjalan di Vercel Serverless, fungsi `/api/*` menggunakan direktori sementara `/tmp` dan aplikasi di browser otomatis menyinkronkan cadangan ke `localStorage` sehingga transaksi, stok, dan member tetap tersimpan saat halaman di-refresh pada browser pengguna.
- Untuk penyimpanan lintas perangkat (multi-kasir terpusat di produksi), Anda dapat menghubungkan database eksternal seperti **PostgreSQL (Neon/Supabase/Cloud SQL)** atau **Firebase Firestore**.
