import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Peran = "owner" | "kepala_divisi" | "keuangan" | "estimator" | "pelaksana";

export type Profil = {
  id: string;
  nama: string;
  email: string;
  peran: Peran;
  divisi_id: string | null;
  aktif: boolean;
  divisi: { nama: string } | null;
};

export const LABEL_PERAN: Record<Peran, string> = {
  owner: "Owner",
  kepala_divisi: "Kepala Divisi",
  keuangan: "Keuangan",
  estimator: "Estimator",
  pelaksana: "Pelaksana Lapangan",
};

export async function ambilSesi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profil")
    .select("id, nama, email, peran, divisi_id, aktif, divisi(nama)")
    .eq("id", user.id)
    .single<Profil>();

  if (!profil || !profil.aktif) redirect("/login?pesan=akun-nonaktif");
  return { supabase, profil };
}

export const bisaKelolaProyek = (p: Profil) => p.peran === "owner" || p.peran === "kepala_divisi";
export const bisaMenyetujui = (p: Profil) =>
  p.peran === "owner" || p.peran === "kepala_divisi" || p.peran === "keuangan";
export const bisaInputTransaksi = (p: Profil) => p.peran !== "estimator";
