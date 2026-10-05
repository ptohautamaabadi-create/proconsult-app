import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const sel = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV pakai pemisah titik koma agar langsung terbuka rapi di Excel berbahasa Indonesia.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: proyek } = await supabase.from("proyek").select("kode").eq("id", id).maybeSingle();
  if (!proyek) return new NextResponse("Tidak ditemukan", { status: 404 });

  const { data } = await supabase
    .from("transaksi")
    .select("tanggal, jenis, uraian, jumlah, metode_bayar, no_bukti, status, kategori:kategori_transaksi(nama), pembuat:profil!transaksi_dibuat_oleh_fkey(nama)")
    .eq("proyek_id", id)
    .order("tanggal")
    .returns<{ tanggal: string; jenis: string; uraian: string; jumlah: number; metode_bayar: string | null;
      no_bukti: string | null; status: string; kategori: { nama: string } | null; pembuat: { nama: string } | null }[]>();

  const baris = [
    ["Tanggal", "Kategori", "Uraian", "Masuk", "Keluar", "Metode", "No. Bukti", "Status", "Diinput oleh"],
    ...(data ?? []).map((t) => [
      t.tanggal, t.kategori?.nama, t.uraian,
      t.jenis === "masuk" ? t.jumlah : "", t.jenis === "keluar" ? t.jumlah : "",
      t.metode_bayar, t.no_bukti, t.status, t.pembuat?.nama,
    ]),
  ];
  const csv = "﻿" + baris.map((b) => b.map(sel).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi-${proyek.kode}.csv"`,
    },
  });
}
