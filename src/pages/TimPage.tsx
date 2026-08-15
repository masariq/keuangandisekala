import { useState, useEffect, useCallback } from 'react';
import { Users, LogOut, UserPlus, Shield, Download, Database, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportTransaksiCSV, exportBahanBakuCSV, exportProdukCSV } from '@/lib/csvExport';
import type { Transaksi, BahanBaku, Produk, ResepProdukWithBahan } from '@/lib/types';

export function TimPage() {
  const { user, signOut } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);
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
      <PageHeader title="Tim" subtitle="Kelola akun, akses anggota tim, dan backup data" />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Akun Anda" subtitle="Email yang digunakan untuk login" />
          <CardBody>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-lg font-semibold">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color="emerald"><Shield className="w-3 h-3" /> Pemilik</Badge>
                  <Badge color="slate">Aktif</Badge>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSignOut(true)}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar dari akun
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Anggota Tim" subtitle="Tambah anggota untuk akses bersama" />
          <CardBody>
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <UserPlus className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium text-slate-700">Undang anggota tim</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Bagikan link aplikasi ini ke anggota tim. Mereka bisa membuat akun sendiri untuk mengakses data toko.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Link aplikasi:</p>
                <p className="text-xs text-slate-600 font-mono break-all">{window.location.origin}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Backup & Export Data */}
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
                      Data Anda juga otomatis tersimpan di cloud Supabase dengan backup terjadwal. Export CSV di atas berfungsi sebagai cadangan tambahan yang bisa dibuka di Excel.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Cara Kerja Multi-User" />
        <CardBody>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-semibold text-sm flex-shrink-0">1</div>
              <div>
                <p className="text-sm font-medium text-slate-700">Setiap anggota membuat akun sendiri</p>
                <p className="text-xs text-slate-500 mt-0.5">Anggota tim mendaftar dengan email dan password di halaman yang sama.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-semibold text-sm flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium text-slate-700">Data terpisah per akun</p>
                <p className="text-xs text-slate-500 mt-0.5">Setiap akun memiliki data toko sendiri yang aman dengan Row Level Security.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 font-semibold text-sm flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium text-slate-700">Akses kapan saja, di mana saja</p>
                <p className="text-xs text-slate-500 mt-0.5">Data tersimpan di cloud, tidak hilang saat browser dibersihkan atau berganti perangkat.</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {showSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSignOut(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                <LogOut className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Keluar?</h2>
            </div>
            <p className="text-sm text-slate-500">Anda akan keluar dari akun. Data tetap aman di server.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSignOut(false)} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button onClick={signOut} className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
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
