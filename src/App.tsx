import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout, type PageKey } from '@/components/Layout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BahanBakuPage } from '@/pages/BahanBakuPage';
import { ProdukPage } from '@/pages/ProdukPage';
import { TransaksiPage } from '@/pages/TransaksiPage';
import { BiayaPage } from '@/pages/BiayaPage';
import { LaporanPage } from '@/pages/LaporanPage';
import { AnalisisPage } from '@/pages/AnalisisPage';
import { KategoriPage } from '@/pages/KategoriPage';
import { PengaturanPage } from '@/pages/PengaturanPage';
import { TodoPage } from '@/pages/TodoPage';
import { TimPage } from '@/pages/TimPage';

function AppContent() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <Layout current={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage />}
      {page === 'produk' && <ProdukPage />}
      {page === 'bahan' && <BahanBakuPage />}
      {page === 'transaksi' && <TransaksiPage />}
      {page === 'biaya' && <BiayaPage />}
      {page === 'laporan' && <LaporanPage />}
      {page === 'analisis' && <AnalisisPage />}
      {page === 'kategori' && <KategoriPage />}
      {page === 'pengaturan' && <PengaturanPage />}
      {page === 'todo' && <TodoPage />}
      {page === 'tim' && <TimPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
