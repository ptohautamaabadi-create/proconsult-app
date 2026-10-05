"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ambilSesi, type Peran } from "@/lib/sesi";
import { createServiceClient } from "@/lib/supabase/server";

const teks = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const angka = (f: FormData, k: string) => Number(String(f.get(k) ?? "0").replace(/[^\d,-]/g, "").replace(",", ".")) || 0;

function gagal(path: string, pesan: string): never {
  redirect(`${path}?galat=${encodeURIComponent(pesan)}`);
}

// ---------------------------------------------------------------- Proyek
export async function simpanProyek(formData: FormData) {
  const { supabase, profil } = await ambilSesi();
  const id = teks(formData, "id");
  const data = {
    kode: teks(formData, "kode"),
    nama: teks(formData, "nama"),
    klien: teks(formData, "klien"),
    lokasi: teks(formData, "lokasi"),
    nilai_kontrak: angka(formData, "nilai_kontrak"),
    tgl_mulai: teks(formData, "tgl_mulai"),
    tgl_selesai: teks(formData, "tgl_selesai"),
    status: teks(formData, "status") ?? "perencanaan",
    divisi_id: profil.peran === "owner" ? teks(formData, "divisi_id") : profil.divisi_id,
  };
  const kembali = id ? `/proyek/${id}` : "/proyek/baru";
  if (!data.kode || !data.nama || !data.divisi_id) gagal(kembali, "Kode, nama, dan divisi wajib diisi");

  const { data: hasil, error } = id
    ? await supabase.from("proyek").update(data).eq("id", id).select("id").single()
    : await supabase.from("proyek").insert({ ...data, dibuat_oleh: profil.id }).select("id").single();
  if (error || !hasil) gagal(kembali, error?.code === "23505" ? "Kode proyek sudah dipakai" : "Gagal menyimpan proyek");

  revalidatePath("/", "layout");
  redirect(`/proyek/${hasil.id}`);
}

export async function tambahAnggota(formData: FormData) {
  const { supabase } = await ambilSesi();
  const proyekId = String(formData.get("proyek_id"));
  const { error } = await supabase
    .from("proyek_anggota")
    .insert({ proyek_id: proyekId, pengguna_id: String(formData.get("pengguna_id")) });
  if (error && error.code !== "23505") gagal(`/proyek/${proyekId}`, "Gagal menambah anggota");
  revalidatePath(`/proyek/${proyekId}`);
}

export async function hapusAnggota(formData: FormData) {
  const { supabase } = await ambilSesi();
  const proyekId = String(formData.get("proyek_id"));
  await supabase
    .from("proyek_anggota")
    .delete()
    .eq("proyek_id", proyekId)
    .eq("pengguna_id", String(formData.get("pengguna_id")));
  revalidatePath(`/proyek/${proyekId}`);
}

// ---------------------------------------------------------------- Transaksi
export async function tambahTransaksi(formData: FormData) {
  const { supabase } = await ambilSesi();
  const proyekId = String(formData.get("proyek_id"));
  const kembali = `/proyek/${proyekId}`;

  let buktiPath: string | null = null;
  const file = formData.get("bukti");
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) gagal(kembali, "Ukuran file bukti maksimal 5 MB");
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    buktiPath = `${proyekId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("bukti").upload(buktiPath, file, { contentType: file.type });
    if (error) gagal(kembali, "Gagal mengunggah bukti");
  }

  const { error } = await supabase.from("transaksi").insert({
    proyek_id: proyekId,
    tanggal: teks(formData, "tanggal"),
    jenis: teks(formData, "jenis"),
    kategori_id: teks(formData, "kategori_id") ? Number(formData.get("kategori_id")) : null,
    uraian: teks(formData, "uraian"),
    jumlah: angka(formData, "jumlah"),
    metode_bayar: teks(formData, "metode_bayar"),
    no_bukti: teks(formData, "no_bukti"),
    bukti_path: buktiPath,
  });
  if (error) gagal(kembali, "Gagal menyimpan transaksi. Periksa uraian dan jumlah.");
  revalidatePath("/", "layout");
  redirect(kembali);
}

export async function ubahStatusTransaksi(formData: FormData) {
  const { supabase } = await ambilSesi();
  const { error } = await supabase
    .from("transaksi")
    .update({ status: String(formData.get("status")), catatan_persetujuan: teks(formData, "catatan") })
    .eq("id", String(formData.get("id")));
  const kembali = String(formData.get("kembali") || "/transaksi");
  if (error) gagal(kembali, "Anda tidak berhak mengubah status transaksi ini");
  revalidatePath("/", "layout");
}

export async function hapusTransaksi(formData: FormData) {
  const { supabase } = await ambilSesi();
  const { data } = await supabase
    .from("transaksi")
    .delete()
    .eq("id", String(formData.get("id")))
    .select("bukti_path");
  const path = data?.[0]?.bukti_path;
  if (path) await createServiceClient().storage.from("bukti").remove([path]);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- Pengguna & divisi (khusus owner)
async function wajibOwner() {
  const sesi = await ambilSesi();
  if (sesi.profil.peran !== "owner") redirect("/");
  return sesi;
}

export async function tambahDivisi(formData: FormData) {
  const { supabase } = await wajibOwner();
  const nama = teks(formData, "nama");
  if (!nama) gagal("/pengguna", "Nama divisi wajib diisi");
  const { error } = await supabase.from("divisi").insert({ nama });
  if (error) gagal("/pengguna", "Nama divisi sudah ada");
  revalidatePath("/pengguna");
}

export async function tambahPengguna(formData: FormData) {
  await wajibOwner();
  const admin = createServiceClient();
  const email = teks(formData, "email");
  const password = teks(formData, "password");
  const nama = teks(formData, "nama");
  const peran = teks(formData, "peran") as Peran | null;
  const divisiId = peran === "owner" ? null : teks(formData, "divisi_id");
  if (!email || !password || !nama || !peran) gagal("/pengguna", "Semua kolom wajib diisi");
  if (password.length < 8) gagal("/pengguna", "Password minimal 8 karakter");
  if (peran !== "owner" && !divisiId) gagal("/pengguna", "Pilih divisi untuk pengguna ini");

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) gagal("/pengguna", "Gagal membuat akun (email mungkin sudah terdaftar)");

  const { error: e2 } = await admin
    .from("profil")
    .insert({ id: data.user.id, nama, email, peran, divisi_id: divisiId });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    gagal("/pengguna", "Gagal menyimpan profil pengguna");
  }
  revalidatePath("/pengguna");
}

export async function ubahPengguna(formData: FormData) {
  const { profil } = await wajibOwner();
  const id = String(formData.get("id"));
  const admin = createServiceClient();
  const peran = teks(formData, "peran") as Peran;
  const aktif = formData.get("aktif") === "on";
  if (id === profil.id && (peran !== "owner" || !aktif)) gagal("/pengguna", "Anda tidak bisa menurunkan atau menonaktifkan akun sendiri");

  const { error } = await admin
    .from("profil")
    .update({ peran, divisi_id: peran === "owner" ? null : teks(formData, "divisi_id"), aktif })
    .eq("id", id);
  if (error) gagal("/pengguna", "Gagal mengubah pengguna (pastikan divisi dipilih)");

  const password = teks(formData, "password");
  if (password) {
    if (password.length < 8) gagal("/pengguna", "Password minimal 8 karakter");
    await admin.auth.admin.updateUserById(id, { password });
  }
  // akun nonaktif tidak bisa login lagi
  await admin.auth.admin.updateUserById(id, { ban_duration: aktif ? "none" : "876000h" });
  revalidatePath("/pengguna");
}
