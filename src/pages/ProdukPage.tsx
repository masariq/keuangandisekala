import { useEffect, useState, useCallback } from 'react';
import { Plus, Package, Pencil, Trash2, ChevronRight, ArrowLeft, Layers, Lightbulb, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { calculateHpp, calculateMargin, calculateMarginPercent, calculateEffectiveHpp, calculateRecommendedPrice, roundToNiceNumber, getMarginStatus } from '@/lib/hpp';
import type { Produk, BahanBaku, ResepProdukWithBahan, KategoriProduk, PengaturanMargin } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

export function ProdukPage() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [bahan, setBahan] = useState<BahanBaku[]>([]);
  const [resep, setResep] = useState<ResepProdukWithBahan[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriProduk[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanMargin | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produk | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({ nama_produk: '', harga_jual: '', kategori_id: '', foto_url: '' });
  const [resepItems, setResepItems] = useState<{ bahan_baku_id: string; jumlah_dibutuhkan: string }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [pRes, bRes, rRes, kRes, pengRes] = await Promise.all([
      supabase.from('produk').select('*, kategori_produk(*)').order('nama_produk'),
      supabase.from('bahan_baku').select('*').order('nama'),
      supabase.from('resep_produk').select('*, bahan_baku(*)'),
      supabase.from('kategori_produk').select('*').order('urutan_tampil'),
      supabase.from('pengaturan_margin').select('*').maybeSingle(),
    ]);
    setProduk((pRes.data || []) as Produk[]);
    setBahan((bRes.data || []) as BahanBaku[]);
    setResep((rRes.data || []) as ResepProdukWithBahan[]);
    setKategoriList((kRes.data || []) as KategoriProduk[]);
    if (pengRes.data) setPengaturan(pengRes.data as PengaturanMargin);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getResepForProduk = (produkId: string) => resep.filter((r) => r.produk_id === produkId);
  const getHpp = (produkId: string) => calculateHpp(getResepForProduk(produkId));

  const openAdd = () => {
    setEditing(null);
    setForm({ nama_produk: '', harga_jual: '', kategori_id: '', foto_url: '' });
    setResepItems([{ bahan_baku_id: '', jumlah_dibutuhkan: '1' }]);
    setModalOpen(true);
  };

  const openEdit = async (p: Produk) => {
    setEditing(p);
    setForm({
      nama_produk: p.nama_produk,
      harga_jual: String(p.harga_jual),
      kategori_id: p.kategori_id || '',
      foto_url: p.foto_url || '',
    });
    const existingResep = getResepForProduk(p.id);
    setResepItems(
      existingResep.length > 0
        ? existingResep.map((r) => ({ bahan_baku_id: r.bahan_baku_id, jumlah_dibutuhkan: String(r.jumlah_dibutuhkan) }))
        : [{ bahan_baku_id: '', jumlah_dibutuhkan: '1' }],
    );
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_produk: form.nama_produk,
      harga_jual: parseFloat(form.harga_jual) || 0,
      kategori_id: form.kategori_id || null,
      foto_url: form.foto_url || null,
    };

    let produkId = editing?.id;

    if (editing) {
      await supabase.from('produk').update(payload).eq('id', editing.id);
      await supabase.from('resep_produk').delete().eq('produk_id', editing.id);
    } else {
      const { data } = await supabase.from('produk').insert(payload).select().single();
      produkId = data?.id;
    }

    const validItems = resepItems.filter((r) => r.bahan_baku_id && parseFloat(r.jumlah_dibutuhkan) > 0);
    if (validItems.length > 0 && produkId) {
      await supabase.from('resep_produk').insert(
        validItems.map((r) => ({
          produk_id: produkId,
          bahan_baku_id: r.bahan_baku_id,
          jumlah_dibutuhkan: parseFloat(r.jumlah_dibutuhkan),
        })),
      );
    }

    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('resep_produk').delete().eq('produk_id', deleteId);
    await supabase.from('produk').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  // Detail view
  if (detailId) {
    const p = produk.find((x) => x.id === detailId);
    if (!p) {
      setDetailId(null);
      return null;
    }
    const resepItems = getResepForProduk(p.id);
    const hpp = calculateHpp(resepItems);
    const margin = calculateMargin(hpp, p.harga_jual);
    const marginPct = calculateMarginPercent(hpp, p.harga_jual);

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
              <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                <Package className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{p.nama_produk}</h2>
                <Badge color="rose" className="mt-1">{p.kategori_produk?.nama_kategori || p.kategori || 'Tanpa Kategori'}</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">Harga Jual</p>
                <p className="text-base font-bold text-slate-800">{formatCurrency(p.harga_jual)}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50">
                <p className="text-xs text-amber-500">HPP (Modal)</p>
                <p className="text-base font-bold text-amber-700">{formatCurrency(hpp)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50">
                <p className="text-xs text-emerald-500">Margin</p>
                <p className="text-base font-bold text-emerald-700">{formatCurrency(margin)}</p>
                <p className="text-xs text-emerald-500">{marginPct.toFixed(1)}%</p>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-700 mb-3">Resep / Bahan Baku</h3>
            {resepItems.length === 0 ? (
              <EmptyState icon={<Layers className="w-6 h-6" />} title="Belum ada resep" description="Tambahkan resep untuk menghitung HPP otomatis" />
            ) : (
              <div className="space-y-2">
                {resepItems.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{r.bahan_baku?.nama}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(r.bahan_baku?.harga_beli_per_satuan || 0)} / {r.bahan_baku?.satuan}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{r.jumlah_dibutuhkan} {r.bahan_baku?.satuan}</p>
                      <p className="text-xs text-slate-500">{formatCurrency((r.jumlah_dibutuhkan || 0) * (r.bahan_baku?.harga_beli_per_satuan || 0))}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100 mt-3">
                  <p className="text-sm font-semibold text-amber-700">Total HPP</p>
                  <p className="text-sm font-bold text-amber-700">{formatCurrency(hpp)}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Analisis Profit</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">Harga Jual</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(p.harga_jual)}</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">HPP (Modal)</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(hpp)}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-500">Laba per Unit</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(margin)}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">Margin (%)</p>
                <p className="text-lg font-bold text-slate-700">{marginPct.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Produk & Resep"
        subtitle="Kelola produk dan resep bahan — HPP dihitung otomatis"
        action={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Produk
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : produk.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-7 h-7" />}
            title="Belum ada produk"
            description="Tambahkan produk seperti Buket Mawar 12, Standing Flower, dll."
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah Produk
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {produk.map((p) => {
            const hpp = getHpp(p.id);
            const margin = calculateMargin(hpp, p.harga_jual);
            const marginPct = calculateMarginPercent(hpp, p.harga_jual);
            return (
              <Card key={p.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" >
                <div className="flex items-start justify-between gap-2 mb-3" onClick={() => setDetailId(p.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{p.nama_produk}</h3>
                      <Badge color="rose" className="mt-0.5">{p.kategori_produk?.nama_kategori || p.kategori || 'Tanpa Kategori'}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3" onClick={() => setDetailId(p.id)}>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">Harga Jual</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(p.harga_jual)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50">
                    <p className="text-xs text-amber-500">HPP</p>
                    <p className="text-sm font-semibold text-amber-700">{formatCurrency(hpp)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-xs text-slate-400">Margin</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(margin)} ({marginPct.toFixed(0)}%)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Produk' : 'Tambah Produk'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Nama Produk"
              required
              value={form.nama_produk}
              onChange={(e) => setForm({ ...form, nama_produk: e.target.value })}
              placeholder="Buket Mawar 12"
            />
            <Select label="Kategori" value={form.kategori_id} onChange={(e) => setForm({ ...form, kategori_id: e.target.value })}>
              <option value="">Tanpa Kategori</option>
              {kategoriList.filter((k) => k.aktif).map((k) => (
                <option key={k.id} value={k.id}>{k.nama_kategori}</option>
              ))}
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Harga Jual (Rp)"
              type="number"
              min="0"
              required
              value={form.harga_jual}
              onChange={(e) => setForm({ ...form, harga_jual: e.target.value })}
              placeholder="150000"
            />
            <Input
              label="URL Foto (opsional)"
              value={form.foto_url}
              onChange={(e) => setForm({ ...form, foto_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-600">Resep / Bahan Baku</label>
              <button
                type="button"
                onClick={() => setResepItems([...resepItems, { bahan_baku_id: '', jumlah_dibutuhkan: '1' }])}
                className="text-sm text-rose-600 font-medium hover:underline"
              >
                + Tambah bahan
              </button>
            </div>
            <div className="space-y-2">
              {resepItems.map((item, idx) => {
                const selectedBahan = bahan.find((b) => b.id === item.bahan_baku_id);
                const subtotal = (parseFloat(item.jumlah_dibutuhkan) || 0) * (selectedBahan?.harga_beli_per_satuan || 0);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <select
                      required
                      value={item.bahan_baku_id}
                      onChange={(e) => {
                        const updated = [...resepItems];
                        updated[idx] = { ...item, bahan_baku_id: e.target.value };
                        setResepItems(updated);
                      }}
                      className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    >
                      <option value="">Pilih bahan...</option>
                      {bahan.map((b) => (
                        <option key={b.id} value={b.id}>{b.nama} ({b.satuan})</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={item.jumlah_dibutuhkan}
                      onChange={(e) => {
                        const updated = [...resepItems];
                        updated[idx] = { ...item, jumlah_dibutuhkan: e.target.value };
                        setResepItems(updated);
                      }}
                      placeholder="Jumlah"
                      className="w-24 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                    />
                    {selectedBahan && (
                      <span className="text-xs text-slate-400 self-center whitespace-nowrap w-24">
                        {formatCurrency(subtotal)}
                      </span>
                    )}
                    {resepItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setResepItems(resepItems.filter((_, i) => i !== idx))}
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          {resepItems.some((r) => r.bahan_baku_id) && (
            <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-xs font-semibold text-amber-700 mb-1">HPP Produk</p>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(
                  resepItems.reduce((sum, item) => {
                    const b = bahan.find((x) => x.id === item.bahan_baku_id);
                    return sum + (parseFloat(item.jumlah_dibutuhkan) || 0) * (b?.harga_beli_per_satuan || 0);
                  }, 0),
                )}
              </p>
            </div>
          )}

          {(() => {
            const rawHpp = resepItems.reduce((sum, item) => {
              const b = bahan.find((x) => x.id === item.bahan_baku_id);
              return sum + (parseFloat(item.jumlah_dibutuhkan) || 0) * (b?.harga_beli_per_satuan || 0);
            }, 0);
            if (rawHpp <= 0) return null;
            const wastePct = pengaturan?.persen_waste_default ?? 10;
 const minWarning = pengaturan?.margin_minimum_warning ?? 20;
            const effectiveHpp = calculateEffectiveHpp(rawHpp, wastePct);
            const kompetitifPct = pengaturan?.margin_kompetitif ?? 28;
            const standarPct = pengaturan?.margin_standar ?? 40;
            const premiumPct = pengaturan?.margin_premium ?? 55;
            const hargaJual = parseFloat(form.harga_jual) || 0;
            const currentMarginPct = hargaJual > 0 ? ((hargaJual - rawHpp) / hargaJual) * 100 : 0;
            const status = getMarginStatus(currentMarginPct, minWarning);

            return (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-700">Rekomendasi Harga Jual</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  HPP efektif (waste {wastePct}%): <span className="font-semibold text-slate-700">{formatCurrency(effectiveHpp)}</span>
                </p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <RecommendationCard label="Kompetitif" pct={kompetitifPct} hpp={effectiveHpp} onClick={(v) => setForm({ ...form, harga_jual: String(v) })} />
                  <RecommendationCard label="Standar" pct={standarPct} hpp={effectiveHpp} highlight onClick={(v) => setForm({ ...form, harga_jual: String(v) })} />
                  <RecommendationCard label="Premium" pct={premiumPct} hpp={effectiveHpp} onClick={(v) => setForm({ ...form, harga_jual: String(v) })} />
                </div>
                {hargaJual > 0 && (
                  <div className={`flex items-center gap-2 p-2.5 rounded-lg ${
                    status === 'healthy' ? 'bg-emerald-50' : status === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    {status === 'healthy' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    <p className={`text-xs font-medium ${
                      status === 'healthy' ? 'text-emerald-700' : status === 'warning' ? 'text-amber-700' : 'text-red-600'
                    }`}>
                      Margin saat ini: {currentMarginPct.toFixed(1)}% {status === 'healthy' ? '— Sehat' : status === 'warning' ? '— Mendekati batas minimum' : '— Di bawah minimum!'}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Hapus Produk?"
        message="Produk dan resepnya akan dihapus permanen."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function RecommendationCard({ label, pct, hpp, highlight, onClick }: { label: string; pct: number; hpp: number; highlight?: boolean; onClick: (v: number) => void }) {
  const price = roundToNiceNumber(calculateRecommendedPrice(hpp, pct));
  return (
    <button
      type="button"
      onClick={() => onClick(price)}
      className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
        highlight ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <p className="text-xs text-slate-500">{label} ({pct}%)</p>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{formatCurrency(price)}</p>
    </button>
  );
}
