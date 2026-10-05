-- Tahap 1: divisi, pengguna & peran, proyek, keuangan proyek.
-- Isolasi data antar divisi ditegakkan oleh Row Level Security (RLS):
-- hanya peran 'owner' yang bisa melihat lintas divisi.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipe
-- ---------------------------------------------------------------------------
create type peran_pengguna as enum ('owner', 'kepala_divisi', 'keuangan', 'estimator', 'pelaksana');
create type status_proyek as enum ('perencanaan', 'berjalan', 'selesai', 'batal');
create type jenis_transaksi as enum ('masuk', 'keluar');
create type status_transaksi as enum ('diajukan', 'disetujui', 'ditolak');

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
create table divisi (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,
  created_at timestamptz not null default now()
);

create table profil (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  email text not null,
  peran peran_pengguna not null,
  divisi_id uuid references divisi (id),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  -- selain owner, setiap pengguna wajib punya divisi
  constraint profil_divisi_wajib check (peran = 'owner' or divisi_id is not null)
);

create table proyek (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,
  nama text not null,
  klien text,
  lokasi text,
  nilai_kontrak numeric(18, 2) not null default 0,
  tgl_mulai date,
  tgl_selesai date,
  status status_proyek not null default 'perencanaan',
  divisi_id uuid not null references divisi (id),
  dibuat_oleh uuid references profil (id),
  created_at timestamptz not null default now()
);

-- Pelaksana lapangan hanya melihat proyek yang ditugaskan kepadanya.
create table proyek_anggota (
  proyek_id uuid not null references proyek (id) on delete cascade,
  pengguna_id uuid not null references profil (id) on delete cascade,
  primary key (proyek_id, pengguna_id)
);

create table kategori_transaksi (
  id serial primary key,
  nama text not null,
  jenis jenis_transaksi not null,
  unique (nama, jenis)
);

create table transaksi (
  id uuid primary key default gen_random_uuid(),
  proyek_id uuid not null references proyek (id) on delete restrict,
  divisi_id uuid not null references divisi (id),
  tanggal date not null default current_date,
  jenis jenis_transaksi not null,
  kategori_id int references kategori_transaksi (id),
  uraian text not null,
  jumlah numeric(18, 2) not null check (jumlah > 0),
  metode_bayar text,
  no_bukti text,
  bukti_path text,
  status status_transaksi not null default 'diajukan',
  catatan_persetujuan text,
  dibuat_oleh uuid not null references profil (id) default auth.uid(),
  disetujui_oleh uuid references profil (id),
  disetujui_pada timestamptz,
  created_at timestamptz not null default now()
);

create index on transaksi (proyek_id, tanggal);
create index on proyek (divisi_id);

create table log_aktivitas (
  id bigserial primary key,
  waktu timestamptz not null default now(),
  pengguna_id uuid,
  divisi_id uuid,
  tabel text not null,
  aksi text not null,
  data_id text,
  data jsonb
);

-- ---------------------------------------------------------------------------
-- Fungsi bantu (security definer agar tidak memicu RLS rekursif)
-- ---------------------------------------------------------------------------
create or replace function app_peran() returns peran_pengguna
language sql stable security definer set search_path = public as $$
  select peran from profil where id = auth.uid() and aktif
$$;

create or replace function app_divisi() returns uuid
language sql stable security definer set search_path = public as $$
  select divisi_id from profil where id = auth.uid() and aktif
$$;

create or replace function app_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_peran() = 'owner', false)
$$;

