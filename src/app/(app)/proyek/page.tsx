import Link from "next/link";
import { ambilSesi, bisaKelolaProyek } from "@/lib/sesi";
import { formatRupiah, formatTanggal } from "@/lib/format";

export default async function DaftarProyek() {
  const { supabase, profil } = await ambilSesi();
  const { data } = await supabase
    .from("proyek")
    .select("id, kode, nama, klien, lokasi, nilai_kontrak, tgl_mulai, tgl_selesai, status, divisi(nama)")
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string; kode: string; nama: string; klien: string | null; lokasi: string | null;
        nilai_kontrak: number; tgl_mulai: string | null; tgl_selesai: string | null; status: string;
        divisi: { nama: string } | null;
      }[]
    >();
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="judul">Proyek</h1>
        {bisaKelolaProyek(profil) && <Link href="/proyek/baru" className="tombol">+ Proyek baru</Link>}
      </div>
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Kode</th><th>Nama</th><th>Klien</th><th>Divisi</th><th>Periode</th>
              <th className="text-right">Nilai kontrak</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id}>
                <td><Link href={`/proyek/${p.id}`} className="font-medium text-sky-700 hover:underline">{p.kode}</Link></td>
                <td>{p.nama}<div className="text-xs text-slate-400">{p.lokasi}</div></td>
                <td>{p.klien ?? "-"}</td>
                <td>{p.divisi?.nama}</td>
                <td className="whitespace-nowrap">{formatTanggal(p.tgl_mulai)} – {formatTanggal(p.tgl_selesai)}</td>
                <td className="text-right">{formatRupiah(p.nilai_kontrak)}</td>
                <td>{p.status}</td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-slate-500">Belum ada proyek yang bisa Anda lihat.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
