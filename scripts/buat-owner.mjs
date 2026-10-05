// Membuat akun owner pertama. Jalankan sekali setelah migrasi:
//   node --env-file=.env.local scripts/buat-owner.mjs email@domain.com "Nama Owner" passwordRahasia
import { createClient } from "@supabase/supabase-js";

const [email, nama, password] = process.argv.slice(2);
if (!email || !nama || !password) {
  console.error('Pakai: node --env-file=.env.local scripts/buat-owner.mjs <email> "<nama>" <password>');
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
const { error: e2 } = await admin.from("profil").insert({ id: data.user.id, nama, email, peran: "owner" });
if (e2) throw e2;
console.log(`Owner ${nama} (${email}) berhasil dibuat.`);
