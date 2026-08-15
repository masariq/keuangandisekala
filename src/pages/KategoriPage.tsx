import { useEffect, useState, useCallback } from 'react';
import { Plus, Tag, Pencil, Trash2, ArrowUp, ArrowDown, EyeOff, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { KategoriProduk } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

export function KategoriPage() {
  const [kategori, setKategori] = useState<KategoriProduk[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriProduk | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nama_kategori: '', deskripsi: '', urutan_tampil: '0' });

  const fetchKategori = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('kategori_produk').select('*').order('urutan_tampil');
    setKategori((data || []) as KategoriProduk[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKategori();
  }, [fetchKategori]);

  const openAdd = () => {
    setEditing(null);
    setForm({ nama_kategori: '', deskripsi: '', urutan_tampil: String(kategori.length) });
    setModalOpen(true);
  };

  const openEdit = (k: KategoriProduk) => {
    setEditing(k);
    setForm({ nama_kategori: k.nama_kategori, deskripsi: k.deskripsi || '', urutan_tampil: String(k.urutan_tampil) });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_kategori: form.nama_kategori,
      deskripsi: form.deskripsi || null,
      urutan_tampil: parseInt(form.urutan_tampil) || 0,
    };
    if (editing) {
      await supabase.from('kategori_produk').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('kategori_produk').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetchKategori();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('kategori_produk').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchKategori();
  };

  const toggleActive = async (k: KategoriProduk) => {
    await supabase.from('kategori_produk').update({ aktif: !k.aktif }).eq('id', k.id);
    fetchKategori();
  };

  const moveOrder = async (k: KategoriProduk, direction: 'up' | 'down') => {
    const sorted = [...kategori].sort((a, b) => a.urutan_tampil - b.urutan_tampil);
    const idx = sorted.findIndex((x) => x.id === k.id);
    if (direction === 'up' && idx > 0) {
      const target = sorted[idx - 1];
      await Promise.all([
        supabase.from('kategori_produk').update({ urutan_tampil: target.urutan_tampil }).eq('id', k.id),
        supabase.from('kategori_produk').update({ urutan_tampil: k.urutan_tampil }).eq('id', target.id),
      ]);
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const target = sorted[idx + 1];
      await Promise.all([
        supabase.from('kategori_produk').update({ urutan_tampil: target.urutan_tampil }).eq('id', k.id),
        supabase.from('kategori_produk').update({ urutan_tampil: k.urutan_tampil }).eq('id', target.id),
      ]);
    }
    fetchKategori();
  };

  return (
    <div>
      <PageHeader
        title="Kelola Kategori"
        subtitle="Tambah, ubah, dan atur urutan kategori produk"
        action={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Kategori
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : kategori.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tag className="w-7 h-7" />}
            title="Belum ada kategori"
            description="Tambahkan kategori seperti Buket, Papan Bunga, Karangan Duka, dll."
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah Kategori
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {[...kategori].sort((a, b) => a.urutan_tampil - b.urutan_tampil).map((k, idx, arr) => (
              <div key={k.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveOrder(k, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveOrder(k, 'down')}
                    disabled={idx === arr.length - 1}
                    className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{k.nama_kategori}</p>
                    {!k.aktif && <Badge color="slate">Nonaktif</Badge>}
                  </div>
                  {k.deskripsi && <p className="text-xs text-slate-400 mt-0.5 truncate">{k.deskripsi}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleActive(k)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title={k.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {k.aktif ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(k)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(k.id)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Kategori' : 'Tambah Kategori'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nama Kategori"
            required
            value={form.nama_kategori}
            onChange={(e) => setForm({ ...form, nama_kategori: e.target.value })}
            placeholder="Buket"
          />
          <Textarea
            label="Deskripsi (opsional)"
            value={form.deskripsi}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            placeholder="Keterangan tambahan..."
            rows={2}
          />
          <Input
            label="Urutan Tampil"
            type="number"
            min="0"
            value={form.urutan_tampil}
            onChange={(e) => setForm({ ...form, urutan_tampil: e.target.value })}
            placeholder="0"
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
        title="Hapus Kategori?"
        message="Kategori akan dihapus. Produk yang memakai kategori ini akan kehilangan kategorinya (tapi tidak terhapus)."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
