import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ArrowUpRight, Users, TrendingDown, MapPin, AlertTriangle } from 'lucide-react';
import { formatNumber, type BranchStats } from '../services/evoApi';
import { UnitDetailsModal } from '../components/UnitDetailsModal';
import type { DashboardData, Page } from '../App';

const container: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

type SortKey = 'name' | 'activeMembers' | 'inactiveMembers' | 'retentionRate';

interface Props {
  data: DashboardData | null;
  isLoading: boolean;
  onNavigateToMembers?: (branchId: number) => void;
  onNavigate?: (page: Page) => void;
}

export function UnidadesScreen({ data, isLoading, onNavigateToMembers, onNavigate }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('activeMembers');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<BranchStats | null>(null);

  const units: BranchStats[] = data?.units ?? [];

  const sorted = [...units].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === 'name') return sortDesc
      ? b.name.localeCompare(a.name)
      : a.name.localeCompare(b.name);
    if (sortKey === 'activeMembers')   { av = a.activeMembers;   bv = b.activeMembers; }
    if (sortKey === 'inactiveMembers') { av = a.inactiveMembers; bv = b.inactiveMembers; }
    if (sortKey === 'retentionRate') {
      const total = (u: BranchStats) => u.activeMembers + u.inactiveMembers;
      av = total(a) > 0 ? a.activeMembers / total(a) : 0;
      bv = total(b) > 0 ? b.activeMembers / total(b) : 0;
    }
    return sortDesc ? bv - av : av - bv;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(d => !d);
    else { setSortKey(key); setSortDesc(true); }
  }

  const totalActive   = units.reduce((s, u) => s + u.activeMembers, 0);
  const totalInactive = units.reduce((s, u) => s + u.inactiveMembers, 0);
  const globalTotal   = totalActive + totalInactive;
  const globalRetention = globalTotal > 0 ? Math.round((totalActive / globalTotal) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* ── Header ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <span className="text-[11px] uppercase font-black text-primary tracking-[0.2em] mb-3 block">
          Gestão de Unidades
        </span>
        <h1 className="text-[3.5rem] font-black text-primary leading-none tracking-tighter mb-4">
          Unidades <span className="text-accent">Operacionais</span>
        </h1>
        <p className="text-slate-400 text-[16px] font-semibold">
          Visão detalhada de desempenho por filial.
        </p>
      </motion.div>

      {/* ── Summary Cards ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14"
      >
        {[
          { label: 'Total Unidades',  value: String(units.length),           icon: MapPin,       color: 'text-primary',  bg: 'bg-[#E8F5EC]' },
          { label: 'Membros Ativos',  value: formatNumber(totalActive),       icon: Users,        color: 'text-primary',  bg: 'bg-[#F0F7EC]' },
          { label: 'Inativos',        value: formatNumber(totalInactive),     icon: TrendingDown, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Retenção Global', value: `${globalRetention}%`,           icon: ArrowUpRight, color: 'text-accent',   bg: 'bg-[#F0F7EC]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <motion.div key={label} variants={item}>
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                <Icon size={18} className={color} strokeWidth={2.5} />
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-[2rem] font-black text-primary tracking-tighter">{isLoading ? '—' : value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Sort Controls ── */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Ordenar por:</span>
        {([
          { key: 'activeMembers',   label: 'Membros Ativos' },
          { key: 'inactiveMembers', label: 'Inativos'       },
          { key: 'retentionRate',   label: 'Retenção'       },
          { key: 'name',            label: 'Nome'           },
        ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={`px-4 py-2 rounded-full text-[12px] font-black transition-all ${
              sortKey === key
                ? 'bg-primary text-white shadow-[0_4px_12px_rgba(15,60,35,0.2)]'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {label} {sortKey === key && (sortDesc ? '↓' : '↑')}
          </button>
        ))}
      </div>

      {/* ── Unit Cards Grid ── */}
      {isLoading ? (
        <motion.div variants={container} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.div key={i} variants={item}>
              <SkeletonUnitCard />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {sorted.map((unit) => (
            <motion.div key={unit.name} variants={item}>
              <DetailedUnitCard 
                unit={unit} 
                onDetailsClick={() => setSelectedUnit(unit)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <UnitDetailsModal
        unit={selectedUnit}
        isOpen={!!selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onNavigateToMembers={onNavigateToMembers}
        onViewReport={() => onNavigate?.('financeiro')}
      />

      {/* ── Comparison Table ── */}
      {!isLoading && units.length > 0 && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16"
        >
          <div className="flex items-center gap-4 mb-8 border-l-[6px] border-l-primary pl-5">
            <h2 className="text-[1.6rem] font-black text-[#1E293B] tracking-tight">Comparativo de Desempenho</h2>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F9FBF9]">
                  {['Unidade', 'Membros Ativos', 'Inativos', 'Retenção', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((unit, i) => {
                  const total = unit.activeMembers + unit.inactiveMembers;
                  const retention = total > 0 ? Math.round((unit.activeMembers / total) * 100) : 0;
                  return (
                    <tr key={unit.name} className={`border-b border-slate-50 hover:bg-[#F9FBF9] transition-colors ${i === sorted.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-black text-[#0F172A] text-[14px]">{unit.name}</p>
                          <p className="text-[11px] text-slate-400 font-semibold">{unit.location}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-primary text-[15px]">{unit.hasError ? '—' : unit.activeMembers.toLocaleString('pt-BR')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-amber-500 text-[14px]">{unit.hasError ? '—' : unit.inactiveMembers.toLocaleString('pt-BR')}</span>
                      </td>
                      <td className="px-6 py-4">
                        {unit.hasError ? <span className="text-slate-400 font-bold">—</span> : (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-[80px] h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${retention >= 80 ? 'bg-primary' : retention >= 60 ? 'bg-yellow-400' : 'bg-rose-400'}`}
                                style={{ width: `${retention}%` }}
                              />
                            </div>
                            <span className="text-[13px] font-black text-slate-700">{retention}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {unit.hasError
                          ? <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-full text-[11px] font-black"><AlertTriangle size={10} /> Falha</span>
                          : <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F5EC] text-primary rounded-full text-[11px] font-black"><span className="w-1.5 h-1.5 bg-accent rounded-full" />Ativo</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals row */}
          <div className="mt-4 flex flex-wrap gap-4">
            {[
              { label: 'Total Ativos',    value: totalActive.toLocaleString('pt-BR'),   color: 'text-primary' },
              { label: 'Total Inativos',  value: totalInactive.toLocaleString('pt-BR'), color: 'text-amber-500' },
              { label: 'Retenção Global', value: `${globalRetention}%`,                 color: 'text-accent' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 px-5 py-3 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-[1.4rem] font-black ${color} tracking-tighter`}>{value}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Detailed Unit Card ───────────────────────────────────────────────────────

function DetailedUnitCard({ unit, onDetailsClick }: { unit: BranchStats; onDetailsClick?: () => void }) {
  const total = unit.activeMembers + unit.inactiveMembers;
  const retention = total > 0 ? Math.round((unit.activeMembers / total) * 100) : 0;
  const retentionColor = retention >= 80 ? '#10B981' : retention >= 60 ? '#EAB308' : '#F43F5E';

  return (
    <div 
      onClick={onDetailsClick}
      className="rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.05)] bg-white group cursor-pointer hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
    >
      <div className={`h-1.5 ${unit.hasError ? 'bg-red-200' : 'bg-gradient-to-r from-[#0F3C23] via-[#0F3C23] to-[#B1D135]'}`} />

      <div className="p-7 pt-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h4 className="font-black text-[#0F172A] text-[1.3rem] leading-tight mb-1 tracking-tight">{unit.name}</h4>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-black uppercase tracking-wider">
              <MapPin size={10} /> {unit.location}
            </div>
          </div>
          {unit.hasError ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-400 rounded-full text-[10px] font-black">
              <AlertTriangle size={10} /> Falha
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5EC] text-primary rounded-full text-[10px] font-black">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> Ativo
            </span>
          )}
        </div>

        {/* Stats Grid */}
        {unit.hasError ? (
          <div className="h-24 flex items-center justify-center text-slate-300 text-[13px] font-bold">
            Dados indisponíveis
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Ativos',   value: unit.activeMembers.toLocaleString('pt-BR'),   color: 'text-primary' },
                { label: 'Inativos', value: unit.inactiveMembers.toLocaleString('pt-BR'), color: 'text-amber-500' },
                { label: 'Retenção', value: `${retention}%`,                              color: 'text-accent' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#F8FAFB] rounded-[1.2rem] p-4 border border-slate-50">
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-wider mb-1.5">{label}</p>
                  <p className={`text-[1.2rem] font-black tracking-tighter ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Retention Bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Retenção</span>
                <span className="text-[13px] font-black" style={{ color: retentionColor }}>{retention}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${retention}%`, backgroundColor: retentionColor }}
                />
              </div>
            </div>
          </>
        )}

        <button 
          onClick={(e) => { e.stopPropagation(); onDetailsClick?.(); }}
          className="w-full py-4 rounded-[1rem] border-[1.5px] border-[#0F3C23]/10 bg-white text-[#0F3C23] text-[12px] font-black uppercase tracking-[0.1em] hover:bg-primary hover:text-white hover:border-primary transition-all duration-300 flex items-center justify-center gap-2"
        >
          Ver Detalhes <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonUnitCard() {
  return (
    <div className="rounded-[2.5rem] border border-slate-100 overflow-hidden animate-pulse bg-white">
      <div className="h-1.5 bg-slate-100" />
      <div className="p-7 pt-8">
        <div className="h-5 bg-slate-100 rounded-xl mb-2 w-2/3" />
        <div className="h-3 bg-slate-50 rounded-xl mb-7 w-1/2" />
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-[1.2rem]" />)}
        </div>
        <div className="h-2.5 bg-slate-50 rounded-full mb-5" />
        <div className="h-12 bg-slate-50 rounded-[1rem]" />
      </div>
    </div>
  );
}
