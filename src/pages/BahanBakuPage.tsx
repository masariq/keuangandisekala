import { useEffect, useState, useCallback } from 'react';
import { Plus, Flower2, Pencil, Trash2, AlertTriangle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { BahanBaku } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

const SATUAN_OPTIONS = ['tangkai', 'meter', 'pcs', 'lembar', 'kg', 'gram', 'lusin', 'ikat'];

export function BahanBakuPage() {
  const [bahan, setBahan] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BahanBaku | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nama: '',
    satuan: 'tangkai',
    harga_beli_per_satuan: '',
    stok_saat_ini: '',
    stok_minimum: '',
  });

  const fetchBahan = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('bahan_baku').select('*').order('nama');
    setBahan((data || []) as BahanBaku[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBahan();
  }, [fetchBahan]);

  const openAdd = () => {
    setEditing(null);
    setForm({ nama: '', satuan: 'tangkai', harga_beli_per_satuan: '', stok_saat_ini: '', stok_minimum: '' });
    setModalOpen(true);
  };

  const openEdit = (b: BahanBaku) => {
    setEditing(b);
    setForm({
      nama: b.nama,
      satuan: b.satuan,
      harga_beli_per_satuan: String(b.harga_beli_per_satuan),
      stok_saat_ini: String(b.stok_saat_ini),
      stok_minimum: String(b.stok_minimum),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama: form.nama,
      satuan: form.satuan,
      harga_beli_per_satuan: parseFloat(form.harga_beli_per_satuan) || 0,
      stok_saat_ini: parseFloat(form.stok_saat_ini) || 0,
      stok_minimum: parseFloat(form.stok_minimum) || 0,
    };

    if (editing) {
      await supabase.from('bahan_baku').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('bahan_baku').insert(payload);
    }

    setSaving(false);
    setModalOpen(false);
    fetchBahan();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('bahan_baku').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchBahan();
  };

  const filtered = bahan.filter((b) => b.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Bahan Baku"
        subtitle="Kelola stok dan harga bahan baku"
        action={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Bahan
          </Button>
        }
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari bahan baku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Flower2 className="w-7 h-7" />}
            title="Belum ada bahan baku"
            description="Tambahkan bahan baku seperti mawar, pita, kertas kado, dll."
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah Bahan
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const isLow = b.stok_saat_ini < b.stok_minimum;
            return (
              <Card key={b.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isLow ? 'bg-amber-100 text-amber-600' : 'bg-rose-50 text-rose-500'
                      }`}
                    >
                      <Flower2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">{b.nama}</h3>
                      <p className="text-xs text-slate-400">per {b.satuan}</p>
                    </div>
                  </div>
                  {isLow && (
                    <Badge color="red">
                      <AlertTriangle className="w-3 h-3" /> Stok rendah
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">Harga Beli</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(b.harga_beli_per_satuan)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50">
                    <p className="text-xs text-slate-400">Stok Saat Ini</p>
                    <p className={`text-sm font-semibold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                      {formatNumber(b.stok_saat_ini)} {b.satuan}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Min: {formatNumber(b.stok_minimum)} {b.satuan}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(b.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nama Bahan"
            required
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="Mawar Merah"
          />
          <Select label="Satuan" value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })}>
            {SATUAN_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            label="Harga Beli per Satuan (Rp)"
            type="number"
            min="0"
            step="any"
            required
            value={form.harga_beli_per_satuan}
            onChange={(e) => setForm({ ...form, harga_beli_per_satuan: e.target.value })}
            placeholder="5000"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stok Saat Ini"
              type="number"
              min="0"
              step="any"
              required
              value={form.stok_saat_ini}
              onChange={(e) => setForm({ ...form, stok_saat_ini: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Stok Minimum"
              type="number"
              min="0"
              step="any"
              required
              value={form.stok_minimum}
              onChange={(e) => setForm({ ...form, stok_minimum: e.target.value })}
              placeholder="0"
            />
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
        title="Hapus Bahan Baku?"
        message="Bahan baku akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
