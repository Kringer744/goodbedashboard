import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Bell, Search, X as XIcon, LogOut } from 'lucide-react';
import gbEncurtado from './assets/gb_encurtado.png';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginScreen } from './components/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { UnidadesScreen } from './screens/UnidadesScreen';
import { MembrosScreen } from './screens/MembrosScreen';
import { FinanceiroScreen } from './screens/FinanceiroScreen';
import { KPIsScreen } from './screens/KPIsScreen';
import { CampanhasScreen } from './screens/CampanhasScreen';
import { MetasScreen } from './screens/MetasScreen';
import { AgregadoresScreen } from './screens/AgregadoresScreen';
import { getSession, clearSession, getAllowedPages, type GbUser } from './services/nocodbApi';
import {
  fetchTodayEntriesAllBranches,
  fetchAllBranchStats,
  groupEntriesBySlot,
  groupEntriesBySlotPerBranch,
  type BranchStats,
} from './services/evoApi';

export type Page = 'dashboard' | 'unidades' | 'membros' | 'financeiro' | 'kpis' | 'campanhas' | 'metas' | 'agregadores';

export interface DashboardData {
  totalActiveMembers: number;
  totalCancelledMembers: number;
  totalInactiveMembers: number;
  todayEntries: number;
  retentionRate: number;
  units: BranchStats[];
  barData: number[];
  heatmapData: Record<string, number[]>;
  hasAnyError: boolean;
  lastUpdated: Date;
}

const FALLBACK_BARS = [40, 55, 65, 80, 75, 95, 100, 85, 70, 50, 40, 20];

const ALL_NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'dashboard',   label: 'Painel' },
  { id: 'unidades',    label: 'Unidades' },
  { id: 'financeiro',  label: 'Financeiro' },
  { id: 'membros',     label: 'Membros' },
  { id: 'metas',       label: 'Metas' },
  { id: 'agregadores', label: 'Agregadores' },
  { id: 'campanhas',   label: 'Marketing' },
  { id: 'kpis',        label: 'KPIs' },
];

