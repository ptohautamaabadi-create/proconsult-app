import { formatRupiah, formatTanggal } from "@/lib/format";
import { hapusTransaksi, ubahStatusTransaksi } from "@/app/(app)/actions";
import type { Profil } from "@/lib/sesi";
import { bisaMenyetujui } from "@/lib/sesi";

export type BarisTransaksi = {
  id: string;
  tanggal: string;
  jenis: "masuk" | "keluar";
  uraian: string;
  jumlah: number;
  metode_bayar: string | null;
  no_bukti: string | null;
  status: "diajukan" | "disetujui" | "ditolak";
  dibuat_oleh: string;
  bukti_url?: string | null;
  kategori: { nama: string } | null;
  proyek?: { kode: string; nama: string } | null;
  pembuat: { nama: string } | null;
};

const WARNA_STATUS = {
  diajukan: "bg-amber-100 text-amber-800",
  disetujui: "bg-emerald-100 text-emerald-800",
  ditolak: "bg-red-100 text-red-800",
};

export default function TabelTransaksi({
  data,
  profil,
  kembali,
  tampilkanProyek = false,
}: {
  data: BarisTransaksi[];
  profil: Profil;
  kembali: string;
  tampilkanProyek?: boolean;
}) {
  if (data.length === 0) return <p className="text-sm text-slate-500">Belum ada transaksi.</p>;
  const approver = bisaMenyetujui(profil);
  return (
    <div className="overflow-x-auto">
      <table className="tabel">
        <thead>
          <tr>
            <th>Tanggal</th>
            {tampilkanProyek && <th>Proyek</th>}
            <th>Uraian</th>
            <th>Kategori</th>
            <th className="text-right">Masuk</th>
            <th className="text-right">Keluar</th>
            <th>Bukti</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => {
            const bisaHapus =
              profil.peran === "owner" ||
              profil.peran === "kepala_divisi" ||
              (t.dibuat_oleh === profil.id && t.status === "diajukan");
            return (
              <tr key={t.id}>
                <td className="whitespace-nowrap">{formatTanggal(t.tanggal)}</td>
                {tampilkanProyek && <td className="whitespace-nowrap">{t.proyek?.kode}</td>}
                <td>
                  {t.uraian}
                  <div className="text-xs text-slate-400">
                    {[t.pembuat?.nama, t.metode_bayar, t.no_bukti].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td>{t.kategori?.nama ?? "-"}</td>
                <td className="whitespace-nowrap text-right text-emerald-700">
                  {t.jenis === "masuk" ? formatRupiah(t.jumlah) : ""}
                </td>
                <td className="whitespace-nowrap text-right text-red-700">
                  {t.jenis === "keluar" ? formatRupiah(t.jumlah) : ""}
                </td>
                <td>
                  {t.bukti_url ? (
                    <a href={t.bukti_url} target="_blank" className="text-sky-700 underline">Lihat</a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <span className={`rounded px-2 py-0.5 text-xs ${WARNA_STATUS[t.status]}`}>{t.status}</span>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    {approver && t.status !== "disetujui" && (
                      <form action={ubahStatusTransaksi}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="status" value="disetujui" />
                        <input type="hidden" name="kembali" value={kembali} />
                        <button className="tombol-sekunder text-emerald-700">Setujui</button>
                      </form>
                    )}
                    {approver && t.status === "diajukan" && (
                      <form action={ubahStatusTransaksi}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="status" value="ditolak" />
                        <input type="hidden" name="kembali" value={kembali} />
                        <button className="tombol-sekunder text-red-700">Tolak</button>
                      </form>
                    )}
                    {bisaHapus && (
                      <form action={hapusTransaksi}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="tombol-sekunder text-slate-500" title="Hapus">Hapus</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
