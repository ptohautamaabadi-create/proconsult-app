import Link from "next/link";
import { ambilSesi } from "@/lib/sesi";
import { KOLOM_TRANSAKSI, lampirkanUrlBukti } from "@/lib/transaksi";
import TabelTransaksi, { type BarisTransaksi } from "@/components/TabelTransaksi";
import Galat from "@/components/Galat";

export default async function SemuaTransaksi({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; galat?: string }>;
}) {
  const { status = "diajukan", galat } = await searchParams;
  const { supabase, profil } = await ambilSesi();
  let q = supabase
    .from("transaksi")
    .select(KOLOM_TRANSAKSI)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  if (status !== "semua") q = q.eq("status", status);
  const { data } = await q.returns<(BarisTransaksi & { bukti_path: string | null })[]>();
  const transaksi = await lampirkanUrlBukti(supabase, data ?? []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="judul">Transaksi</h1>
        <div className="flex gap-3 text-sm">
          {[["diajukan", "Menunggu persetujuan"], ["disetujui", "Disetujui"], ["ditolak", "Ditolak"], ["semua", "Semua"]].map(([v, l]) => (
            <Link key={v} href={`/transaksi?status=${v}`} className={status === v ? "font-semibold text-sky-700" : "text-slate-500"}>
              {l}
            </Link>
          ))}
        </div>
      </div>
      <Galat pesan={galat} />
      <p className="text-sm text-slate-500">Untuk menginput transaksi baru, buka halaman proyeknya.</p>
      <div className="kartu">
        <TabelTransaksi data={transaksi} profil={profil} kembali="/transaksi" tampilkanProyek />
      </div>
    </>
  );
}