create or replace function app_bisa_akses_proyek(p_proyek uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when app_peran() is null then false
    when app_peran() = 'owner' then true
    when app_peran() = 'pelaksana' then exists (
      select 1 from proyek_anggota a join proyek p on p.id = a.proyek_id
      where a.proyek_id = p_proyek and a.pengguna_id = auth.uid() and p.divisi_id = app_divisi())
    else exists (select 1 from proyek where id = p_proyek and divisi_id = app_divisi())
  end
$$;

create or replace function app_bisa_kelola_divisi(p_divisi uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select app_is_owner() or (app_peran() = 'kepala_divisi' and app_divisi() = p_divisi)
$$;

-- ---------------------------------------------------------------------------
-- Trigger transaksi: isi divisi dari proyek, atur status & persetujuan
-- ---------------------------------------------------------------------------
create or replace function trg_transaksi_sebelum() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_peran peran_pengguna := app_peran();
begin
  select divisi_id into new.divisi_id from proyek where id = new.proyek_id;

  if tg_op = 'INSERT' then
    new.dibuat_oleh := coalesce(auth.uid(), new.dibuat_oleh);
    -- input dari lapangan masuk sebagai pengajuan, peran lain langsung disetujui
    if v_peran in ('owner', 'kepala_divisi', 'keuangan') then
      new.status := 'disetujui';
      new.disetujui_oleh := auth.uid();
      new.disetujui_pada := now();
    else
      new.status := 'diajukan';
      new.disetujui_oleh := null;
      new.disetujui_pada := null;
    end if;
  else
    new.dibuat_oleh := old.dibuat_oleh;
    new.created_at := old.created_at;
    if new.status is distinct from old.status then
      if v_peran not in ('owner', 'kepala_divisi', 'keuangan') then
        raise exception 'Anda tidak berhak mengubah status persetujuan transaksi';
      end if;
      if new.status = 'diajukan' then
        new.disetujui_oleh := null;
        new.disetujui_pada := null;
      else
        new.disetujui_oleh := auth.uid();
        new.disetujui_pada := now();
      end if;
    else
      new.disetujui_oleh := old.disetujui_oleh;
      new.disetujui_pada := old.disetujui_pada;
    end if;
  end if;
  return new;
end $$;

create trigger transaksi_sebelum
before insert or update on transaksi
for each row execute function trg_transaksi_sebelum();

-- Log aktivitas untuk semua perubahan data penting
create or replace function trg_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into log_aktivitas (pengguna_id, divisi_id, tabel, aksi, data_id, data)
  values (auth.uid(), (v_row ->> 'divisi_id')::uuid, tg_table_name, lower(tg_op), v_row ->> 'id', v_row);
  return coalesce(new, old);
end $$;

create trigger log_proyek after insert or update or delete on proyek
for each row execute function trg_log();
create trigger log_transaksi after insert or update or delete on transaksi
for each row execute function trg_log();
create trigger log_profil after insert or update or delete on profil
for each row execute function trg_log();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table divisi enable row level security;
alter table profil enable row level security;
alter table proyek enable row level security;
alter table proyek_anggota enable row level security;
alter table kategori_transaksi enable row level security;
alter table transaksi enable row level security;
alter table log_aktivitas enable row level security;

-- divisi
create policy divisi_lihat on divisi for select to authenticated
  using (app_is_owner() or id = app_divisi());
create policy divisi_kelola on divisi for all to authenticated
  using (app_is_owner()) with check (app_is_owner());

-- profil: pengguna (aktif) melihat dirinya; kepala divisi melihat anggota divisinya; owner semua.
-- Pembuatan/perubahan akun dilakukan server dengan service role (halaman Pengguna, khusus owner).
create policy profil_lihat on profil for select to authenticated
  using (id = auth.uid() or app_is_owner()
         or (app_peran() is not null and app_peran() <> 'pelaksana' and divisi_id = app_divisi()));
create policy profil_kelola on profil for all to authenticated
  using (app_is_owner()) with check (app_is_owner());

-- proyek
create policy proyek_lihat on proyek for select to authenticated
  using (app_bisa_akses_proyek(id));
create policy proyek_tambah on proyek for insert to authenticated
  with check (app_bisa_kelola_divisi(divisi_id));
create policy proyek_ubah on proyek for update to authenticated
  using (app_bisa_kelola_divisi(divisi_id)) with check (app_bisa_kelola_divisi(divisi_id));
create policy proyek_hapus on proyek for delete to authenticated
  using (app_is_owner());

-- anggota proyek
create policy anggota_lihat on proyek_anggota for select to authenticated
  using (app_bisa_akses_proyek(proyek_id));
create policy anggota_kelola on proyek_anggota for all to authenticated
  using (app_bisa_kelola_divisi((select divisi_id from proyek where id = proyek_id)))
  with check (app_bisa_kelola_divisi((select divisi_id from proyek where id = proyek_id))
              and exists (select 1 from profil u join proyek p on p.id = proyek_id
                          where u.id = pengguna_id and u.divisi_id = p.divisi_id));

-- kategori: semua pengguna aktif boleh membaca, owner mengelola
create policy kategori_lihat on kategori_transaksi for select to authenticated
  using (app_peran() is not null);
create policy kategori_kelola on kategori_transaksi for all to authenticated
  using (app_is_owner()) with check (app_is_owner());

-- transaksi
create policy transaksi_lihat on transaksi for select to authenticated
  using (app_bisa_akses_proyek(proyek_id));
create policy transaksi_tambah on transaksi for insert to authenticated
  with check (app_bisa_akses_proyek(proyek_id)
              and app_peran() in ('owner', 'kepala_divisi', 'keuangan', 'pelaksana'));
create policy transaksi_ubah on transaksi for update to authenticated
  using (app_bisa_akses_proyek(proyek_id) and (
           app_peran() in ('owner', 'kepala_divisi', 'keuangan')
           or (dibuat_oleh = auth.uid() and status = 'diajukan')))
  with check (app_bisa_akses_proyek(proyek_id));
create policy transaksi_hapus on transaksi for delete to authenticated
  using (app_bisa_akses_proyek(proyek_id) and (
           app_peran() in ('owner', 'kepala_divisi')
           or (dibuat_oleh = auth.uid() and status = 'diajukan')));

-- log: owner semua, kepala divisi untuk divisinya
create policy log_lihat on log_aktivitas for select to authenticated
  using (app_is_owner() or (app_peran() = 'kepala_divisi' and divisi_id = app_divisi()));

-- Rekap per proyek (mengikuti RLS tabel asal)
create view rekap_proyek with (security_invoker = true) as
select p.id, p.kode, p.nama, p.klien, p.divisi_id, p.nilai_kontrak, p.status,
  coalesce(sum(t.jumlah) filter (where t.jenis = 'masuk' and t.status = 'disetujui'), 0) as total_masuk,
  coalesce(sum(t.jumlah) filter (where t.jenis = 'keluar' and t.status = 'disetujui'), 0) as total_keluar,
  count(t.id) filter (where t.status = 'diajukan') as menunggu_persetujuan
from proyek p
left join transaksi t on t.proyek_id = p.id
group by p.id;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on log_aktivitas from authenticated;

-- ---------------------------------------------------------------------------
-- Penyimpanan bukti transaksi (nota/foto). Path: <proyek_id>/<nama-file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('bukti', 'bukti', false)
on conflict (id) do nothing;

create policy bukti_lihat on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
           then app_bisa_akses_proyek(split_part(name, '/', 1)::uuid) else false end);
create policy bukti_unggah on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti' and case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
           then app_bisa_akses_proyek(split_part(name, '/', 1)::uuid) else false end);

-- ---------------------------------------------------------------------------
-- Data awal
-- ---------------------------------------------------------------------------
insert into kategori_transaksi (nama, jenis) values
  ('Termin dari klien', 'masuk'),
  ('Uang muka (DP)', 'masuk'),
  ('Dana operasional dari kantor', 'masuk'),
  ('Material', 'keluar'),
  ('Upah tukang / mandor', 'keluar'),
  ('Subkontraktor', 'keluar'),
  ('Sewa alat', 'keluar'),
  ('Transportasi & pengiriman', 'keluar'),
  ('Konsumsi', 'keluar'),
  ('Perizinan & administrasi', 'keluar'),
  ('Operasional lain-lain', 'keluar');
