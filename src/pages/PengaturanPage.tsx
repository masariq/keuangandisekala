import { useEffect, useState, useCallback } from 'react';
import { Settings, Save, Percent, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PengaturanMargin } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/format';
import { calculateRecommendedPrice, roundToNiceNumber } from '@/lib/hpp';

const DEFAULTS: Omit<PengaturanMargin, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  margin_kompetitif: 28,
  margin_standar: 40,
  margin_premium: 55,
  margin_minimum_warning: 20,
  persen_waste_default: 10,
};

export function PengaturanPage() {
  const [settings, setSettings] = useState<PengaturanMargin | null>(null);
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('pengaturan_margin').select('*').maybeSingle();
    if (data) {
      setSettings(data as PengaturanMargin);
      setForm({
        margin_kompetitif: data.margin_kompetitif,
        margin_standar: data.margin_standar,
        margin_premium: data.margin_premium,
        margin_minimum_warning: data.margin_minimum_warning,
        persen_waste_default: data.persen_waste_default,
      });
    } else {
      const { data: created } = await supabase.from('pengaturan_margin').insert({}).select().single();
      if (created) setSettings(created as PengaturanMargin);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (settings) {
      await supabase.from('pengaturan_margin').update({
        margin_kompetitif: form.margin_kompetitif,
        margin_standar: form.margin_standar,
        margin_premium: form.margin_premium,
        margin_minimum_warning: form.margin_minimum_warning,
        persen_waste_default: form.persen_waste_default,
        updated_at: new Date().toISOString(),
      }).eq('id', settings.id);
    } else {
      const { data } = await supabase.from('pengaturan_margin').insert({
        margin_kompetitif: form.margin_kompetitif,
        margin_standar: form.margin_standar,
        margin_premium: form.margin_premium,
        margin_minimum_warning: form.margin_minimum_warning,
        persen_waste_default: form.persen_waste_default,
      }).select().single();
      if (data) setSettings(data as PengaturanMargin);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const exampleHpp = 50000;
  const exampleEffective = exampleHpp * (1 + form.persen_waste_default / 100);

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Atur target margin dan persentase waste bunga" />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Target Margin" subtitle="Persentase keuntungan untuk rekomendasi harga jual" />
          <CardBody>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Margin Kompetitif (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={String(form.margin_kompetitif)}
                  onChange={(e) => setForm({ ...form, margin_kompetitif: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Margin Standar (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={String(form.margin_standar)}
                  onChange={(e) => setForm({ ...form, margin_standar: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Margin Premium (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={String(form.margin_premium)}
                  onChange={(e) => setForm({ ...form, margin_premium: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Margin Minimum Peringatan (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={String(form.margin_minimum_warning)}
                  onChange={(e) => setForm({ ...form, margin_minimum_warning: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label="Waste Bunga Default (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={String(form.persen_waste_default)}
                  onChange={(e) => setForm({ ...form, persen_waste_default: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contoh Rekomendasi" subtitle={`Untuk HPP Rp 50.000 (waste ${form.persen_waste_default}%)`} />
          <CardBody>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-xs text-slate-400">HPP Efektif (dengan waste)</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(exampleEffective)}</p>
              </div>
              <RecommendationRow label="Kompetitif" margin={form.margin_kompetitif} hpp={exampleEffective} />
              <RecommendationRow label="Standar" margin={form.margin_standar} hpp={exampleEffective} highlight />
              <RecommendationRow label="Premium" margin={form.margin_premium} hpp={exampleEffective} />
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-600">
                  Margin di bawah {form.margin_minimum_warning}% akan memunculkan peringatan di Dashboard dan halaman produk.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function RecommendationRow({ label, margin, hpp, highlight }: { label: string; margin: number; hpp: number; highlight?: boolean }) {
  const price = roundToNiceNumber(calculateRecommendedPrice(hpp, margin));
  return (
    <div className={`p-3 rounded-xl border ${highlight ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label} ({margin}%)</span>
        {highlight && <Percent className="w-3.5 h-3.5 text-emerald-500" />}
      </div>
      <p className={`text-sm font-bold mt-0.5 ${highlight ? 'text-emerald-700' : 'text-slate-700'}`}>{formatCurrency(price)}</p>
    </div>
  );
}
