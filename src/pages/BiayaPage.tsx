import { useEffect, useState, useCallback } from 'react';
import { Plus, Wallet, Pencil, Trash2, Building2, Zap, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { calculateDepreciationPerMonth } from '@/lib/hpp';
import type { BiayaTetap, BiayaVariabelLain, BiayaInvestasi } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, PageHeader } from '@/components/ui/ConfirmDialog';

type Tab = 'tetap' | 'variabel' | 'investasi';

export function BiayaPage() {
  const [tab, setTab] = useState<Tab>('tetap');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTetap, setFormTetap] = useState({ nama_biaya: '', jumlah_per_bulan: '', tanggal_mulai: todayISO(), aktif: true });
  const [formVariabel, setFormVariabel] = useState({ nama: '', jumlah: '', tanggal: todayISO() });
  const [formInvestasi, setFormInvestasi] = useState({ nama_aset: '', nilai: '', tanggal_beli: todayISO(), estimasi_umur_pakai_bulan: '12' });

  const fetch = useCallback(async () => {
    setLoading(true);
    let result;
    if (tab === 'tetap') result = await supabase.from('biaya_tetap').select('*').order('nama_biaya');
    else if (tab === 'variabel') result = await supabase.from('biaya_variabel_lain').select('*').order('tanggal', { ascending: false });
    else result = await supabase.from('biaya_investasi').select('*').order('tanggal_beli', { ascending: false });
    setData(result.data || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const openAdd = () => {
    setEditing(null);
    if (tab === 'tetap') setFormTetap({ nama_biaya: '', jumlah_per_bulan: '', tanggal_mulai: todayISO(), aktif: true });
    else if (tab === 'variabel') setFormVariabel({ nama: '', jumlah: '', tanggal: todayISO() });
    else setFormInvestasi({ nama_aset: '', nilai: '', tanggal_beli: todayISO(), estimasi_umur_pakai_bulan: '12' });
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    if (tab === 'tetap') setFormTetap({ nama_biaya: item.nama_biaya, jumlah_per_bulan: String(item.jumlah_per_bulan), tanggal_mulai: item.tanggal_mulai || todayISO(), aktif: item.aktif });
    else if (tab === 'variabel') setFormVariabel({ nama: item.nama, jumlah: String(item.jumlah), tanggal: item.tanggal });
    else setFormInvestasi({ nama_aset: item.nama_aset, nilai: String(item.nilai), tanggal_beli: item.tanggal_beli || todayISO(), estimasi_umur_pakai_bulan: String(item.estimasi_umur_pakai_bulan) });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let payload: any;
    let table: string;
    if (tab === 'tetap') {
      payload = { nama_biaya: formTetap.nama_biaya, jumlah_per_bulan: parseFloat(formTetap.jumlah_per_bulan) || 0, tanggal_mulai: formTetap.tanggal_mulai, aktif: formTetap.aktif };
      table = 'biaya_tetap';
    } else if (tab === 'variabel') {
      payload = { nama: formVariabel.nama, jumlah: parseFloat(formVariabel.jumlah) || 0, tanggal: formVariabel.tanggal };
      table = 'biaya_variabel_lain';
    } else {
      payload = { nama_aset: formInvestasi.nama_aset, nilai: parseFloat(formInvestasi.nilai) || 0, tanggal_beli: formInvestasi.tanggal_beli, estimasi_umur_pakai_bulan: parseFloat(formInvestasi.estimasi_umur_pakai_bulan) || 1 };
      table = 'biaya_investasi';
    }

    if (editing) {
      await supabase.from(table).update(payload).eq('id', editing.id);
    } else {
      await supabase.from(table).insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const table = tab === 'tetap' ? 'biaya_tetap' : tab === 'variabel' ? 'biaya_variabel_lain' : 'biaya_investasi';
    await supabase.from(table).delete().eq('id', deleteId);
    setDeleteId(null);
    fetch();
  };

  const totalTetap = data.filter((d: any) => d.aktif).reduce((s: number, d: any) => s + (d.jumlah_per_bulan || 0), 0);
  const totalVariabel = data.reduce((s: number, d: any) => s + (d.jumlah || 0), 0);
  const totalInvestasi = data.reduce((s: number, d: any) => s + (d.nilai || 0), 0);
  const totalDepresiasi = data.reduce((s: number, d: any) => s + calculateDepreciationPerMonth(d.nilai, d.estimasi_umur_pakai_bulan), 0);

  return (
    <div>
      <PageHeader
        title="Biaya"
        subtitle="Kelola biaya tetap, variabel, dan investasi"
        action={
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        }
      />

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 max-w-2xl">
        {([
          { key: 'tetap', label: 'Biaya Tetap', icon: <Building2 className="w-4 h-4" /> },
          { key: 'variabel', label: 'Biaya Variabel', icon: <Zap className="w-4 h-4" /> },
          { key: 'investasi', label: 'Investasi', icon: <TrendingDown className="w-4 h-4" /> },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tetap' && (
        <Card className="p-4 mb-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-600">Total Biaya Tetap per Bulan</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalTetap)}</p>
            </div>
            <Building2 className="w-8 h-8 text-emerald-300" />
          </div>
        </Card>
      )}
      {tab === 'variabel' && (
        <Card className="p-4 mb-6 bg-amber-50 border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600">Total Biaya Variabel</p>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(totalVariabel)}</p>
            </div>
            <Zap className="w-8 h-8 text-amber-300" />
          </div>
        </Card>
      )}
      {tab === 'investasi' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-blue-50 border-blue-100">
            <p className="text-xs text-blue-600">Total Nilai Aset</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totalInvestasi)}</p>
          </Card>
          <Card className="p-4 bg-slate-50 border-slate-200">
            <p className="text-xs text-slate-500">Penyusutan per Bulan</p>
            <p className="text-xl font-bold text-slate-700">{formatCurrency(totalDepresiasi)}</p>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet className="w-7 h-7" />}
            title={`Belum ada biaya ${tab}`}
            description={
              tab === 'tetap'
                ? 'Tambahkan biaya tetap seperti sewa, gaji, listrik'
                : tab === 'variabel'
                ? 'Tambahkan biaya variabel seperti ongkir, kemasan'
                : 'Tambahkan aset seperti kulkas bunga, motor delivery'
            }
            action={
              <Button onClick={openAdd}>
                <Plus className="w-4 h-4" /> Tambah
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {data.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  {tab === 'tetap' ? <Building2 className="w-5 h-5" /> : tab === 'variabel' ? <Zap className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      {tab === 'tetap' ? item.nama_biaya : tab === 'variabel' ? item.nama : item.nama_aset}
                    </p>
                    {tab === 'tetap' && !item.aktif && <Badge color="slate">Nonaktif</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tab === 'tetap'
                      ? `Mulai ${item.tanggal_mulai ? formatDate(item.tanggal_mulai) : '-'}`
                      : tab === 'variabel'
                      ? formatDate(item.tanggal)
                      : `Beli ${item.tanggal_beli ? formatDate(item.tanggal_beli) : '-'} · Umur ${item.estimasi_umur_pakai_bulan} bln`}
                  </p>
                  {tab === 'investasi' && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Penyusutan: {formatCurrency(calculateDepreciationPerMonth(item.nilai, item.estimasi_umur_pakai_bulan))}/bln
                    </p>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {formatCurrency(tab === 'tetap' ? item.jumlah_per_bulan : tab === 'variabel' ? item.jumlah : item.nilai)}
                  <span className="text-xs text-slate-400 font-normal">{tab === 'tetap' ? '/bln' : ''}</span>
                </p>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(item.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Biaya' : 'Tambah Biaya'}>
        <form onSubmit={handleSave} className="space-y-4">
          {tab === 'tetap' && (
            <>
              <Input label="Nama Biaya" required value={formTetap.nama_biaya} onChange={(e) => setFormTetap({ ...formTetap, nama_biaya: e.target.value })} placeholder="Sewa toko" />
              <Input label="Jumlah per Bulan (Rp)" type="number" min="0" required value={formTetap.jumlah_per_bulan} onChange={(e) => setFormTetap({ ...formTetap, jumlah_per_bulan: e.target.value })} placeholder="2000000" />
              <Input label="Tanggal Mulai" type="date" value={formTetap.tanggal_mulai} onChange={(e) => setFormTetap({ ...formTetap, tanggal_mulai: e.target.value })} />
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formTetap.aktif} onChange={(e) => setFormTetap({ ...formTetap, aktif: e.target.checked })} className="w-4 h-4 rounded accent-rose-500" />
                <span className="text-sm text-slate-600">Biaya aktif</span>
              </label>
            </>
          )}
          {tab === 'variabel' && (
            <>
              <Input label="Nama Biaya" required value={formVariabel.nama} onChange={(e) => setFormVariabel({ ...formVariabel, nama: e.target.value })} placeholder="Ongkir pesanan" />
              <Input label="Jumlah (Rp)" type="number" min="0" required value={formVariabel.jumlah} onChange={(e) => setFormVariabel({ ...formVariabel, jumlah: e.target.value })} placeholder="15000" />
              <Input label="Tanggal" type="date" required value={formVariabel.tanggal} onChange={(e) => setFormVariabel({ ...formVariabel, tanggal: e.target.value })} />
            </>
          )}
          {tab === 'investasi' && (
            <>
              <Input label="Nama Aset" required value={formInvestasi.nama_aset} onChange={(e) => setFormInvestasi({ ...formInvestasi, nama_aset: e.target.value })} placeholder="Kulkas bunga" />
              <Input label="Nilai (Rp)" type="number" min="0" required value={formInvestasi.nilai} onChange={(e) => setFormInvestasi({ ...formInvestasi, nilai: e.target.value })} placeholder="5000000" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tanggal Beli" type="date" value={formInvestasi.tanggal_beli} onChange={(e) => setFormInvestasi({ ...formInvestasi, tanggal_beli: e.target.value })} />
                <Input label="Umur Pakai (bulan)" type="number" min="1" required value={formInvestasi.estimasi_umur_pakai_bulan} onChange={(e) => setFormInvestasi({ ...formInvestasi, estimasi_umur_pakai_bulan: e.target.value })} placeholder="36" />
              </div>
              {parseFloat(formInvestasi.nilai) > 0 && parseFloat(formInvestasi.estimasi_umur_pakai_bulan) > 0 && (
                <p className="text-xs text-blue-600 font-medium">
                  Penyusutan: {formatCurrency(calculateDepreciationPerMonth(parseFloat(formInvestasi.nilai), parseFloat(formInvestasi.estimasi_umur_pakai_bulan)))}/bln
                </p>
              )}
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Hapus Biaya?" message="Biaya akan dihapus permanen." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
