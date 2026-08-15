import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowLeft, Download, Award, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, todayISO, currentMonthStart } from '@/lib/format';
import { calculateHpp, calculateMargin, calculateMarginPercent } from '@/lib/hpp';
import { exportMarginPDF } from '@/lib/pdfExport';
import type { Produk, Transaksi, ResepProdukWithBahan, BiayaTetap } from '@/lib/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/ConfirmDialog';

type Period = '7hari' | '30hari' | '90hari' | '365hari';

const PERIOD_DAYS: Record<Period, number> = { '7hari': 7, '30hari': 30, '90hari': 90, '365hari': 365 };
const PERIOD_LABELS: Record<Period, string> = {
  '7hari': '7 Hari',
  '30hari': '30 Hari',
  '90hari': '90 Hari',
  '365hari': '1 Tahun',
};

interface ProductAnalysis {
  produk: Produk;
  qtyTerjual: number;
  omzet: number;
  hppTotal: number;
  margin: number;
  marginPct: number;
  kontribusiLaba: number;
  status: 'untung' | 'review' | 'rugi';
  resepItems: ResepProdukWithBahan[];
}

export function AnalisisPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [resep, setResep] = useState<ResepProdukWithBahan[]>([]);
  const [biayaTetap, setBiayaTetap] = useState<BiayaTetap[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30hari');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [marginThreshold, setMarginThreshold] = useState(20);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, tRes, rRes, btRes] = await Promise.all([
      supabase.from('produk').select('*, kategori_produk(*)'),
      supabase.from('transaksi').select('*'),
      supabase.from('resep_produk').select('*, bahan_baku(*)'),
      supabase.from('biaya_tetap').select('*').eq('aktif', true),
    ]);
    setProduk((pRes.data || []) as Produk[]);
    setTransaksi((tRes.data || []) as Transaksi[]);
    setResep((rRes.data || []) as ResepProdukWithBahan[]);
    setBiayaTetap((btRes.data || []) as BiayaTetap[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const periodStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - PERIOD_DAYS[period]);
    return d.toISOString().split('T')[0];
  }, [period]);

  const analysis: ProductAnalysis[] = useMemo(() => {
    return produk
      .map((p) => {
        const resepItems = resep.filter((r) => r.produk_id === p.id);
        const hpp = calculateHpp(resepItems);
        const margin = calculateMargin(hpp, p.harga_jual);
        const marginPct = calculateMarginPercent(hpp, p.harga_jual);

        const salesTrans = transaksi.filter(
          (t) => t.jenis === 'masuk' && t.produk_id === p.id && t.tanggal >= periodStart,
        );
        const qtyTerjual = salesTrans.reduce((s, t) => s + (t.qty || 0), 0);
        const omzet = salesTrans.reduce((s, t) => s + t.jumlah, 0);
        const hppTotal = qtyTerjual * hpp;
        const kontribusiLaba = qtyTerjual * margin;

        let status: 'untung' | 'review' | 'rugi' = 'untung';
        if (margin < 0) status = 'rugi';
        else if (marginPct < marginThreshold) status = 'review';

        return {
          produk: p,
          qtyTerjual,
          omzet,
          hppTotal,
          margin,
          marginPct,
          kontribusiLaba,
          status,
          resepItems,
        };
      })
      .sort((a, b) => b.kontribusiLaba - a.kontribusiLaba);
  }, [produk, transaksi, resep, periodStart, marginThreshold]);

  const totalBiayaTetapBulanan = biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0);

  const chartData = analysis
    .filter((a) => a.qtyTerjual > 0 || a.marginPct !== 0)
    .map((a) => ({
      name: a.produk.nama_produk.length > 15 ? a.produk.nama_produk.slice(0, 15) + '...' : a.produk.nama_produk,
      marginPct: a.marginPct,
      status: a.status,
    }))
    .sort((a, b) => b.marginPct - a.marginPct);

  const handleExportPDF = () => {
    exportMarginPDF(
      analysis.map((a) => ({
        nama: a.produk.nama_produk,
        qty: a.qtyTerjual,
        omzet: a.omzet,
        hppTotal: a.hppTotal,
        margin: a.margin,
        marginPct: a.marginPct,
        status:
          a.status === 'untung' ? 'Untung' : a.status === 'rugi' ? 'Rugi' : 'Perlu Review',
      })),
      PERIOD_LABELS[period],
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Detail view
  if (detailId) {
    const a = analysis.find((x) => x.produk.id === detailId);
    if (!a) {
      setDetailId(null);
      return null;
    }
    const hpp = calculateHpp(a.resepItems);
    const breakEvenQty = a.margin > 0 ? Math.ceil(totalBiayaTetapBulanan / a.margin) : 0;

    return (
      <div>
        <button
          onClick={() => setDetailId(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                <Package className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{a.produk.nama_produk}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge color="rose">{a.produk.kategori_produk?.nama_kategori || a.produk.kategori || 'Tanpa Kategori'}</Badge>
                  <StatusBadge status={a.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetricBox label="Harga Jual" value={formatCurrency(a.produk.harga_jual)} />
              <MetricBox label="HPP (Modal)" value={formatCurrency(hpp)} color="amber" />
              <MetricBox label="Margin/unit" value={formatCurrency(a.margin)} color={a.margin >= 0 ? 'emerald' : 'red'} />
              <MetricBox label="Margin %" value={`${a.marginPct.toFixed(1)}%`} color={a.marginPct >= marginThreshold ? 'emerald' : 'red'} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <MetricBox label="Qty Terjual" value={String(a.qtyTerjual)} />
              <MetricBox label="Omzet" value={formatCurrency(a.omzet)} />
              <MetricBox label="Kontribusi Laba" value={formatCurrency(a.kontribusiLaba)} color="emerald" />
            </div>

            {a.margin > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 mb-6">
                <p className="text-xs text-blue-600">Break-even (per bulan)</p>
                <p className="text-base font-bold text-blue-700">
                  {breakEvenQty} unit
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  Dengan biaya tetap {formatCurrency(totalBiayaTetapBulanan)}/bln, perlu jual {breakEvenQty} unit untuk balik modal.
                </p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-slate-700 mb-3">Breakdown Biaya Bahan (HPP)</h3>
            {a.resepItems.length === 0 ? (
              <EmptyState icon={<Package className="w-6 h-6" />} title="Belum ada resep" description="Tambahkan resep untuk menghitung HPP" />
            ) : (
              <div className="space-y-2">
                {a.resepItems.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.bahan_baku?.nama}</p>
                      <p className="text-xs text-slate-400">
                        {formatCurrency(r.bahan_baku?.harga_beli_per_satuan || 0)} / {r.bahan_baku?.satuan}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {r.jumlah_dibutuhkan} {r.bahan_baku?.satuan}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency((r.jumlah_dibutuhkan || 0) * (r.bahan_baku?.harga_beli_per_satuan || 0))}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 mt-2">
                  <p className="text-sm font-semibold text-amber-700">Total HPP</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(hpp)}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Ringkasan Profit</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">Margin per Unit</p>
                <p className={`text-lg font-bold ${a.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(a.margin)}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">Margin (%)</p>
                <p className={`text-lg font-bold ${a.marginPct >= marginThreshold ? 'text-emerald-600' : 'text-red-500'}`}>
                  {a.marginPct.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-500">Kontribusi Laba ({PERIOD_LABELS[period]})</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(a.kontribusiLaba)}</p>
              </div>
              {a.status === 'review' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-700">Perlu Review Harga</p>
                      <p className="text-xs text-amber-600 mt-1">
                        Margin ({a.marginPct.toFixed(1)}%) di bawah ambang batas ({marginThreshold}%). Pertimbangkan revisi harga jual.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {a.status === 'rugi' && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <div className="flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-700">Merugi</p>
                      <p className="text-xs text-red-600 mt-1">
                        HPP ({formatCurrency(hpp)}) lebih tinggi dari harga jual ({formatCurrency(a.produk.harga_jual)}). Naikkan harga atau efisiensikan bahan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const bestProduct = analysis.find((a) => a.kontribusiLaba > 0 && a.status === 'untung');
  const worstProduct = analysis.find((a) => a.status === 'rugi' || a.status === 'review');

  return (
    <div>
      <PageHeader
        title="Analisis Produk & Margin"
        subtitle="Produk mana yang paling menguntungkan, bukan hanya paling laku"
        action={
          <Button variant="outline" onClick={handleExportPDF} disabled={analysis.length === 0}>
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {(Object.keys(PERIOD_DAYS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-slate-500">Ambang margin min:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={marginThreshold}
            onChange={(e) => setMarginThreshold(Number(e.target.value) || 0)}
            className="w-16 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
          <span className="text-slate-400">%</span>
        </div>
      </div>

      {analysis.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-7 h-7" />}
            title="Belum ada produk"
            description="Tambahkan produk dengan resep untuk melihat analisis margin otomatis."
          />
        </Card>
      ) : (
        <>
          {/* Highlight cards */}
          {bestProduct && (
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <Card className="p-4 bg-emerald-50 border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600">Paling Menguntungkan</p>
                    <p className="text-sm font-bold text-emerald-700">{bestProduct.produk.nama_produk}</p>
                    <p className="text-xs text-emerald-500">
                      Kontribusi {formatCurrency(bestProduct.kontribusiLaba)} · Margin {bestProduct.marginPct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Card>
              {worstProduct && worstProduct.produk.id !== bestProduct.produk.id && (
                <Card className="p-4 bg-amber-50 border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-amber-600">Perlu Ditinjau</p>
                      <p className="text-sm font-bold text-amber-700">{worstProduct.produk.nama_produk}</p>
                      <p className="text-xs text-amber-500">
                        Margin {worstProduct.marginPct.toFixed(1)}% · {formatCurrency(worstProduct.margin)}/unit
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Margin % bar chart */}
          {chartData.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="Margin % per Produk" subtitle="Diurutkan dari tertinggi ke terendah" />
              <CardBody>
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                    <Bar dataKey="marginPct" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.status === 'untung' ? '#10b981' : entry.status === 'review' ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Ranking table */}
          <Card>
            <CardHeader title="Ranking Produk" subtitle="Diurutkan berdasarkan kontribusi laba" />
            <CardBody className="p-0">
              {analysis.every((a) => a.qtyTerjual === 0) ? (
                <EmptyState
                  icon={<TrendingUp className="w-6 h-6" />}
                  title="Belum ada penjualan"
                  description={`Belum ada transaksi penjualan di ${PERIOD_LABELS[period]} terakhir. Catat penjualan di halaman Transaksi untuk melihat analisis.`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-medium">#</th>
                        <th className="text-left px-3 py-3 font-medium">Produk</th>
                        <th className="text-right px-3 py-3 font-medium">Qty</th>
                        <th className="text-right px-3 py-3 font-medium">Omzet</th>
                        <th className="text-right px-3 py-3 font-medium">HPP Total</th>
                        <th className="text-right px-3 py-3 font-medium">Margin Rp</th>
                        <th className="text-right px-3 py-3 font-medium">Margin %</th>
                        <th className="text-center px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.map((a, idx) => (
                        <tr
                          key={a.produk.id}
                          onClick={() => setDetailId(a.produk.id)}
                          className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-700">{a.produk.nama_produk}</span>
                          </td>
                          <td className="text-right px-3 py-3 text-slate-600">{a.qtyTerjual}</td>
                          <td className="text-right px-3 py-3 text-slate-600">{formatCurrency(a.omzet)}</td>
                          <td className="text-right px-3 py-3 text-amber-600">{formatCurrency(a.hppTotal)}</td>
                          <td className="text-right px-3 py-3 font-semibold text-slate-700">{formatCurrency(a.margin * a.qtyTerjual)}</td>
                          <td className={`text-right px-3 py-3 font-semibold ${a.marginPct >= marginThreshold ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.marginPct.toFixed(1)}%
                          </td>
                          <td className="text-center px-3 py-3">
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'untung' | 'review' | 'rugi' }) {
  if (status === 'untung') return <Badge color="emerald"><Award className="w-3 h-3" /> Untung</Badge>;
  if (status === 'rugi') return <Badge color="red"><TrendingDown className="w-3 h-3" /> Rugi</Badge>;
  return <Badge color="amber"><AlertTriangle className="w-3 h-3" /> Perlu Review</Badge>;
}

function MetricBox({ label, value, color = 'slate' }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className={`p-3 rounded-xl ${colors[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
