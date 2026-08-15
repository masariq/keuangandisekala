export interface BahanBaku {
  id: string;
  user_id: string;
  nama: string;
  satuan: string;
  harga_beli_per_satuan: number;
  stok_saat_ini: number;
  stok_minimum: number;
  updated_at: string;
}

export interface KategoriProduk {
  id: string;
  user_id: string;
  nama_kategori: string;
  deskripsi: string | null;
  urutan_tampil: number;
  aktif: boolean;
  created_at: string;
}

export interface Produk {
  id: string;
  user_id: string;
  nama_produk: string;
  harga_jual: number;
  kategori: string;
  kategori_id: string | null;
  foto_url: string | null;
  created_at: string;
  kategori_produk?: KategoriProduk | null;
}

export interface ResepProduk {
  id: string;
  user_id: string;
  produk_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
  bahan_baku?: BahanBaku;
}

export interface BiayaTetap {
  id: string;
  user_id: string;
  nama_biaya: string;
  jumlah_per_bulan: number;
  tanggal_mulai: string | null;
  aktif: boolean;
}

export interface BiayaVariabelLain {
  id: string;
  user_id: string;
  nama: string;
  jumlah: number;
  tanggal: string;
}

export interface BiayaInvestasi {
  id: string;
  user_id: string;
  nama_aset: string;
  nilai: number;
  tanggal_beli: string | null;
  estimasi_umur_pakai_bulan: number;
}

export interface Transaksi {
  id: string;
  user_id: string;
  tanggal: string;
  jenis: 'masuk' | 'keluar';
  kategori: string;
  jumlah: number;
  keterangan: string | null;
  produk_id: string | null;
  qty: number | null;
  created_at: string;
  produk?: Produk | null;
}

export interface Todo {
  id: string;
  user_id: string;
  tanggal: string;
  deskripsi: string;
  status: 'belum' | 'selesai';
  prioritas: 'rendah' | 'sedang' | 'tinggi';
  berulang: boolean;
}

export interface DaftarBelanja {
  id: string;
  user_id: string;
  bahan_baku_id: string;
  jumlah_dibutuhkan: number;
  status: 'belum' | 'sudah';
  tanggal: string;
  bahan_baku?: BahanBaku;
}

export interface PengaturanMargin {
  id: string;
  user_id: string;
  margin_kompetitif: number;
  margin_standar: number;
  margin_premium: number;
  margin_minimum_warning: number;
  persen_waste_default: number;
  created_at: string;
  updated_at: string;
}

export type ResepProdukWithBahan = ResepProduk & { bahan_baku: BahanBaku };
