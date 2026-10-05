import { redirect } from "next/navigation";
import { ambilSesi, LABEL_PERAN, type Peran, type Profil } from "@/lib/sesi";
import { tambahDivisi, tambahPengguna, ubahPengguna } from "@/app/(app)/actions";
import Galat from "@/components/Galat";

const PERAN = Object.keys(LABEL_PERAN) as Peran[];

export default async function HalamanPengguna({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const { supabase, profil } = await ambilSesi();
  if (profil.peran !== "owner") redirect("/");
  const { galat } = await searchParams;
  const [{ data: divisi }, { data: pengguna }] = await Promise.all([
    supabase.from("divisi").select("id, nama").order("nama"),
    supabase.from("profil").select("id, nama, email, peran, divisi_id, aktif, divisi(nama)").order("nama").returns<Profil[]>(),
  ]);

  const pilihDivisi = (nilai?: string | null) => (
    <select className="input" name="divisi_id" defaultValue={nilai ?? ""}>
      <option value="">(tanpa divisi, khusus owner)</option>
      {(divisi ?? []).map((d) => (
        <option key={d.id} value={d.id}>{d.nama}</option>
      ))}
    </select>
  );
  const pilihPeran = (nilai?: Peran) => (
    <select className="input" name="peran" defaultValue={nilai ?? "pelaksana"}>
      {PERAN.map((p) => (
        <option key={p} value={p}>{LABEL_PERAN[p]}</option>
      ))}
    </select>
  );

  return (
    <>
      <h1 className="judul">Pengguna & Divisi</h1>
      <Galat pesan={galat} />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="kartu space-y-3">
          <h2 className="font-semibold">Divisi</h2>
          <ul className="list-disc pl-5 text-sm">
            {(divisi ?? []).map((d) => <li key={d.id}>{d.nama}</li>)}
          </ul>
          <form action={tambahDivisi} className="flex gap-2">
            <input className="input" name="nama" placeholder="Nama divisi baru" required />
            <button className="tombol-sekunder">Tambah</button>
          </form>
        </div>

        <div className="kartu md:col-span-2">
          <h2 className="mb-3 font-semibold">Buat akun tim</h2>
          <form action={tambahPengguna} className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Nama</label><input className="input" name="nama" required /></div>
            <div><label className="label">Email (untuk login)</label><input className="input" type="email" name="email" required /></div>
            <div><label className="label">Password awal (min. 8 karakter)</label><input className="input" name="password" required minLength={8} /></div>
            <div><label className="label">Peran</label>{pilihPeran()}</div>
            <div><label className="label">Divisi</label>{pilihDivisi()}</div>
            <div className="flex items-end"><button className="tombol">Buat akun</button></div>
          </form>
        </div>
      </div>

      <div className="kartu overflow-x-auto">
        <table className="tabel">
          <thead>
            <tr><th>Nama</th><th>Peran</th><th>Divisi</th><th>Aktif</th><th>Ganti password</th><th></th></tr>
          </thead>
          <tbody>
            {(pengguna ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.nama}<div className="text-xs text-slate-400">{u.email}</div></td>
                <td colSpan={5}>
                  <form action={ubahPengguna} className="grid grid-cols-[1fr_1fr_auto_1fr_auto] items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    {pilihPeran(u.peran)}
                    {pilihDivisi(u.divisi_id)}
                    <input type="checkbox" name="aktif" defaultChecked={u.aktif} className="h-4 w-4" />
                    <input className="input" name="password" placeholder="(kosongkan)" minLength={8} />
                    <button className="tombol-sekunder">Simpan</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
