import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Wallet, Download, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, monthLabel, todayISO } from '@/lib/format';
import { calculateHpp, calculateMargin, calculateMarginPercent } from '@/lib/hpp';
import type { Transaksi, Produk, ResepProdukWithBahan, BiayaTetap, BiayaVariabelLain, BiayaInvestasi, BahanBaku } from '@/lib/types';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/ConfirmDialog';
import { exportLabaRugiPDF, exportTransaksiPDF, exportStokPDF, exportGabunganPDF } from '@/lib/pdfExport';

type Period = '3bulan' | '6bulan' | '12bulan';

export function LaporanPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [resep, setResep] = useState<ResepProdukWithBahan[]>([]);
  const [biayaTetap, setBiayaTetap] = useState<BiayaTetap[]>([]);
  const [biayaVariabel, setBiayaVariabel] = useState<BiayaVariabelLain[]>([]);
  const [biayaInvestasi, setBiayaInvestasi] = useState<BiayaInvestasi[]>([]);
  const [bahan, setBahan] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('6bulan');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [t, p, r, bt, bv, bi, bb] = await Promise.all([
      supabase.from('transaksi').select('*').order('tanggal'),
      supabase.from('produk').select('*'),
      supabase.from('resep_produk').select('*, bahan_baku(*)'),
      supabase.from('biaya_tetap').select('*').eq('aktif', true),
      supabase.from('biaya_variabel_lain').select('*'),
      supabase.from('biaya_investasi').select('*'),
      supabase.from('bahan_baku').select('*'),
    ]);
    setTransaksi((t.data || []) as Transaksi[]);
    setProduk((p.data || []) as Produk[]);
    setResep((r.data || []) as ResepProdukWithBahan[]);
    setBiayaTetap((bt.data || []) as BiayaTetap[]);
    setBiayaVariabel((bv.data || []) as BiayaVariabelLain[]);
    setBiayaInvestasi((bi.data || []) as BiayaInvestasi[]);
    setBahan((bb.data || []) as BahanBaku[]);
    setLoading(false);
  };

  const monthsCount = period === '3bulan' ? 3 : period === '6bulan' ? 6 : 12;

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; key: string }[] = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: monthLabel(d), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    }

    const hppByProduk = new Map<string, number>();
    produk.forEach((p) => {
      hppByProduk.set(p.id, calculateHpp(resep.filter((r) => r.produk_id === p.id)));
    });

    return months.map((m) => {
      const monthTrans = transaksi.filter((t) => t.tanggal.startsWith(m.key));
      const pendapatan = monthTrans.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0);
      const hppTerjual = monthTrans
        .filter((t) => t.jenis === 'masuk' && t.produk_id)
        .reduce((s, t) => s + (t.qty || 0) * (hppByProduk.get(t.produk_id!) || 0), 0);
      const labaKotor = pendapatan - hppTerjual;

      const biayaTetapBulanan = biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0);
      const biayaVariabelBulanan = biayaVariabel
        .filter((b) => b.tanggal.startsWith(m.key))
        .reduce((s, b) => s + b.jumlah, 0);
      const depresiasi = biayaInvestasi.reduce(
        (s, b) => s + b.nilai / (b.estimasi_umur_pakai_bulan || 1),
        0,
      );
      const biayaOperasional = biayaTetapBulanan + biayaVariabelBulanan + depresiasi;
      const labaBersih = labaKotor - biayaOperasional;

      return { label: m.label, pendapatan, labaBersih, hppTerjual, biayaOperasional };
    });
  }, [transaksi, produk, resep, biayaTetap, biayaVariabel, biayaInvestasi, monthsCount]);

  const categoryData = useMemo(() => {
    const totalBahan = monthlyData.reduce((s, m) => s + m.hppTerjual, 0);
    const totalTetap = biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0) * monthsCount;
    const totalVariabel = biayaVariabel.reduce((s, b) => s + b.jumlah, 0);
    const totalInvestasi = biayaInvestasi.reduce((s, b) => s + b.nilai / (b.estimasi_umur_pakai_bulan || 1), 0) * monthsCount;
    return [
      { name: 'Bahan Baku (HPP)', value: totalBahan, color: '#f43f5e' },
      { name: 'Biaya Tetap', value: totalTetap, color: '#10b981' },
      { name: 'Biaya Variabel', value: totalVariabel, color: '#f59e0b' },
      { name: 'Investasi (Depresiasi)', value: totalInvestasi, color: '#3b82f6' },
    ].filter((d) => d.value > 0);
  }, [monthlyData, biayaTetap, biayaVariabel, biayaInvestasi, monthsCount]);

  const totals = useMemo(() => {
    const pendapatan = monthlyData.reduce((s, m) => s + m.pendapatan, 0);
    const hpp = monthlyData.reduce((s, m) => s + m.hppTerjual, 0);
    const labaKotor = pendapatan - hpp;
    const biayaOp = monthlyData.reduce((s, m) => s + m.biayaOperasional, 0);
    const labaBersih = labaKotor - biayaOp;
    return { pendapatan, hpp, labaKotor, biayaOp, labaBersih };
  }, [monthlyData]);

  const periodStart = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsCount);
    return d.toISOString().split('T')[0];
  }, [monthsCount]);

  const handleExportLabaRugi = () => {
    setExporting(true);
    exportLabaRugiPDF(
      {
        pendapatan: totals.pendapatan,
        hpp: totals.hpp,
        labaKotor: totals.labaKotor,
        biayaTetap: biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0) * monthsCount,
        biayaVariabel: biayaVariabel.reduce((s, b) => s + b.jumlah, 0),
        depresiasi: biayaInvestasi.reduce((s, b) => s + b.nilai / (b.estimasi_umur_pakai_bulan || 1), 0) * monthsCount,
        labaBersih: totals.labaBersih,
      },
      `${monthsCount} bulan terakhir`,
    );
    setExporting(false);
  };

  const handleExportTransaksi = () => {
    setExporting(true);
    const filtered = transaksi.filter((t) => t.tanggal >= periodStart);
    const totalMasuk = filtered.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const totalKeluar = filtered.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    exportTransaksiPDF(
      filtered.map((t) => ({
        tanggal: t.tanggal,
        jenis: t.jenis,
        kategori: t.kategori,
        jumlah: t.jumlah,
        keterangan: t.keterangan || '',
      })),
      `${monthsCount} bulan terakhir`,
      totalMasuk,
      totalKeluar,
    );
    setExporting(false);
  };

  const handleExportStok = () => {
    setExporting(true);
    const rows = bahan.map((b) => ({
      nama: b.nama,
      satuan: b.satuan,
      stok: b.stok_saat_ini,
      hargaBeli: b.harga_beli_per_satuan,
      nilaiStok: b.stok_saat_ini * b.harga_beli_per_satuan,
    }));
    exportStokPDF(rows, rows.reduce((s, r) => s + r.nilaiStok, 0));
    setExporting(false);
  };

  const handleExportGabungan = () => {
    setExporting(true);
    const filtered = transaksi.filter((t) => t.tanggal >= periodStart);
    const totalMasuk = filtered.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0);
    const totalKeluar = filtered.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0);
    const stokRows = bahan.map((b) => ({
      nama: b.nama,
      satuan: b.satuan,
      stok: b.stok_saat_ini,
      hargaBeli: b.harga_beli_per_satuan,
      nilaiStok: b.stok_saat_ini * b.harga_beli_per_satuan,
    }));
    const marginRows = produk.map((p) => {
      const hpp = calculateHpp(resep.filter((r) => r.produk_id === p.id));
      const margin = calculateMargin(hpp, p.harga_jual);
      const marginPct = calculateMarginPercent(hpp, p.harga_jual);
      const sales = filtered.filter((t) => t.jenis === 'masuk' && t.produk_id === p.id);
      const qty = sales.reduce((s, t) => s + (t.qty || 0), 0);
      const omzet = sales.reduce((s, t) => s + t.jumlah, 0);
      return {
        nama: p.nama_produk,
        qty,
        omzet,
        hppTotal: qty * hpp,
        margin,
        marginPct,
        status: margin < 0 ? 'Rugi' : marginPct < 20 ? 'Perlu Review' : 'Untung',
      };
    });
    exportGabunganPDF(
      {
        pendapatan: totals.pendapatan,
        hpp: totals.hpp,
        labaKotor: totals.labaKotor,
        biayaTetap: biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0) * monthsCount,
        biayaVariabel: biayaVariabel.reduce((s, b) => s + b.jumlah, 0),
        depresiasi: biayaInvestasi.reduce((s, b) => s + b.nilai / (b.estimasi_umur_pakai_bulan || 1), 0) * monthsCount,
        labaBersih: totals.labaBersih,
      },
      marginRows,
      filtered.map((t) => ({
        tanggal: t.tanggal,
        jenis: t.jenis,
        kategori: t.kategori,
        jumlah: t.jumlah,
        keterangan: t.keterangan || '',
      })),
      stokRows,
      stokRows.reduce((s, r) => s + r.nilaiStok, 0),
      `${monthsCount} bulan terakhir`,
    );
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Laporan" subtitle="Analisis laba rugi dan grafik keuangan" action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExportLabaRugi} disabled={exporting}>
            <FileText className="w-3.5 h-3.5" /> Laba Rugi
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportTransaksi} disabled={exporting}>
            <FileText className="w-3.5 h-3.5" /> Transaksi
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportStok} disabled={exporting}>
            <FileText className="w-3.5 h-3.5" /> Stok
          </Button>
          <Button size="sm" onClick={handleExportGabungan} disabled={exporting}>
            <Download className="w-3.5 h-3.5" /> Gabungan
          </Button>
        </div>
      } />

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        {([
          { key: '3bulan', label: '3 Bulan' },
          { key: '6bulan', label: '6 Bulan' },
          { key: '12bulan', label: '12 Bulan' },
        ] as const).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              period === p.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Pendapatan" value={formatCurrency(totals.pendapatan)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <SummaryCard label="HPP Terjual" value={formatCurrency(totals.hpp)} icon={<TrendingDown className="w-5 h-5" />} color="amber" />
        <SummaryCard label="Biaya Operasional" value={formatCurrency(totals.biayaOp)} icon={<Wallet className="w-5 h-5" />} color="blue" />
        <SummaryCard label="Laba Bersih" value={formatCurrency(totals.labaBersih)} icon={<TrendingUp className="w-5 h-5" />} color={totals.labaBersih >= 0 ? 'rose' : 'red'} />
      </div>

      {/* Line chart: pendapatan vs laba bersih */}
      <Card className="mb-6">
        <CardHeader title="Tren Pendapatan vs Laba Bersih" subtitle={`Per ${monthsCount} bulan terakhir`} />
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any) => formatCurrency(Number(v))}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
              />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
              <Line type="monotone" dataKey="pendapatan" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Pendapatan" />
              <Line type="monotone" dataKey="labaBersih" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} name="Laba Bersih" />
            </LineChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart: expenses by category */}
        <Card>
          <CardHeader title="Pengeluaran per Kategori" subtitle={`Total ${monthsCount} bulan`} />
          <CardBody>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">
                Belum ada data pengeluaran
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Pie chart: cost proportion */}
        <Card>
          <CardHeader title="Proporsi Biaya" subtitle="Distribusi pengeluaran" />
          <CardBody>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">
                Belum ada data biaya
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {categoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* P&L breakdown */}
      <Card className="mt-6">
        <CardHeader title="Rincian Laba Rugi" subtitle={`Periode ${monthsCount} bulan`} />
        <CardBody>
          <div className="space-y-3">
            <PnLRow label="Pendapatan (Penjualan)" value={formatCurrency(totals.pendapatan)} positive />
            <PnLRow label="HPP Terjual" value={`- ${formatCurrency(totals.hpp)}`} />
            <div className="border-t border-slate-100 pt-3">
              <PnLRow label="Laba Kotor" value={formatCurrency(totals.labaKotor)} bold />
            </div>
            <PnLRow label="Biaya Tetap" value={`- ${formatCurrency(biayaTetap.reduce((s, b) => s + b.jumlah_per_bulan, 0) * monthsCount)}`} />
            <PnLRow label="Biaya Variabel" value={`- ${formatCurrency(biayaVariabel.reduce((s, b) => s + b.jumlah, 0))}`} />
            <PnLRow label="Penyusutan Investasi" value={`- ${formatCurrency(biayaInvestasi.reduce((s, b) => s + b.nilai / (b.estimasi_umur_pakai_bulan || 1), 0) * monthsCount)}`} />
            <div className="border-t border-slate-200 pt-3">
              <PnLRow label="Laba Bersih" value={formatCurrency(totals.labaBersih)} bold highlight={totals.labaBersih >= 0 ? 'positive' : 'negative'} />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card className="p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${colors[color]}`}>{icon}</div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
    </Card>
  );
}

function PnLRow({ label, value, bold, positive, highlight }: { label: string; value: string; bold?: boolean; positive?: boolean; highlight?: 'positive' | 'negative' }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight === 'positive' ? 'text-emerald-600' : highlight === 'negative' ? 'text-red-500' : positive ? 'text-emerald-600' : 'text-slate-700'
        } ${bold ? 'text-base' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