function App() {
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [currentUser,  setCurrentUser]  = useState<GbUser | null>(null);
  const [currentPage,  setCurrentPage]  = useState<Page>('dashboard');
  const [data,         setData]         = useState<DashboardData | null>(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [initialBranchId, setInitialBranchId] = useState<number>(0);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [searchOpen,   setSearchOpen]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = getSession();
    if (saved) { setCurrentUser(saved); setIsLoggedIn(true); }
  }, []);

  // Filter nav items based on user permissions
  const NAV_ITEMS = currentUser
    ? ALL_NAV_ITEMS.filter(item => {
        const allowed = getAllowedPages(currentUser);
        return allowed === 'all' || allowed.includes(item.id);
      })
    : ALL_NAV_ITEMS;

  const navigateToMembers = (branchId: number) => {
    setInitialBranchId(branchId);
    setCurrentPage('membros');
  };

  // Fechar busca ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim().length >= 1
    ? (data?.units ?? []).filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  async function loadDashboard(isBackground = false) {
    if (!isBackground) setIsLoading(true);
    setLoadError(null);
    try {
      const [branchStats, entries] = await Promise.all([
        fetchAllBranchStats(),
        fetchTodayEntriesAllBranches(),
      ]);

      const totalActive   = branchStats.reduce((s: number, b: BranchStats) => s + b.activeMembers, 0);
      const totalInactive = branchStats.reduce((s: number, b: BranchStats) => s + b.inactiveMembers, 0);
      const total         = totalActive + totalInactive;
      // retentionRate = active / (active + inactive). Cancelled is not available via EVO API.
      const retentionRate = total > 0 ? Math.round((totalActive / total) * 100) : 0;

      const newData: DashboardData = {
        totalActiveMembers:    totalActive,
        totalCancelledMembers: 0, // API does not support cancelled filter — always 0
        totalInactiveMembers:  totalInactive,
        todayEntries:          entries.length,
        retentionRate:         retentionRate,
        units:                 branchStats,
        barData:               entries.length > 0 ? groupEntriesBySlot(entries) : FALLBACK_BARS,
        heatmapData:           groupEntriesBySlotPerBranch(entries),
        hasAnyError:           branchStats.some((b: BranchStats) => b.hasError),
        lastUpdated:           new Date(),
      };

      setData(newData);
      localStorage.setItem('gb_dashboard_snapshot', JSON.stringify({ 
        data: newData, 
        timestamp: Date.now() 
      }));
    } catch {
      if (!isBackground) setLoadError('Erro ao sincronizar dados com W12 EVO. Tente atualizar.');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return;

    const REFRESH_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

    const saved = localStorage.getItem('gb_dashboard_snapshot');
    if (saved) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(saved);
        setData(cachedData);
        
        // If older than 3 hours, refresh in background immediately
        if (Date.now() - timestamp > REFRESH_INTERVAL) {
          loadDashboard(true);
        }
      } catch {
        loadDashboard();
      }
    } else {
      loadDashboard();
    }

    // Set background polling every 3 hours
    const intervalId = setInterval(() => {
      loadDashboard(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isLoggedIn]);

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setData(null);
    setCurrentPage('dashboard');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(user) => { setCurrentUser(user); setIsLoggedIn(true); }} />;
  }

  return (
    <div className="min-h-screen bg-white font-manrope selection:bg-accent selection:text-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-100 h-20 px-8">
        <div className="max-w-screen-2xl mx-auto h-full flex items-center justify-between">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
               <img src={gbEncurtado} alt="Goodbe" className="h-10 w-auto object-contain" />
               <span className="text-[15px] font-black text-primary tracking-tighter uppercase hidden sm:block">Goodbe</span>
            </div>

            <nav className="hidden lg:flex items-center">
              {NAV_ITEMS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id !== 'membros') setInitialBranchId(0);
                    setCurrentPage(id);
                  }}
                  className={`px-6 py-2 rounded-full text-[13px] font-black tracking-tight transition-all duration-300 ${
                    currentPage === id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                      : 'text-slate-400 hover:text-primary hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Tools + User */}
          <div className="flex items-center gap-6">
            {/* ── Search Bar com dropdown ── */}
            <div ref={searchRef} className="relative hidden xl:block">
               <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none z-10" />
               <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Buscar unidades ou membros..."
                  className="pl-11 pr-9 py-3 bg-slate-50 border-none rounded-2xl text-[13px] font-bold w-72 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
               />
               {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <XIcon size={14} />
                  </button>
               )}

               {/* Dropdown de resultados */}
               <AnimatePresence>
                  {searchOpen && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden z-[200]"
                    >
                      <p className="px-4 pt-3 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades</p>
                      {searchResults.map(unit => (
                        <button
                          key={unit.idBranch}
                          onClick={() => {
                            setSearchQuery('');
                            setSearchOpen(false);
                            navigateToMembers(unit.idBranch);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${unit.hasError ? 'bg-red-400' : 'bg-accent'}`} />
                          <div>
                            <p className="text-[13px] font-black text-primary leading-none">{unit.name}</p>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                              {unit.activeMembers.toLocaleString('pt-BR')} ativos · {unit.location}
                            </p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchOpen(false);
                          setCurrentPage('unidades');
                        }}
                        className="w-full px-4 py-3 border-t border-slate-50 text-[11px] font-black text-accent uppercase tracking-widest hover:bg-slate-50 transition-colors text-left"
                      >
                        Ver todas as unidades →
                      </button>
                    </motion.div>
                  )}
                  {searchOpen && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/60 z-[200] px-4 py-4"
                    >
                      <p className="text-[12px] font-bold text-slate-400">Nenhuma unidade encontrada para "{searchQuery}"</p>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
               <button 
                  onClick={() => loadDashboard()}
                  disabled={isLoading}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 transition-all relative group"
               >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
               </button>
               
               <button className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 transition-all relative">
                  <Bell size={18} />
                  {data?.hasAnyError && <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
               </button>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
               <div className="text-right hidden sm:block">
                  <p className="text-[12px] font-black text-primary leading-none">
                    {currentUser?.name ?? 'Admin'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {currentUser?.role ?? 'Usuário'}
                  </p>
               </div>
               <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm transition-transform hover:scale-105 cursor-pointer">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.email ?? 'Admin'}`} alt="User" className="w-full h-full object-cover" />
               </div>
               <button
                 onClick={handleLogout}
                 title="Sair"
                 className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all"
               >
                 <LogOut size={16} />
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {loadError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-rose-50 border-b border-rose-100 overflow-hidden"
          >
            <div className="max-w-screen-2xl mx-auto px-8 py-4 flex items-center justify-between">
              <p className="text-rose-600 text-[13px] font-bold flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> {loadError}
              </p>
              <button 
                onClick={() => loadDashboard()}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all"
              >
                Tentar Sincronizar Agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Content ── */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {currentPage === 'dashboard'   && <DashboardScreen   data={data} isLoading={isLoading} onNavigate={setCurrentPage} onNavigateToMembers={navigateToMembers} />}
            {currentPage === 'unidades'    && <UnidadesScreen    data={data} isLoading={isLoading} onNavigateToMembers={navigateToMembers} onNavigate={setCurrentPage} />}
            {currentPage === 'membros'     && <MembrosScreen     initialBranchId={initialBranchId} />}
            {currentPage === 'financeiro'  && <FinanceiroScreen  data={data} isLoading={isLoading} />}
            {currentPage === 'kpis'        && <KPIsScreen        data={data} isLoading={isLoading} />}
            {currentPage === 'campanhas'   && <CampanhasScreen />}
            {currentPage === 'metas'       && <MetasScreen       data={data} isLoading={isLoading} />}
            {currentPage === 'agregadores' && <AgregadoresScreen />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-screen-2xl mx-auto px-8 py-16 mt-20 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
             <img src={gbEncurtado} alt="Goodbe" className="w-8 h-8 object-contain" />
           </div>
           <div>
              <p className="text-[12px] font-black text-primary uppercase tracking-widest">Goodbe Dashboard</p>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">Gestão Inteligente © {new Date().getFullYear()}</p>
           </div>
        </div>
        <div className="flex items-center gap-10 text-[11px] font-black text-slate-400 uppercase tracking-widest">
           <a href="#" className="hover:text-primary transition-colors">V1.2.0 Stable</a>
           <a href="#" className="hover:text-primary transition-colors">Suporte</a>
           <a href="#" className="hover:text-primary transition-colors">Docs</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
