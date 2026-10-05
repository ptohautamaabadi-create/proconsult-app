import Link from "next/link";
import { ambilSesi } from "@/lib/sesi";
import { formatRupiah } from "@/lib/format";

type Rekap = {
  id: string;
  kode: string;
  nama: string;
  klien: string | null;
  divisi_id: string;
  nilai_kontrak: number;
  status: string;
  total_masuk: number;
  total_keluar: number;
  menunggu_persetujuan: number;
};

export default async function Ringkasan() {
  const { supabase, profil } = await ambilSesi();
  const [{ data: rekap }, { data: divisi }] = await Promise.all([
    supabase.from("rekap_proyek").select("*").order("kode").returns<Rekap[]>(),
    supabase.from("divisi").select("id, nama").order("nama"),
  ]);
  const rows = rekap ?? [];
  const jumlah = (k: keyof Rekap) => rows.reduce((s, r) => s + Number(r[k]), 0);
  const namaDivisi = new Map((divisi ?? []).map((d) => [d.id, d.nama]));

  const kartu = [
    { label: "Proyek aktif", nilai: String(rows.filter((r) => r.status === "berjalan").length) },
    { label: "Total nilai kontrak", nilai: formatRupiah(jumlah("nilai_kontrak")) },
    { label: "Dana masuk", nilai: formatRupiah(jumlah("total_masuk")) },
    { label: "Pengeluaran", nilai: formatRupiah(jumlah("total_keluar")) },
    { label: "Menunggu persetujuan", nilai: String(jumlah("menunggu_persetujuan")) },
  ];

  return (
    <>
      <div>
        <h1 className="judul">Ringkasan</h1>
        <p className="text-sm text-slate-500">
          {profil.peran === "owner" ? "Semua divisi" : profil.divisi?.nama} · hanya transaksi yang sudah disetujui dihitung
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kartu.map((k) => (
          <div key={k.label} className="kartu">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className="mt-1 text-lg font-semibold">{k.nilai}</div>
          </div>
        ))}
      </div>
      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr>
              <th>Proyek</th>
              {profil.peran === "owner" && <th>Divisi</th>}
              <th className="text-right">Nilai kontrak</th>
              <th className="text-right">Masuk</th>
              <th className="text-right">Keluar</th>
              <th className="text-right">Saldo kas</th>
              <th className="text-right">Biaya / kontrak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rasio = Number(r.nilai_kontrak) > 0 ? (Number(r.total_keluar) / Number(r.nilai_kontrak)) * 100 : 0;
              return (
                <tr key={r.id}>
                  <td>
                    <Link href={`/proyek/${r.id}`} className="font-medium text-sky-700 hover:underline">
                      {r.kode}
                    </Link>{" "}
                    {r.nama}
                    {r.menunggu_persetujuan > 0 && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">
                        {r.menunggu_persetujuan} menunggu
                      </span>
                    )}
                  </td>
                  {profil.peran === "owner" && <td>{namaDivisi.get(r.divisi_id)}</td>}
                  <td className="text-right">{formatRupiah(r.nilai_kontrak)}</td>
                  <td className="text-right">{formatRupiah(r.total_masuk)}</td>
                  <td className="text-right">{formatRupiah(r.total_keluar)}</td>
                  <td className="text-right font-medium">{formatRupiah(Number(r.total_masuk) - Number(r.total_keluar))}</td>
                  <td className={`text-right ${rasio > 100 ? "text-red-700" : ""}`}>{rasio.toFixed(1)}%</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-slate-500">Belum ada proyek.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
