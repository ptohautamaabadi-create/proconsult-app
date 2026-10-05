import Link from "next/link";
import { notFound } from "next/navigation";
import { ambilSesi, bisaInputTransaksi, bisaKelolaProyek } from "@/lib/sesi";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { KOLOM_TRANSAKSI, lampirkanUrlBukti } from "@/lib/transaksi";
import { hapusAnggota, tambahAnggota, tambahTransaksi } from "@/app/(app)/actions";
import FormProyek, { type DataProyek } from "@/components/FormProyek";
import TabelTransaksi, { type BarisTransaksi } from "@/components/TabelTransaksi";
import Galat from "@/components/Galat";

export default async function DetailProyek({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ galat?: string; ubah?: string; status?: string }>;
}) {
  const { id } = await params;
  const { galat, ubah, status } = await searchParams;
  const { supabase, profil } = await ambilSesi();

  const { data: proyek } = await supabase
    .from("proyek")
    .select("id, kode, nama, klien, lokasi, nilai_kontrak, tgl_mulai, tgl_selesai, status, divisi_id, divisi(nama)")
    .eq("id", id)
    .maybeSingle<DataProyek & { divisi: { nama: string } | null }>();
  // RLS: proyek divisi lain atau yang tidak ditugaskan tidak akan ditemukan
  if (!proyek) notFound();

  const kelola = bisaKelolaProyek(profil);
  let qTransaksi = supabase
    .from("transaksi")
    .select(KOLOM_TRANSAKSI)
    .eq("proyek_id", id)
    .order("tanggal", { ascending: false })
    .order("created_at", { ascending: false });
  if (status) qTransaksi = qTransaksi.eq("status", status);

  const [{ data: transaksiMentah }, { data: kategori }, { data: anggota }, { data: kandidat }, { data: divisi }] =
    await Promise.all([
      qTransaksi.returns<(BarisTransaksi & { bukti_path: string | null })[]>(),
      supabase.from("kategori_transaksi").select("id, nama, jenis").order("id"),
      supabase.from("proyek_anggota").select("pengguna_id, profil(nama)").eq("proyek_id", id)
        .returns<{ pengguna_id: string; profil: { nama: string } | null }[]>(),
      kelola
        ? supabase.from("profil").select("id, nama").eq("divisi_id", proyek.divisi_id).eq("peran", "pelaksana").eq("aktif", true)
        : Promise.resolve({ data: [] as { id: string; nama: string }[] }),
      supabase.from("divisi").select("id, nama").order("nama"),
    ]);

  const transaksi = await lampirkanUrlBukti(supabase, transaksiMentah ?? []);
  const disetujui = transaksi.filter((t) => t.status === "disetujui");
  const masuk = disetujui.filter((t) => t.jenis === "masuk").reduce((s, t) => s + Number(t.jumlah), 0);
  const keluar = disetujui.filter((t) => t.jenis === "keluar").reduce((s, t) => s + Number(t.jumlah), 0);
  const idAnggota = new Set((anggota ?? []).map((a) => a.pengguna_id));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/proyek" className="text-sm text-slate-500 hover:underline">← Proyek</Link>
          <h1 className="judul">{proyek.kode} · {proyek.nama}</h1>
          <p className="text-sm text-slate-500">
            {[proyek.klien, proyek.lokasi, proyek.divisi?.nama].filter(Boolean).join(" · ")} ·{" "}
            {formatTanggal(proyek.tgl_mulai)} – {formatTanggal(proyek.tgl_selesai)} · {proyek.status}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/proyek/${id}/csv`} className="tombol-sekunder">Unduh Excel (CSV)</a>
          {kelola && !ubah && <Link href={`/proyek/${id}?ubah=1`} className="tombol-sekunder">Ubah data proyek</Link>}
        </div>
      </div>
      <Galat pesan={galat} />

      {kelola && ubah && (
        <div className="kartu">
          <FormProyek proyek={proyek} divisi={divisi ?? []} pilihDivisi={profil.peran === "owner"} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Nilai kontrak", formatRupiah(proyek.nilai_kontrak)],
          ["Dana masuk", formatRupiah(masuk)],
          ["Pengeluaran", formatRupiah(keluar)],
          ["Saldo kas proyek", formatRupiah(masuk - keluar)],
        ].map(([l, v]) => (
          <div key={l} className="kartu">
            <div className="text-xs text-slate-500">{l}</div>
            <div className="mt-1 text-lg font-semibold">{v}</div>
          </div>
        ))}
      </div>

      {bisaInputTransaksi(profil) && (
        <div className="kartu">
          <h2 className="mb-3 font-semibold">Input transaksi</h2>
          <form action={tambahTransaksi} className="grid gap-3 md:grid-cols-4">
            <input type="hidden" name="proyek_id" value={id} />
            <div>
              <label className="label">Tanggal *</label>
              <input className="input" type="date" name="tanggal" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="label">Jenis *</label>
              <select className="input" name="jenis" required defaultValue="keluar">
                <option value="keluar">Pengeluaran</option>
                <option value="masuk">Pemasukan</option>
              </select>
            </div>
            <div>
              <label className="label">Kategori</label>
              <select className="input" name="kategori_id" defaultValue="">
                <option value="">-</option>
                {(kategori ?? []).map((k) => (
                  <option key={k.id} value={k.id}>{k.jenis === "masuk" ? "↑" : "↓"} {k.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jumlah (Rp) *</label>
              <input className="input" name="jumlah" inputMode="numeric" required placeholder="1.500.000" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Uraian *</label>
              <input className="input" name="uraian" required placeholder="Beli semen 20 sak" />
            </div>
            <div>
              <label className="label">Metode bayar</label>
              <select className="input" name="metode_bayar" defaultValue="Transfer">
                <option>Transfer</option>
                <option>Tunai</option>
                <option>Kas kecil</option>
                <option>Giro / cek</option>
              </select>
            </div>
            <div>
              <label className="label">No. nota / bukti</label>
              <input className="input" name="no_bukti" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Foto / file bukti (maks 5 MB)</label>
              <input className="input" type="file" name="bukti" accept="image/*,application/pdf" capture="environment" />
            </div>
            <div className="flex items-end md:col-span-2">
              <button className="tombol">Simpan transaksi</button>
              {profil.peran === "pelaksana" && (
                <span className="ml-3 text-xs text-slate-500">Transaksi Anda akan menunggu persetujuan.</span>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="kartu space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Transaksi</h2>
          <div className="flex gap-2 text-sm">
            {[["", "Semua"], ["diajukan", "Menunggu"], ["disetujui", "Disetujui"], ["ditolak", "Ditolak"]].map(([v, l]) => (
              <Link key={v} href={v ? `/proyek/${id}?status=${v}` : `/proyek/${id}`}
                className={(status ?? "") === v ? "font-semibold text-sky-700" : "text-slate-500"}>
                {l}
              </Link>
            ))}
          </div>
        </div>
        <TabelTransaksi data={transaksi} profil={profil} kembali={`/proyek/${id}`} />
      </div>

      {kelola && (
        <div className="kartu space-y-3">
          <h2 className="font-semibold">Pelaksana lapangan yang ditugaskan</h2>
          <p className="text-xs text-slate-500">Pelaksana hanya bisa melihat dan menginput proyek yang ditugaskan kepadanya.</p>
          <ul className="space-y-1 text-sm">
            {(anggota ?? []).map((a) => (
              <li key={a.pengguna_id} className="flex items-center gap-2">
                {a.profil?.nama}
                <form action={hapusAnggota}>
                  <input type="hidden" name="proyek_id" value={id} />
                  <input type="hidden" name="pengguna_id" value={a.pengguna_id} />
                  <button className="text-xs text-red-600 hover:underline">lepas</button>
                </form>
              </li>
            ))}
            {(anggota ?? []).length === 0 && <li className="text-slate-500">Belum ada.</li>}
          </ul>
          <form action={tambahAnggota} className="flex gap-2">
            <input type="hidden" name="proyek_id" value={id} />
            <select className="input max-w-xs" name="pengguna_id" required defaultValue="">
              <option value="" disabled>Pilih pelaksana</option>
              {(kandidat ?? []).filter((k) => !idAnggota.has(k.id)).map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
            <button className="tombol-sekunder">Tugaskan</button>
          </form>
        </div>
      )}
    </>
  );
}
