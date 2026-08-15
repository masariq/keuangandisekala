import { type ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Flower2,
  ArrowLeftRight,
  Wallet,
  BarChart3,
  CheckSquare,
  Users,
  Menu,
  X,
  TrendingUp,
  Tag,
  Settings,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'produk'
  | 'bahan'
  | 'transaksi'
  | 'biaya'
  | 'laporan'
  | 'analisis'
  | 'kategori'
  | 'pengaturan'
  | 'todo'
  | 'tim';

interface NavItem {
  key: PageKey;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { key: 'produk', label: 'Produk & Resep', icon: <Package size={20} /> },
  { key: 'kategori', label: 'Kategori', icon: <Tag size={20} /> },
  { key: 'bahan', label: 'Bahan Baku', icon: <Flower2 size={20} /> },
  { key: 'transaksi', label: 'Transaksi', icon: <ArrowLeftRight size={20} /> },
  { key: 'biaya', label: 'Biaya', icon: <Wallet size={20} /> },
  { key: 'laporan', label: 'Laporan', icon: <BarChart3 size={20} /> },
  { key: 'analisis', label: 'Analisis Margin', icon: <TrendingUp size={20} /> },
  { key: 'todo', label: 'Jadwal & To-Do', icon: <CheckSquare size={20} /> },
  { key: 'tim', label: 'Tim', icon: <Users size={20} /> },
  { key: 'pengaturan', label: 'Pengaturan', icon: <Settings size={20} /> },
];

interface LayoutProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageKey) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20">
            <Flower2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">BloomBook</h1>
            <p className="text-xs text-slate-400">Toko Bunga Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                current === item.key
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
            <Flower2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">BloomBook</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                  <Flower2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-800">BloomBook</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    current === item.key
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
