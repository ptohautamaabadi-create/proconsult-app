import { masuk } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string }>;
}) {
  const { pesan } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={masuk} className="kartu w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-sky-800">Pro Consult</h1>
          <p className="text-sm text-slate-500">Masuk ke aplikasi operasional</p>
        </div>
        {pesan && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {pesan === "akun-nonaktif" ? "Akun Anda tidak aktif. Hubungi owner." : "Email atau password salah."}
          </p>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="tombol w-full" type="submit">Masuk</button>
      </form>
    </main>
  );
}
