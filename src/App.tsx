import { useState } from 'react';
import { Layout, type PageKey } from '@/components/Layout';
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

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');

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

export default App;
