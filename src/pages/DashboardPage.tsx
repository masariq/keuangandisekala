import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Package, Flower2, Wallet, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, currentMonthStart, todayISO } from '@/lib/format';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BahanBaku, Todo, Transaksi, Produk, ResepProdukWithBahan } from '@/lib/types';
import { calculateHpp } from '@/lib/hpp';

interface MarginAlert {
  namaProduk: string;
  marginPct: number;
  hpp: number;
  hargaJual: number;
}

interface DashboardData {
  pendapatan: number;
  hppTerjual: number;
  labaKotor: number;
  biayaOperasional: number;
  labaBersih: number;
  lowStock: BahanBaku[];
  todosToday: Todo[];
  totalProduk: number;
  totalBahan: number;
  marginAlerts: MarginAlert[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const monthStart = currentMonthStart();
    const today = todayISO();

    const [transaksiRes, bahanRes, todoRes, produkRes, resepRes, biayaTetapRes, biayaVariabelRes, biayaInvestasiRes] =
      await Promise.all([
        supabase.from('transaksi').select('*').gte('tanggal', monthStart),
        supabase.from('bahan_baku').select('*'),
        supabase.from('todo').select('*').eq('tanggal', today),
        supabase.from('produk').select('*'),
        supabase.from('resep_produk').select('*, bahan_baku(*)'),
        supabase.from('biaya_tetap').select('*').eq('aktif', true),
        supabase.from('biaya_variabel_lain').select('*').gte('tanggal', monthStart),
        supabase.from('biaya_investasi').select('*'),
      ]);

    const transaksi = (transaksiRes.data || []) as Transaksi[];
    const bahan = (bahanRes.data || []) as BahanBaku[];
    const todos = (todoRes.data || []) as Todo[];
    const produk = (produkRes.data || []) as Produk[];
    const resep = (resepRes.data || []) as ResepProdukWithBahan[];

    const pendapatan = transaksi.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + (t.jumlah || 0), 0);

    // HPP terjual: for each sales transaction with a product, compute qty * HPP
    const hppByProduk = new Map<string, number>();
    produk.forEach((p) => {
      const resepItems = resep.filter((r) => r.produk_id === p.id);
      hppByProduk.set(p.id, calculateHpp(resepItems));
    });

    const hppTerjual = transaksi
      .filter((t) => t.jenis === 'masuk' && t.produk_id)
      .reduce((s, t) => s + (t.qty || 0) * (hppByProduk.get(t.produk_id!) || 0), 0);

    const labaKotor = pendapatan - hppTerjual;

    const biayaTetap = (biayaTetapRes.data || []).reduce((s: number, b: any) => s + (b.jumlah_per_bulan || 0), 0);
    const biayaVariabel = (biayaVariabelRes.data || []).reduce((s: number, b: any) => s + (b.jumlah || 0), 0);
    const biayaInvestasi = (biayaInvestasiRes.data || []).reduce(
      (s: number, b: any) => s + (b.nilai || 0) / (b.estimasi_umur_pakai_bulan || 1),
      0,
    );
    const biayaOperasional = biayaTetap + biayaVariabel + biayaInvestasi;
    const labaBersih = labaKotor - biayaOperasional;

    const lowStock = bahan.filter((b) => b.stok_saat_ini < b.stok_minimum);

    const MARGIN_THRESHOLD = 20;
    const marginAlerts: MarginAlert[] = produk
      .map((p) => {
        const resepItems = resep.filter((r) => r.produk_id === p.id);
        const hpp = calculateHpp(resepItems);
        const marginPct = p.harga_jual > 0 ? ((p.harga_jual - hpp) / p.harga_jual) * 100 : 0;
        return { namaProduk: p.nama_produk, marginPct, hpp, hargaJual: p.harga_jual };
      })
      .filter((a) => a.marginPct < MARGIN_THRESHOLD && a.hpp > 0);

    setData({
      pendapatan,
      hppTerjual,
      labaKotor,
      biayaOperasional,
      labaBersih,
      lowStock,
      todosToday: todos,
      totalProduk: produk.length,
      totalBahan: bahan.length,
      marginAlerts,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const d = data!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Ringkasan bulan berjalan</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Pendapatan"
          value={formatCurrency(d.pendapatan)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          label="Laba Kotor"
          value={formatCurrency(d.labaKotor)}
          icon={<Wallet className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          label="Biaya Operasional"
          value={formatCurrency(d.biayaOperasional)}
          icon={<TrendingDown className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Laba Bersih"
          value={formatCurrency(d.labaBersih)}
          icon={<TrendingUp className="w-5 h-5" />}
          color={d.labaBersih >= 0 ? 'rose' : 'red'}
        />
      </div>

      {d.marginAlerts.length > 0 && (
        <Card className="mb-6 bg-red-50 border-red-100">
          <CardHeader
            title="Peringatan Margin Produk"
            subtitle="Produk dengan margin di bawah 20% — pertimbangkan revisi harga jual"
            action={<Badge color="red">{d.marginAlerts.length} produk</Badge>}
          />
          <CardBody>
            <div className="space-y-2">
              {d.marginAlerts.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-red-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{a.namaProduk}</p>
                      <p className="text-xs text-slate-500">
                        HPP {formatCurrency(a.hpp)} · Jual {formatCurrency(a.hargaJual)} · Margin {a.marginPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <Badge color={a.marginPct < 0 ? 'red' : 'amber'}>
                    {a.marginPct < 0 ? 'Rugi' : 'Perlu review'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Low stock alerts */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Peringatan Stok Menipis"
            subtitle="Bahan baku yang perlu segera dibelanja"
            action={
              d.lowStock.length > 0 ? <Badge color="red">{d.lowStock.length} item</Badge> : null
            }
          />
          <CardBody>
            {d.lowStock.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-6 h-6" />}
                title="Stok aman"
                description="Semua bahan baku masih di atas batas minimum"
              />
            ) : (
              <div className="space-y-2">
                {d.lowStock.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{b.nama}</p>
                        <p className="text-xs text-slate-500">
                          Sisa {b.stok_saat_ini} {b.satuan} · Min. {b.stok_minimum} {b.satuan}
                        </p>
                      </div>
                    </div>
                    <Badge color="red">Perlu belanja</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Today's todos */}
        <Card>
          <CardHeader
            title="To-Do Hari Ini"
            action={d.todosToday.length > 0 ? <Badge color="slate">{d.todosToday.length}</Badge> : null}
          />
          <CardBody>
            {d.todosToday.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="w-6 h-6" />} title="Tidak ada tugas" />
            ) : (
              <div className="space-y-2">
                {d.todosToday.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        t.status === 'selesai'
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300'
                      }`}
                    >
                      {t.status === 'selesai' && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className={`text-sm flex-1 ${
                        t.status === 'selesai' ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                    >
                      {t.deskripsi}
                    </span>
                    {t.prioritas === 'tinggi' && <Badge color="red">!</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <MiniStat label="Total Produk" value={d.totalProduk} icon={<Package className="w-4 h-4" />} />
        <MiniStat label="Total Bahan Baku" value={d.totalBahan} icon={<Flower2 className="w-4 h-4" />} />
        <MiniStat
          label="HPP Terjual"
          value={formatCurrency(d.hppTerjual)}
          icon={<TrendingDown className="w-4 h-4" />}
        />
        <MiniStat
          label="Margin Kotor"
          value={`${d.pendapatan > 0 ? ((d.labaKotor / d.pendapatan) * 100).toFixed(1) : 0}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'rose' | 'red';
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
    </Card>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-1.5">{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-700">{value}</p>
    </Card>
  );
}
