# Pro Consult — Aplikasi Operasional

Aplikasi web untuk tim operasional Pro Consult. **Tahap 1**: login per peran, divisi, master proyek, dan keuangan proyek (input transaksi, foto bukti, persetujuan, rekap, unduh Excel).

Tahap berikutnya: RAB & SPK → Progres & Berita Acara → Invoice & dashboard owner.

## Peran dan hak akses

| Peran | Bisa melihat | Bisa melakukan |
|---|---|---|
| Owner | Semua divisi | Semua, termasuk membuat akun & divisi |
| Kepala Divisi | Semua proyek di divisinya | Buat/ubah proyek, tugaskan pelaksana, input & setujui transaksi |
| Keuangan | Semua proyek di divisinya | Input & setujui transaksi |
| Estimator | Semua proyek di divisinya | Lihat (RAB/SPK di tahap 2) |
| Pelaksana Lapangan | Hanya proyek yang ditugaskan | Input transaksi + foto nota (menunggu persetujuan) |

Isolasi divisi ditegakkan di database (Row Level Security di `supabase/migrations/0001_tahap1.sql`), bukan hanya di tampilan. Semua perubahan tercatat di `log_aktivitas`.

## Menjalankan

1. Buat project di [supabase.com](https://supabase.com). Buka **SQL Editor**, jalankan isi `supabase/migrations/0001_tahap1.sql`.
2. Salin `.env.example` menjadi `.env.local` dan isi dari **Project Settings → API**.
3. `npm install`
4. Buat akun owner pertama: `node --env-file=.env.local scripts/buat-owner.mjs email@pro-consult.id "Nama" passwordRahasia`
5. `npm run dev`, buka http://localhost:3000, login sebagai owner, lalu buat divisi dan akun tim di menu **Pengguna & Divisi**.

Untuk online: impor repository ke [Vercel](https://vercel.com) dan isi tiga variabel environment yang sama.

## Menguji isolasi data

Dengan PostgreSQL lokal:

```bash
createdb uji
psql -d uji -f supabase/tests/stub_supabase.sql -f supabase/migrations/0001_tahap1.sql -f supabase/tests/uji_isolasi.sql
```

Semua baris harus `lulus` dan diakhiri `SEMUA UJI LULUS`.
