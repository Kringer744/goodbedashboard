import { useState } from 'react';
import { motion } from 'framer-motion';
import gbElement from '../assets/gb_element-2.png';
import {
  Users,
  TrendingUp,
  Activity,
  ArrowRight,
  Map as MapIcon,
  Download,
  Filter
} from 'lucide-react';
import { type DashboardData, type Page } from '../App';
import { StatsCard } from '../components/StatsCard';
import { Megaphone } from 'lucide-react';
import { UnitCard } from '../components/UnitCard';
import { UnitDetailsModal } from '../components/UnitDetailsModal';
import { formatNumber, getCachedAvgTicket, type BranchStats, UNITS } from '../services/evoApi';
import { generateReport } from '../services/pdfReport';

interface Props {
  data: DashboardData | null;
  isLoading: boolean;
  onNavigate: (page: Page) => void;
  onNavigateToMembers?: (branchId: number) => void;
}

export function DashboardScreen({ data, isLoading, onNavigate, onNavigateToMembers }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<BranchStats | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const bars = data?.barData ?? FALLBACK_BARS;

  const avgTicket = getCachedAvgTicket();
  const receita = data ? data.totalActiveMembers * avgTicket : 0;
  const metaSpend = Number(localStorage.getItem('gb_meta_total_spend') || 0);

  // Derive real peak hour from entries bar data
  const peakIdx = bars.reduce((best, v, i) => v > bars[best] ? i : best, 0);
  const peakHour = 6 + peakIdx * 1.5;
  const peakStr = `${Math.floor(peakHour)}h — ${Math.floor(peakHour + 1.5)}h`;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* ── Branding Hero — sem container, logo direto na página ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="w-full mb-8 flex flex-col items-center"
      >
        {/* Logo real */}
        <img
          src={gbElement}
          alt="Goodbe"
          className="w-full max-w-[860px] h-auto object-contain select-none"
          draggable={false}
        />

        {/* Reflexo espelhado com máscara degradê */}
        <div
          className="w-full max-w-[860px] overflow-hidden pointer-events-none"
          style={{ height: 56, marginTop: -4 }}
        >
          <img
            src={gbElement}
            alt=""
            aria-hidden
            className="w-full h-auto object-contain select-none"
            draggable={false}
            style={{
              transform: 'scaleY(-1)',
              transformOrigin: 'top',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 100%)',
            }}
          />
        </div>

        {/* Botão Relatório Completo — alinhado à direita sob o logo */}
        <div className="hidden md:flex mt-4 w-full max-w-[860px] justify-end gap-3 items-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <Filter size={12} /> Filtro: <span className="text-primary">Geral</span>
          </div>
          <button
            disabled={generatingPdf || !data}
            onClick={async () => {
              if (!data) return;
              setGeneratingPdf(true);
              try { await generateReport(data); }
              catch (e) { console.error('[PDF]', e); }
              finally { setGeneratingPdf(false); }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} className={generatingPdf ? 'animate-bounce' : ''} />
            {generatingPdf ? 'Gerando…' : 'Relatório Completo'}
          </button>
        </div>
      </motion.div>

      {/* ── Title Section ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-14"
      >
        <span className="text-[11px] uppercase font-black text-primary tracking-[0.4em] mb-4 block">
           Sistema de Gerenciamento Unificado
        </span>
        <h1 className="text-[3.8rem] font-black text-primary leading-[0.9] tracking-tighter mb-4">
          Monitoramento <span className="text-accent underline decoration-primary/10">Estratégico</span>
        </h1>
        <p className="text-slate-400 text-[17px] font-semibold max-w-xl">
          Dados operacionais consolidados de todas as unidades Goodbe.
        </p>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
        <StatsCard
          title="Membros Ativos"
          value={data ? formatNumber(data.totalActiveMembers) : '—'}
          trend="Status: Ativo na EVO"
          icon={Users}
          color="primary"
          isLoading={isLoading}
        />
        <StatsCard
          title="Entradas Hoje"
          value={data ? formatNumber(data.todayEntries) : '—'}
          trend="Check-ins registrados hoje"
          icon={Activity}
          color="accent"
          isLoading={isLoading}
        />
        <StatsCard
          title="MRR Estimado"
          value={data ? `R$ ${(receita / 1000).toFixed(0)}k` : '—'}
          trend={`Ticket médio R$ ${avgTicket}`}
          icon={TrendingUp}
          color="primary"
          isLoading={isLoading}
        />
        <StatsCard
          title="Investimento Ads"
          value={metaSpend > 0 ? `R$ ${formatNumber(metaSpend)}` : 'R$ 0'}
          trend="Meta Ads (30 dias)"
          icon={Megaphone}
          color="accent"
          isLoading={isLoading}
        />
        <StatsCard
          title="Membros Inativos"
          value={data ? formatNumber(data.totalInactiveMembers) : '—'}
          trend="Reativação pendente"
          icon={TrendingUp}
          color="amber"
          isLoading={isLoading}
        />
      </div>

      {/* ── Operational Units ── */}
      <section className="mb-24">
         <div className="flex items-center justify-between mb-12 border-l-[6px] border-l-primary pl-6">
            <div>
               <h2 className="text-[2.2rem] font-black text-primary tracking-tight">Unidades Operacionais</h2>
               <p className="text-[14px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status em Tempo Real (W12 EVO)</p>
            </div>
            <button
               onClick={() => onNavigate('unidades')}
               className="group flex items-center gap-4 px-7 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-xl hover:shadow-primary/20"
            >
               ACESSAR LISTAGEM COMPLETA <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading && !data ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-72 bg-slate-50 rounded-[3rem] animate-pulse border border-slate-100" />
              ))
            ) : (
              data?.units.slice(0, 3).map((unit) => (
                <UnitCard
                  key={unit.name}
                  unit={unit}
                  onDetailsClick={() => setSelectedUnit(unit)}
                />
              ))
            )}
         </div>
      </section>

      {/* ── Network Speed / Velocity ── */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="bg-[#F8FAFB] border border-slate-100 rounded-[4.5rem] p-12 lg:p-16 mb-24 relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 relative z-10">
          <div>
            <h3 className="text-[2.8rem] font-black text-primary leading-tight tracking-tighter mb-4">
               Velocidade da <span className="text-accent">Rede</span>
            </h3>
            <p className="text-slate-400 text-[17px] font-semibold max-w-lg">
               Distribuição de check-ins agregados em todas as unidades nas últimas 24 horas.
            </p>
          </div>
          <div className="flex items-center gap-5 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                   <div key={i} className="w-10 h-10 rounded-2xl bg-slate-100 border-2 border-white overflow-hidden shadow-sm">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 555}`} className="w-full h-full" alt="" />
                   </div>
                ))}
             </div>
             <div className="pr-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pico do Dia</span>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" />
                   <span className="text-[16px] font-black text-primary">{peakStr}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="h-[300px] flex items-end justify-between gap-4 px-2 relative">
          {bars.map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              <div className="w-full relative h-[240px] flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${height}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                  className={`w-full max-w-[54px] mx-auto rounded-full shadow-lg group-hover:scale-y-105 transition-all duration-700 cursor-pointer ${
                    height > 85 ? 'bg-primary shadow-primary/20' : 'bg-[#E1E8EC]'
                  } ${height > 95 && 'bg-accent shadow-accent/20'}`}
                />
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[11px] font-black py-2.5 px-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-all translate-y-3 group-hover:translate-y-0 shadow-2xl pointer-events-none whitespace-nowrap z-30">
                   {Math.round(height * 2.8)} acessos
                </div>
              </div>
              <span className="mt-8 text-[11px] font-black text-slate-400 group-hover:text-primary transition-colors">
                 {6 + (i * 1.5) < 10 ? '0' : ''}{Math.floor(6 + (i * 1.5))}h
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Heatmap Operacional (Saturação de Lotação) ── */}
      <section className="mb-24">
         <div className="flex items-center justify-between mb-12 border-l-[6px] border-l-accent pl-6">
            <div>
               <h2 className="text-[2.2rem] font-black text-[#1E293B] tracking-tight">Mapa de Calor Operacional</h2>
               <p className="text-[14px] text-slate-400 font-bold uppercase tracking-widest mt-1">Check-ins por Horário · Hoje (EVO)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-[#F1F5F9]" /><span className="text-[11px] font-black text-slate-400">Vazia</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-[#B1D135]/40" /><span className="text-[11px] font-black text-slate-400">Moderada</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-[#B1D135]" /><span className="text-[11px] font-black text-slate-400">Pico</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-md bg-[#0F3C23]" /><span className="text-[11px] font-black text-slate-400">Superlotação</span></div>
            </div>
         </div>

         <div className="bg-white rounded-[3rem] border border-slate-100 p-10 overflow-x-auto shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[150px_repeat(12,1fr)] gap-2 mb-4">
                <div />
                {Array.from({length: 12}).map((_, i) => (
                  <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase">
                    {6 + (i * 1.5) < 10 ? '0' : ''}{Math.floor(6 + (i * 1.5))}H
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                {Object.keys(UNITS).map((unitName, idx) => (
                  <div key={unitName} className="grid grid-cols-[150px_repeat(12,1fr)] gap-2 items-center group">
                    <span className="text-[12px] font-black text-[#0F172A] truncate pr-4 group-hover:text-primary transition-colors">{unitName}</span>
                    {Array.from({length: 12}).map((_, i) => {
                       const intensity = data?.heatmapData?.[unitName]?.[i] ?? 0;

                       let bgColor = 'bg-[#F1F5F9]';
                       if (intensity > 20) bgColor = 'bg-[#B1D135]/40';
                       if (intensity > 55) bgColor = 'bg-[#B1D135]';
                       if (intensity > 85) bgColor = 'bg-[#0F3C23]';

                       return (
                         <div key={i} className="relative group/cell">
                           <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              whileInView={{ opacity: 1, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.3, delay: (idx * 0.05) + (i * 0.02) }}
                              className={`h-12 w-full rounded-2xl ${bgColor} transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-crosshair`}
                           />
                           <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[11px] font-black py-2 px-3 rounded-xl opacity-0 group-hover/cell:opacity-100 transition-all shadow-xl pointer-events-none z-50">
                              {Math.round(intensity)}%
                           </div>
                         </div>
                       );
                    })}
                  </div>
                ))}
              </div>
            </div>
         </div>
      </section>

      {/* ── Geographic Overview ── */}
      <section className="mb-12">
         <div className="flex items-center gap-5 mb-12 border-l-[6px] border-l-primary pl-6">
            <div>
               <h2 className="text-[2.2rem] font-black text-primary tracking-tight">Mapa de Unidades</h2>
               <p className="text-[14px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saturação Geográfica em SP</p>
            </div>
         </div>

         <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full h-[550px] bg-white rounded-[5rem] border border-slate-100 relative overflow-hidden group shadow-[0_20px_60px_rgba(0,0,0,0.03)] flex items-center justify-center p-12"
         >
            {/* Background Map Simulation */}
            <div className="absolute inset-0 opacity-5 pointer-events-none transition-transform duration-[15s] group-hover:scale-110">
               <svg width="100%" height="100%" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {Array.from({ length: 15 }).map((_, i) => (
                     <path key={i} d={`M${i*80} 0 V1000 M0 ${i*80} H1000`} stroke="#0F3C23" strokeWidth="1" />
                  ))}
                  <path d="M100 200 Q400 100 500 400 T900 800" stroke="#B1D135" strokeWidth="4" />
               </svg>
            </div>

            <div className="relative text-center z-10 max-w-lg">
               <div className="w-24 h-24 bg-primary rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-primary/30 group-hover:rotate-6 transition-transform duration-700">
                  <MapIcon size={36} className="text-accent" />
               </div>
               <h3 className="text-[2.4rem] font-black text-primary mb-4 tracking-tight leading-tight">Expansão em Grande São Paulo</h3>
               <p className="text-slate-400 text-[16px] font-semibold leading-relaxed mb-10">
                  7 unidades ativas e integradas. Todas utilizando a infraestrutura Goodbe para máxima performance e retenção.
               </p>
               <div className="flex flex-wrap justify-center gap-3">
                  {Object.keys(UNITS).map(u => (
                     <span key={u} className="px-5 py-2.5 bg-slate-50 rounded-full text-[11px] font-black text-slate-500 border border-slate-100 shadow-sm hover:bg-primary hover:text-white transition-colors cursor-default">{u}</span>
                  ))}
               </div>
            </div>

            {/* Pulse Markers */}
            <div className="absolute top-1/4 left-[15%] w-5 h-5 bg-accent rounded-full animate-pulse shadow-[0_0_30px_#B1D135]" />
            <div className="absolute top-[60%] right-[20%] w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_20px_#0F3C23]" />
            <div className="absolute bottom-[30%] left-[40%] w-3 h-3 bg-accent rounded-full animate-pulse shadow-[0_0_15px_#B1D135]" />
         </motion.div>
      </section>

      <UnitDetailsModal
        unit={selectedUnit}
        isOpen={!!selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onNavigateToMembers={onNavigateToMembers}
        onViewReport={() => onNavigate('financeiro')}
      />
    </div>
  );
}

const FALLBACK_BARS = [40, 55, 65, 80, 75, 95, 100, 85, 70, 50, 40, 20];
