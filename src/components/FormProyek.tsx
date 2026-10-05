import { simpanProyek } from "@/app/(app)/actions";

export type DataProyek = {
  id: string;
  kode: string;
  nama: string;
  klien: string | null;
  lokasi: string | null;
  nilai_kontrak: number;
  tgl_mulai: string | null;
  tgl_selesai: string | null;
  status: string;
  divisi_id: string;
};

export default function FormProyek({
  proyek,
  divisi,
  pilihDivisi,
}: {
  proyek?: DataProyek;
  divisi: { id: string; nama: string }[];
  pilihDivisi: boolean;
}) {
  return (
    <form action={simpanProyek} className="grid gap-3 md:grid-cols-3">
      {proyek && <input type="hidden" name="id" value={proyek.id} />}
      <div>
        <label className="label">Kode proyek *</label>
        <input className="input" name="kode" required defaultValue={proyek?.kode} placeholder="PC-2026-001" />
      </div>
      <div className="md:col-span-2">
        <label className="label">Nama proyek *</label>
        <input className="input" name="nama" required defaultValue={proyek?.nama} />
      </div>
      <div>
        <label className="label">Klien</label>
        <input className="input" name="klien" defaultValue={proyek?.klien ?? ""} />
      </div>
      <div className="md:col-span-2">
        <label className="label">Lokasi</label>
        <input className="input" name="lokasi" defaultValue={proyek?.lokasi ?? ""} />
      </div>
      <div>
        <label className="label">Nilai kontrak (Rp)</label>
        <input className="input" name="nilai_kontrak" inputMode="numeric" defaultValue={proyek?.nilai_kontrak ?? ""} />
      </div>
      <div>
        <label className="label">Tanggal mulai</label>
        <input className="input" type="date" name="tgl_mulai" defaultValue={proyek?.tgl_mulai ?? ""} />
      </div>
      <div>
        <label className="label">Tanggal selesai</label>
        <input className="input" type="date" name="tgl_selesai" defaultValue={proyek?.tgl_selesai ?? ""} />
      </div>
      <div>
        <label className="label">Status</label>
        <select className="input" name="status" defaultValue={proyek?.status ?? "perencanaan"}>
          <option value="perencanaan">Perencanaan</option>
          <option value="berjalan">Berjalan</option>
          <option value="selesai">Selesai</option>
          <option value="batal">Batal</option>
        </select>
      </div>
      {pilihDivisi && (
        <div>
          <label className="label">Divisi *</label>
          <select className="input" name="divisi_id" required defaultValue={proyek?.divisi_id ?? ""}>
            <option value="" disabled>Pilih divisi</option>
            {divisi.map((d) => (
              <option key={d.id} value={d.id}>{d.nama}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-end md:col-span-3">
        <button className="tombol">{proyek ? "Simpan perubahan" : "Buat proyek"}</button>
      </div>
    </form>
  );
}
