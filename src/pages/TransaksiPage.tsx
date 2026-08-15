import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, Pencil, Trash2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import type { Transaksi, Produk } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

const KATEGORI_MASUK = ['Penjualan', 'Deposit', 'Lainnya'];
const KATEGORI_KELUAR = ['Pembelian Bahan', 'Gaji', 'Sewa', 'Listrik', 'Ongkir', 'Kemasan', 'Lainnya'];

export function TransaksiPage() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaksi | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    tanggal: todayISO(),
    jenis: 'masuk' as 'masuk' | 'keluar',
    kategori: 'Penjualan',
    jumlah: '',
    keterangan: '',
    produk_id: '',
    qty: '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes] = await Promise.all([
      supabase.from('transaksi').select('*, produk(*)').order('tanggal', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('produk').select('*').order('nama_produk'),
    ]);
    setTransaksi((tRes.data || []) as Transaksi[]);
    setProduk((pRes.data || []) as Produk[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openAdd = () => {
    setEditing(null);
    setForm({ tanggal: todayISO(), jenis: 'masuk', kategori: 'Penjualan', jumlah: '', keterangan: '', produk_id: '', qty: '' });
    setModalOpen(true);
  };

  const openEdit = (t: Transaksi) => {
    setEditing(t);
    setForm({
      tanggal: t.tanggal,
      jenis: t.jenis,
      kategori: t.kategori,
      jumlah: String(t.jumlah),
      keterangan: t.keterangan || '',
      produk_id: t.produk_id || '',
      qty: t.qty ? String(t.qty) : '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      tanggal: form.tanggal,
      jenis: form.jenis,
      kategori: form.kategori,
      jumlah: parseFloat(form.jumlah) || 0,
      keterangan: form.keterangan || null,
      produk_id: form.jenis === 'masuk' && form.produk_id ? form.produk_id : null,
      qty: form.jenis === 'masuk' && form.produk_id && form.qty ? parseFloat(form.qty) : null,
    };

    if (editing) {
      await supabase.from('transaksi').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('transaksi').insert(payload);
    }

    setSaving(false);
    setModalOpen(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('transaksi').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const filtered = transaksi
    .filter((t) => filterJenis === 'all' || t.jenis === filterJenis)
    .filter(
      (t) =>
        t.kategori.toLowerCase().includes(search.toLowerCase()) ||
        (t.keterangan || '').toLowerCase().includes(search.toLowerCase()),
    );

  const totalMasuk = transaksi.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0);
  const totalKeluar = transaksi.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0);

  return (
    <div>
      <PageHeader
        title="Transaksi"
        subtitle="Catat pemasukan dan pengeluaran"
        action={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Transaksi
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Pemasukan</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalMasuk)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Pengeluaran</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(totalKeluar)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {(['all', 'masuk', 'keluar'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterJenis(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterJenis === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'masuk' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ArrowLeftRight className="w-7 h-7" />}
            title="Belum ada transaksi"
            description="Catat penjualan atau pengeluaran untuk mulai melacak keuangan"
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah Transaksi
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.jenis === 'masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}
                >
                  {t.jenis === 'masuk' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{t.kategori}</p>
                    {t.produk && <Badge color="rose">{t.produk.nama_produk}</Badge>}
                    {t.qty && <span className="text-xs text-slate-400">×{t.qty}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(t.tanggal)}
                    {t.keterangan ? ` · ${t.keterangan}` : ''}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${t.jenis === 'masuk' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {t.jenis === 'masuk' ? '+' : '-'}{formatCurrency(t.jumlah)}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Transaksi' : 'Tambah Transaksi'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setForm({ ...form, jenis: 'masuk', kategori: 'Penjualan' })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                form.jenis === 'masuk' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, jenis: 'keluar', kategori: 'Pembelian Bahan' })}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                form.jenis === 'keluar' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-500'
              }`}
            >
              Pengeluaran
            </button>
          </div>

          <Input
            label="Tanggal"
            type="date"
            required
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kategori"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
            >
              {(form.jenis === 'masuk' ? KATEGORI_MASUK : KATEGORI_KELUAR).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </Select>
            <Input
              label="Jumlah (Rp)"
              type="number"
              min="0"
              required
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
              placeholder="50000"
            />
          </div>

          {form.jenis === 'masuk' && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Produk (opsional)"
                value={form.produk_id}
                onChange={(e) => setForm({ ...form, produk_id: e.target.value })}
              >
                <option value="">Tidak ada</option>
                {produk.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama_produk}</option>
                ))}
              </Select>
              <Input
                label="Qty"
                type="number"
                min="0"
                step="any"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                placeholder="1"
                disabled={!form.produk_id}
              />
            </div>
          )}

          <Textarea
            label="Keterangan (opsional)"
            value={form.keterangan}
            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            placeholder="Catatan tambahan..."
            rows={2}
          />

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
        title="Hapus Transaksi?"
        message="Transaksi akan dihapus permanen."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
