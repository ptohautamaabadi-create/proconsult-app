const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const formatRupiah = (n: number | string | null) => rupiah.format(Number(n ?? 0));

const tgl = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" });
export const formatTanggal = (d: string | null) => (d ? tgl.format(new Date(d)) : "-");
