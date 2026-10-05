-- Uji isolasi data antar divisi. Jalankan setelah stub_supabase.sql + migrasi.
\set ON_ERROR_STOP 1
insert into divisi (id, nama) values
  ('d0000000-0000-0000-0000-00000000000a', 'Divisi A'),
  ('d0000000-0000-0000-0000-00000000000b', 'Divisi B');
insert into auth.users (id) select ('a0000000-0000-0000-0000-00000000000' || x)::uuid from unnest(array['1','2','3','4','5','6']) x;
insert into profil (id, nama, email, peran, divisi_id) values
  ('a0000000-0000-0000-0000-000000000001', 'Owner', 'o@x', 'owner', null),
  ('a0000000-0000-0000-0000-000000000002', 'Kadiv A', 'ka@x', 'kepala_divisi', 'd0000000-0000-0000-0000-00000000000a'),
  ('a0000000-0000-0000-0000-000000000003', 'Keu A', 'kua@x', 'keuangan', 'd0000000-0000-0000-0000-00000000000a'),
  ('a0000000-0000-0000-0000-000000000004', 'Lap A', 'la@x', 'pelaksana', 'd0000000-0000-0000-0000-00000000000a'),
  ('a0000000-0000-0000-0000-000000000005', 'Kadiv B', 'kb@x', 'kepala_divisi', 'd0000000-0000-0000-0000-00000000000b'),
  ('a0000000-0000-0000-0000-000000000006', 'Lap A2', 'la2@x', 'pelaksana', 'd0000000-0000-0000-0000-00000000000a');
insert into proyek (id, kode, nama, divisi_id) values
  ('b0000000-0000-0000-0000-0000000000a1', 'A-01', 'Proyek A1', 'd0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-0000000000a2', 'A-02', 'Proyek A2', 'd0000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-0000000000b1', 'B-01', 'Proyek B1', 'd0000000-0000-0000-0000-00000000000b');
insert into proyek_anggota values ('b0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-000000000004');

create function cek(label text, kondisi boolean) returns void language plpgsql as $$
begin
  if not kondisi then raise exception 'GAGAL: %', label; end if;
  raise notice 'lulus: %', label;
end $$;
grant execute on function cek(text, boolean) to authenticated;

create function sebagai(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
grant execute on function sebagai(text) to authenticated;

set role authenticated;

-- Kepala divisi B
select sebagai('a0000000-0000-0000-0000-000000000005');
select cek('kadiv B hanya lihat proyek divisi B', (select count(*) from proyek) = 1 and (select kode from proyek) = 'B-01');
select cek('kadiv B tidak lihat divisi A', (select count(*) from divisi) = 1);
insert into transaksi (proyek_id, jenis, uraian, jumlah) values ('b0000000-0000-0000-0000-0000000000b1', 'keluar', 'Semen', 1000000);
select cek('transaksi kadiv langsung disetujui', (select status from transaksi) = 'disetujui');
do $$ begin
  insert into transaksi (proyek_id, jenis, uraian, jumlah) values ('b0000000-0000-0000-0000-0000000000a1', 'keluar', 'Susup', 1);
  raise exception 'GAGAL: kadiv B bisa input ke proyek divisi A';
exception when insufficient_privilege then raise notice 'lulus: kadiv B ditolak input ke divisi A';
end $$;
do $$ begin
  insert into proyek (kode, nama, divisi_id) values ('X', 'X', 'd0000000-0000-0000-0000-00000000000a');
  raise exception 'GAGAL: kadiv B bisa buat proyek di divisi A';
exception when insufficient_privilege then raise notice 'lulus: kadiv B ditolak buat proyek divisi A';
end $$;
update proyek set nama = 'Bajak' where kode = 'A-01';
select cek('kadiv B tidak bisa ubah proyek A', (select nama from proyek where id = 'b0000000-0000-0000-0000-0000000000a1') is null);

-- Pelaksana A (hanya ditugaskan ke A-01)
select sebagai('a0000000-0000-0000-0000-000000000004');
select cek('pelaksana hanya lihat proyek yang ditugaskan', (select count(*) from proyek) = 1 and (select kode from proyek) = 'A-01');
insert into transaksi (proyek_id, jenis, uraian, jumlah, status) values ('b0000000-0000-0000-0000-0000000000a1', 'keluar', 'Paku', 50000, 'disetujui');
select cek('transaksi pelaksana masuk sebagai diajukan', (select status from transaksi where uraian = 'Paku') = 'diajukan');
select cek('pelaksana tidak lihat transaksi divisi B', (select count(*) from transaksi) = 1);
do $$ begin
  update transaksi set status = 'disetujui' where uraian = 'Paku';
  raise exception 'GAGAL: pelaksana bisa menyetujui sendiri';
exception when raise_exception then
  if sqlerrm like 'GAGAL%' then raise; end if;
  raise notice 'lulus: pelaksana tidak bisa menyetujui sendiri';
end $$;
do $$ begin
  insert into transaksi (proyek_id, jenis, uraian, jumlah) values ('b0000000-0000-0000-0000-0000000000a2', 'keluar', 'X', 1);
  raise exception 'GAGAL: pelaksana bisa input ke proyek yang tidak ditugaskan';
exception when insufficient_privilege then raise notice 'lulus: pelaksana ditolak di proyek yang tidak ditugaskan';
end $$;
select cek('pelaksana tidak lihat log', (select count(*) from log_aktivitas) = 0);

-- Pelaksana A2 (tidak ditugaskan)
select sebagai('a0000000-0000-0000-0000-000000000006');
select cek('pelaksana tanpa tugas tidak lihat proyek', (select count(*) from proyek) = 0);

-- Keuangan A menyetujui
select sebagai('a0000000-0000-0000-0000-000000000003');
select cek('keuangan A lihat semua proyek divisi A', (select count(*) from proyek) = 2);
update transaksi set status = 'disetujui' where uraian = 'Paku';
select cek('keuangan A bisa menyetujui', (select status from transaksi where uraian = 'Paku') = 'disetujui'
       and (select disetujui_oleh from transaksi where uraian = 'Paku') = 'a0000000-0000-0000-0000-000000000003');
select cek('rekap divisi A hanya proyek A', (select count(*) from rekap_proyek) = 2
       and (select total_keluar from rekap_proyek where kode = 'A-01') = 50000);
select cek('bukti divisi B tidak bisa diakses', not exists (select 1 from storage.objects));
do $$ begin
  insert into storage.objects (bucket_id, name) values ('bukti', 'b0000000-0000-0000-0000-0000000000b1/nota.jpg');
  raise exception 'GAGAL: keuangan A bisa unggah bukti ke proyek B';
exception when insufficient_privilege then raise notice 'lulus: unggah bukti lintas divisi ditolak';
end $$;
insert into storage.objects (bucket_id, name) values ('bukti', 'b0000000-0000-0000-0000-0000000000a1/nota.jpg');

-- Owner
select sebagai('a0000000-0000-0000-0000-000000000001');
select cek('owner lihat semua proyek', (select count(*) from proyek) = 3);
select cek('owner lihat semua transaksi', (select count(*) from transaksi) = 2);
select cek('owner lihat log', (select count(*) from log_aktivitas) > 0);

-- Tanpa login
select sebagai('');
select cek('tanpa login tidak lihat apa pun', (select count(*) from proyek) = 0 and (select count(*) from transaksi) = 0);
reset role;
\echo SEMUA UJI LULUS
