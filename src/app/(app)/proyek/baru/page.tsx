import { redirect } from "next/navigation";
import { ambilSesi, bisaKelolaProyek } from "@/lib/sesi";
import FormProyek from "@/components/FormProyek";
import Galat from "@/components/Galat";

export default async function ProyekBaru({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
  const { supabase, profil } = await ambilSesi();
  if (!bisaKelolaProyek(profil)) redirect("/proyek");
  const { galat } = await searchParams;
  const { data: divisi } = await supabase.from("divisi").select("id, nama").order("nama");
  return (
    <>
      <h1 className="judul">Proyek baru</h1>
      <Galat pesan={galat} />
      <div className="kartu">
        <FormProyek divisi={divisi ?? []} pilihDivisi={profil.peran === "owner"} />
      </div>
    </>
  );
}
