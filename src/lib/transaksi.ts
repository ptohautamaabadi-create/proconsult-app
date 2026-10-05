import type { SupabaseClient } from "@supabase/supabase-js";
import type { BarisTransaksi } from "@/components/TabelTransaksi";

export const KOLOM_TRANSAKSI =
  "id, tanggal, jenis, uraian, jumlah, metode_bayar, no_bukti, status, dibuat_oleh, bukti_path, kategori:kategori_transaksi(nama), proyek(kode, nama), pembuat:profil!transaksi_dibuat_oleh_fkey(nama)";

// Tautan bukti berlaku 1 jam dan hanya dibuat untuk file yang boleh diakses (RLS storage).
export async function lampirkanUrlBukti(
  supabase: SupabaseClient,
  rows: (BarisTransaksi & { bukti_path: string | null })[],
) {
  const paths = rows.map((r) => r.bukti_path).filter((p): p is string => !!p);
  if (paths.length === 0) return rows;
  const { data } = await supabase.storage.from("bukti").createSignedUrls(paths, 3600);
  const peta = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => ({ ...r, bukti_url: r.bukti_path ? peta.get(r.bukti_path) ?? null : null }));
}
