import { useEffect, useState, useCallback } from 'react';
import { Plus, CheckSquare, Check, Trash2, Repeat, ShoppingCart, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, todayISO } from '@/lib/format';
import type { Todo, BahanBaku, DaftarBelanja } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

const PRIORITAS_OPTIONS = [
  { value: 'rendah', label: 'Rendah', color: 'slate' as const },
  { value: 'sedang', label: 'Sedang', color: 'amber' as const },
  { value: 'tinggi', label: 'Tinggi', color: 'red' as const },
];

export function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [bahan, setBahan] = useState<BahanBaku[]>([]);
  const [belanja, setBelanja] = useState<DaftarBelanja[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'todo' | 'belanja'>('todo');

  const [form, setForm] = useState({
    tanggal: todayISO(),
    deskripsi: '',
    prioritas: 'sedang' as 'rendah' | 'sedang' | 'tinggi',
    berulang: false,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tRes, bRes, belanjaRes] = await Promise.all([
      supabase.from('todo').select('*').order('tanggal', { ascending: false }),
      supabase.from('bahan_baku').select('*').order('nama'),
      supabase.from('daftar_belanja').select('*, bahan_baku(*)').order('tanggal', { ascending: false }),
    ]);
    setTodos((tRes.data || []) as Todo[]);
    setBahan((bRes.data || []) as BahanBaku[]);
    setBelanja((belanjaRes.data || []) as DaftarBelanja[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('todo').insert({
      tanggal: form.tanggal,
      deskripsi: form.deskripsi,
      prioritas: form.prioritas,
      berulang: form.berulang,
    });
    setSaving(false);
    setModalOpen(false);
    setForm({ tanggal: todayISO(), deskripsi: '', prioritas: 'sedang', berulang: false });
    fetchAll();
  };

  const toggleTodo = async (t: Todo) => {
    await supabase.from('todo').update({ status: t.status === 'selesai' ? 'belum' : 'selesai' }).eq('id', t.id);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('todo').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchAll();
  };

  const addToBelanja = async (bahanId: string) => {
    const b = bahan.find((x) => x.id === bahanId);
    if (!b) return;
    const jumlah = b.stok_minimum - b.stok_saat_ini;
    await supabase.from('daftar_belanja').insert({
      bahan_baku_id: bahanId,
      jumlah_dibutuhkan: Math.max(jumlah, 1),
    });
    fetchAll();
  };

  const toggleBelanja = async (item: DaftarBelanja) => {
    await supabase
      .from('daftar_belanja')
      .update({ status: item.status === 'belum' ? 'sudah' : 'belum' })
      .eq('id', item.id);
    fetchAll();
  };

  const deleteBelanja = async (id: string) => {
    await supabase.from('daftar_belanja').delete().eq('id', id);
    fetchAll();
  };

  const lowStock = bahan.filter((b) => b.stok_saat_ini < b.stok_minimum);
  const today = todayISO();
  const todayTodos = todos.filter((t) => t.tanggal === today);
  const otherTodos = todos.filter((t) => t.tanggal !== today);

  return (
    <div>
      <PageHeader
        title="Jadwal & To-Do"
        subtitle="Checklist harian dan daftar belanja bahan"
        action={
          tab === 'todo' ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> Tambah Tugas
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('todo')}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
            tab === 'todo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> To-Do
        </button>
        <button
          onClick={() => setTab('belanja')}
          className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
            tab === 'belanja' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Daftar Belanja
          {lowStock.length > 0 && <Badge color="red">{lowStock.length}</Badge>}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : tab === 'todo' ? (
        <div className="space-y-6">
          {/* Today's todos */}
          <Card>
            <CardHeader title="Hari Ini" subtitle={formatDate(today)} action={todayTodos.length > 0 ? <Badge color="slate">{todayTodos.filter((t) => t.status === 'belum').length} belum</Badge> : null} />
            <CardBody>
              {todayTodos.length === 0 ? (
                <EmptyState icon={<CheckSquare className="w-6 h-6" />} title="Tidak ada tugas hari ini" />
              ) : (
                <div className="space-y-1">
                  {todayTodos.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t)} onDelete={() => setDeleteId(t.id)} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Other dates */}
          {otherTodos.length > 0 && (
            <Card>
              <CardHeader title="Tugas Lain" subtitle="Tanggal sebelumnya atau akan datang" />
              <CardBody>
                <div className="space-y-1">
                  {otherTodos.slice(0, 20).map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={() => toggleTodo(t)} onDelete={() => setDeleteId(t.id)} />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Auto-generated from low stock */}
          <Card className="bg-amber-50 border-amber-100">
            <CardHeader
              title="Perlu Belanja"
              subtitle="Bahan baku dengan stok di bawah minimum"
              action={lowStock.length > 0 ? <Badge color="red">{lowStock.length} item</Badge> : null}
            />
            <CardBody>
              {lowStock.length === 0 ? (
                <EmptyState icon={<Check className="w-6 h-6" />} title="Stok aman" description="Semua bahan baku di atas batas minimum" />
              ) : (
                <div className="space-y-2">
                  {lowStock.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-amber-100">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-700">{b.nama}</p>
                          <p className="text-xs text-slate-500">Sisa {b.stok_saat_ini} {b.satuan} · Min. {b.stok_minimum} {b.satuan}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => addToBelanja(b.id)}>
                        <Plus className="w-3.5 h-3.5" /> Tambah ke list
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Shopping list */}
          <Card>
            <CardHeader title="Daftar Belanja" subtitle="Checklist belanja bahan baku" />
            <CardBody>
              {belanja.length === 0 ? (
                <EmptyState icon={<ShoppingCart className="w-6 h-6" />} title="Daftar belanja kosong" description="Tambahkan dari daftar bahan stok rendah di atas" />
              ) : (
                <div className="space-y-1">
                  {belanja.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50">
                      <button
                        onClick={() => toggleBelanja(item)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          item.status === 'sudah' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                        }`}
                      >
                        {item.status === 'sudah' && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${item.status === 'sudah' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {item.bahan_baku?.nama}
                        </p>
                        <p className="text-xs text-slate-400">{item.jumlah_dibutuhkan} {item.bahan_baku?.satuan} · {formatDate(item.tanggal)}</p>
                      </div>
                      <button onClick={() => deleteBelanja(item.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Tugas">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Deskripsi" required value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Cek air vas bunga" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tanggal" type="date" required value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            <Select label="Prioritas" value={form.prioritas} onChange={(e) => setForm({ ...form, prioritas: e.target.value as any })}>
              {PRIORITAS_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.berulang} onChange={(e) => setForm({ ...form, berulang: e.target.checked })} className="w-4 h-4 rounded accent-rose-500" />
            <span className="text-sm text-slate-600 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5" /> Tugas berulang (rutin harian)
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Hapus Tugas?" message="Tugas akan dihapus permanen." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: () => void; onDelete: () => void }) {
  const prioritas = PRIORITAS_OPTIONS.find((p) => p.value === todo.prioritas);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          todo.status === 'selesai' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
        }`}
      >
        {todo.status === 'selesai' && <Check className="w-3 h-3 text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${todo.status === 'selesai' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {todo.deskripsi}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{formatDate(todo.tanggal)}</span>
          {prioritas && <Badge color={prioritas.color}>{prioritas.label}</Badge>}
          {todo.berulang && <Repeat className="w-3 h-3 text-slate-400" />}
        </div>
      </div>
      <button onClick={onDelete} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
