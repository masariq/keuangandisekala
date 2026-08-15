import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Download, Database, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportTransaksiCSV, exportBahanBakuCSV, exportProdukCSV } from '@/lib/csvExport';
import type { Transaksi, BahanBaku, Produk, ResepProdukWithBahan } from '@/lib/types';

export function TimPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [bahan, setBahan] = useState<BahanBaku[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [resep, setResep] = useState<ResepProdukWithBahan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [t, b, p, r] = await Promise.all([
      supabase.from('transaksi').select('*').order('tanggal', { ascending: false }),
      supabase.from('bahan_baku').select('*').order('nama'),
      supabase.from('produk').select('*').order('nama_produk'),
      supabase.from('resep_produk').select('*, bahan_baku(*)'),
    ]);
    setTransaksi((t.data || []) as Transaksi[]);
    setBahan((b.data || []) as BahanBaku[]);
    setProduk((p.data || []) as Produk[]);
    setResep((r.data || []) as ResepProdukWithBahan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div>
      <PageHeader title="Tim & Data" subtitle="Backup data toko dalam format CSV" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Anggota Tim" subtitle="Akses bersama untuk tim toko" />
          <CardBody>
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <UserPlus className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-slate-700">Undang anggota tim</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Bagikan link aplikasi ini ke anggota tim. Mereka bisa langsung mengakses data toko tanpa perlu login.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Link aplikasi:</p>
                <p className="text-xs text-slate-600 font-mono break-all">{window.location.origin}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status Data" subtitle="Ringkasan data toko" />
          <CardBody>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-rose-50 text-center">
                <p className="text-2xl font-bold text-rose-600">{produk.length}</p>
                <p className="text-xs text-slate-500 mt-1">Produk</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50 text-center">
                <p className="text-2xl font-bold text-amber-600">{bahan.length}</p>
                <p className="text-xs text-slate-500 mt-1">Bahan</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-center">
                <p className="text-2xl font-bold text-emerald-600">{transaksi.length}</p>
                <p className="text-xs text-slate-500 mt-1">Transaksi</p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-start gap-2">
                <Database className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-600">
                  Data tersimpan otomatis di cloud Supabase dengan backup terjadwal.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Backup & Export Data"
          subtitle="Unduh data mentah sebagai file CSV (bisa dibuka di Excel)"
          action={<Database className="w-5 h-5 text-slate-300" />}
        />
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : transaksi.length === 0 && bahan.length === 0 && produk.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="w-6 h-6" />}
              title="Belum ada data untuk di-backup"
              description="Mulai tambahkan transaksi, bahan baku, atau produk untuk mengaktifkan fitur backup."
            />
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <BackupButton
                  label="Backup Transaksi"
                  count={transaksi.length}
                  onClick={() => exportTransaksiCSV(transaksi)}
                />
                <BackupButton
                  label="Backup Bahan Baku"
                  count={bahan.length}
                  onClick={() => exportBahanBakuCSV(bahan)}
                />
                <BackupButton
                  label="Backup Produk"
                  count={produk.length}
                  onClick={() => exportProdukCSV(produk, resep)}
                />
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <Database className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-700">Backup Otomatis Supabase</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Data Anda otomatis tersimpan di cloud Supabase dengan backup terjadwal. Export CSV di atas berfungsi sebagai cadangan tambahan yang bisa dibuka di Excel.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function BackupButton({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={count === 0}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
        <Download className="w-5 h-5" />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-xs text-slate-400">{count} record</span>
    </button>
  );
}
