import Link from "next/link";
import { ambilSesi, LABEL_PERAN } from "@/lib/sesi";
import { keluar } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profil } = await ambilSesi();
  const menu = [
    { href: "/", label: "Ringkasan" },
    { href: "/proyek", label: "Proyek" },
    { href: "/transaksi", label: "Transaksi" },
    ...(profil.peran === "owner" ? [{ href: "/pengguna", label: "Pengguna & Divisi" }] : []),
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-sky-800">Pro Consult</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {menu.map((m) => (
              <Link key={m.href} href={m.href} className="text-slate-600 hover:text-sky-700">
                {m.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {profil.nama} · {LABEL_PERAN[profil.peran]}
              {profil.divisi ? ` · ${profil.divisi.nama}` : ""}
            </span>
            <form action={keluar}>
              <button className="tombol-sekunder" type="submit">Keluar</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}
