function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

import type { Transaksi, BahanBaku, Produk, ResepProdukWithBahan } from './types';
import { calculateHpp } from './hpp';
import { formatCurrency } from './format';

export function exportTransaksiCSV(transaksi: Transaksi[]) {
  downloadCSV(
    `backup-transaksi-${new Date().toISOString().split('T')[0]}.csv`,
    ['Tanggal', 'Jenis', 'Kategori', 'Jumlah', 'Keterangan', 'Produk', 'Qty'],
    transaksi.map((t) => [
      t.tanggal,
      t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
      t.kategori,
      t.jumlah,
      t.keterangan || '',
      t.produk?.nama_produk || '',
      t.qty || '',
    ]),
  );
}

export function exportBahanBakuCSV(bahan: BahanBaku[]) {
  downloadCSV(
    `backup-bahan-baku-${new Date().toISOString().split('T')[0]}.csv`,
    ['Nama', 'Satuan', 'Harga Beli', 'Stok Saat Ini', 'Stok Minimum'],
    bahan.map((b) => [b.nama, b.satuan, b.harga_beli_per_satuan, b.stok_saat_ini, b.stok_minimum]),
  );
}

export function exportProdukCSV(produk: Produk[], resep: ResepProdukWithBahan[]) {
  downloadCSV(
    `backup-produk-${new Date().toISOString().split('T')[0]}.csv`,
    ['Nama Produk', 'Kategori', 'Harga Jual', 'HPP', 'Margin', 'Margin %'],
    produk.map((p) => {
      const hpp = calculateHpp(resep.filter((r) => r.produk_id === p.id));
      const margin = p.harga_jual - hpp;
      const marginPct = p.harga_jual > 0 ? (margin / p.harga_jual) * 100 : 0;
      return [p.nama_produk, p.kategori, p.harga_jual, hpp, margin, `${marginPct.toFixed(1)}%`];
    }),
  );
}
