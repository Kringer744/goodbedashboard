import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Zap, BarChart2, RefreshCw, ChevronDown } from 'lucide-react';
import {
  formatNumber,
  fetchAvgTicket,
  fetchReceivables,
  type BranchStats,
  type TicketData,
  type BranchMemberships,
  type ReceivablesData,
} from '../services/evoApi';
import type { DashboardData } from '../App';
import { StatsCard } from '../components/StatsCard';
import { DollarSign } from 'lucide-react';

interface Props {
  data: DashboardData | null;
  isLoading: boolean;
}

function clearMembershipCache() {
  localStorage.removeItem('gb_ticket_data');
  localStorage.removeItem('gb_memberships_per_branch');
}

export function FinanceiroScreen({ data, isLoading }: Props) {
  const [ticketData, setTicketData]             = useState<TicketData | null>(null);
  const [ticketLoading, setTicketLoading]       = useState(true);
  const [ticket, setTicket]                     = useState(180);
  const [ticketOverridden, setTicketOverridden] = useState(false);
  const [expandedUnit, setExpandedUnit]         = useState<string | null>(null);
  const [receivables, setReceivables]           = useState<ReceivablesData | null>(null);
  const [receivablesLoading, setReceivablesLoading] = useState(true);
  const [receivablesError, setReceivablesError] = useState<string | null>(null);

  const loadTickets = (forceRefresh = false) => {
    if (forceRefresh) clearMembershipCache();
    setTicketLoading(true);
    fetchAvgTicket()
      .then(td => {
        setTicketData(td);
        if (!ticketOverridden) setTicket(td.avgTicket || 180);
      })
      .catch(err => console.error('[Financeiro] fetchAvgTicket error:', err))
      .finally(() => setTicketLoading(false));
  };

  useEffect(() => { loadTickets(); }, []);

  const loadReceivables = () => {
    setReceivablesLoading(true);
    setReceivablesError(null);
    fetchReceivables()
      .then(data => setReceivables(data))
      .catch(err => {
        console.error('[Financeiro] fetchReceivables error:', err);
        setReceivablesError(err.message);
      })
      .finally(() => setReceivablesLoading(false));
  };

  useEffect(() => { loadReceivables(); }, []);

  const activeMembers   = data?.totalActiveMembers   ?? 0;
  const inactiveMembers = data?.totalInactiveMembers ?? 0;
  const total           = activeMembers + inactiveMembers;
  const retentionRate   = data?.retentionRate ?? 0;
  const projectedMRR    = activeMembers * ticket;
  const riskRevenue     = inactiveMembers * ticket;

  const units: BranchStats[] = data?.units ?? [];
  const maxActive = Math.max(...units.map(u => u.activeMembers), 1);

  // Branches with ANY plans (show even if price = 0, but sort priced first)
  const totalRawPlans = (ticketData?.perBranch ?? []).reduce((s, b) => s + b.plans.length, 0);
  const branchesWithPlans: BranchMemberships[] =
    (ticketData?.perBranch ?? []).filter(b => b.plans.length > 0);

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
          Visão Financeira
        </span>
        <h1 className="text-[3.5rem] font-black text-primary leading-none tracking-tighter mb-4">
          Análise <span className="text-accent">Financeira</span>
        </h1>
        <p className="text-slate-400 text-[16px] font-semibold max-w-xl">
          Receita calculada com base nos planos e membros reais da API W12 EVO.
        </p>
      </motion.div>

      {/* ── Ticket configurator ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-10 p-8 bg-[#F0F7EC] border border-accent/20 rounded-[2.5rem] flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
            {ticketLoading
              ? <RefreshCw size={22} className="text-primary animate-spin" strokeWidth={3} />
              : <span className="text-primary font-black text-[17px]">R$</span>
            }
          </div>
          <div>
            <p className="text-[12px] font-black text-primary uppercase tracking-widest mb-1">
              Ticket Médio Real — EVO
            </p>
            {ticketData && !ticketLoading ? (
              <p className="text-[13px] text-slate-500 font-semibold">
                <span className="text-primary font-black">{ticketData.totalPlans}</span> planos com preço ·
                {' '}Min R$ {ticketData.minTicket.toLocaleString('pt-BR')} ·
                {' '}Max R$ {ticketData.maxTicket.toLocaleString('pt-BR')}
              </p>
            ) : (
              <p className="text-[13px] text-slate-400 font-semibold">Carregando planos da EVO…</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto bg-white p-3 rounded-2xl border border-slate-100 shadow-inner">
          <span className="text-primary font-black text-[18px] ml-2">R$</span>
          <input
            type="number"
            value={ticket}
            onChange={e => { setTicket(Math.max(1, Number(e.target.value))); setTicketOverridden(true); }}
            className="w-28 text-center py-2 px-3 bg-slate-50 border-none rounded-xl text-[18px] font-black text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all font-mono"
          />
          <span className="text-slate-400 text-[12px] font-black uppercase tracking-wider mr-2">/ Membro</span>
        </div>
        {ticketOverridden && ticketData && (
          <button
            onClick={() => { setTicket(ticketData.avgTicket); setTicketOverridden(false); }}
            className="text-[11px] font-black text-accent underline underline-offset-2 whitespace-nowrap"
          >
            Restaurar média EVO
          </button>
        )}
      </motion.div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-16">
        <StatsCard
          title="MRR Projetado"
          value={isLoading ? '—' : `R$ ${projectedMRR.toLocaleString('pt-BR')}`}
          trend={`${formatNumber(activeMembers)} membros ativos`}
          icon={TrendingUp}
          color="accent"
          isLoading={isLoading}
        />
        <StatsCard
          title="Receita em Risco"
          value={isLoading ? '—' : `R$ ${riskRevenue.toLocaleString('pt-BR')}`}
          trend={`${formatNumber(inactiveMembers)} inativos`}
          icon={Zap}
          color="amber"
          isLoading={isLoading}
        />
        <StatsCard
          title="ARR Projetado"
          value={isLoading ? '—' : `R$ ${(projectedMRR * 12).toLocaleString('pt-BR')}`}
          trend="Receita anual estimada"
          icon={TrendingDown}
          color="primary"
          isLoading={isLoading}
        />
        <StatsCard
          title="Base de Membros"
          value={isLoading ? '—' : formatNumber(total)}
          trend={`Retenção: ${retentionRate}%`}
          icon={Users}
          color="primary"
          isLoading={isLoading}
        />
        <StatsCard
          title="Recebimento Mês"
          value={receivablesLoading ? '—' : receivables ? `R$ ${receivables.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
          trend={receivablesLoading ? 'Carregando…' : receivables ? `${receivables.total} lançamentos` : receivablesError ? 'Erro ao carregar' : '—'}
          icon={DollarSign}
          color="accent"
          isLoading={receivablesLoading}
        />
      </div>

      {/* ── Planos por Unidade ── */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <div className="flex items-center justify-between mb-10 border-l-[6px] border-l-accent pl-5">
          <div>
            <h2 className="text-[1.8rem] font-black text-[#1E293B] tracking-tight">
              Planos por Unidade
            </h2>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">
              {ticketLoading
                ? 'Carregando planos da EVO…'
                : ticketData
                  ? `${ticketData.totalPlans} planos únicos · ticket médio R$ ${ticketData.avgTicket.toLocaleString('pt-BR')}`
                  : 'Nenhum plano encontrado'
              }
            </p>
          </div>
          <button
            onClick={() => loadTickets(true)}
            disabled={ticketLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-40 shadow-sm"
          >
            <RefreshCw size={13} className={ticketLoading ? 'animate-spin' : ''} />
            {ticketLoading ? 'Carregando…' : 'Forçar Atualização'}
          </button>
        </div>

        {ticketLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-[2rem] bg-slate-100 animate-pulse" />
            ))}
          </div>
        )}

        {!ticketLoading && branchesWithPlans.length === 0 && (
          <div className="py-16 text-center bg-white rounded-[2.5rem] border border-slate-100">
            <BarChart2 size={36} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Nenhum plano encontrado na EVO</p>
            <p className="text-slate-300 text-[13px] mt-2">
              {totalRawPlans > 0
                ? `${totalRawPlans} planos encontrados, mas sem preço cadastrado`
                : 'Verifique o console para diagnóstico — clique em "Forçar Atualização"'}
            </p>
          </div>
        )}

        {!ticketLoading && branchesWithPlans.length > 0 && (
          <div className="space-y-3">
            {branchesWithPlans.map(branch => {
              const pricedPlans = [...branch.plans]
                .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
              const isOpen = expandedUnit === branch.unitName;
              const branchMax = Math.max(...pricedPlans.map(p => p.value ?? 0), 1);

              return (
                <div
                  key={branch.unitName}
                  className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
                >
                  {/* Branch header — click to expand */}
                  <button
                    className="w-full px-8 py-5 flex items-center justify-between hover:bg-[#FAFCFA] transition-colors group"
                    onClick={() => setExpandedUnit(isOpen ? null : branch.unitName)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#E8F5EC] flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                        <span className="text-[11px] font-black text-primary">
                          {branch.unitName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-black text-[#0F172A] text-[15px]">{branch.unitName}</p>
                        <p className="text-[12px] text-slate-400 font-semibold">
                          {pricedPlans.length} {pricedPlans.length === 1 ? 'plano' : 'planos'} ·
                          {' '}R$ {(pricedPlans[0]?.value ?? 0).toLocaleString('pt-BR')} –
                          {' '}R$ {(pricedPlans[pricedPlans.length - 1]?.value ?? 0).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Plans list — animated expand */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 pb-7 pt-1 border-t border-slate-50 space-y-4">
                          {pricedPlans.map((plan, i) => {
                            const pct = Math.round(((plan.value ?? 0) / branchMax) * 100);
                            return (
                              <div key={plan.idMembership} className="group">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {i < 3 && (
                                      <span className="text-[9px] font-black text-white bg-primary px-1.5 py-0.5 rounded-full shrink-0">
                                        #{i + 1}
                                      </span>
                                    )}
                                    <span className="font-bold text-[13px] text-slate-700 truncate group-hover:text-primary transition-colors">
                                      {plan.nameMembership ?? plan.name ?? `Plano #${plan.idMembership}`}
                                    </span>
                                    {plan.duration && (
                                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                        {plan.duration} {plan.durationType ?? 'meses'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-black text-primary text-[14px] shrink-0 ml-4">
                                    R$ {(plan.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
                                    className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-primary to-accent' : 'bg-slate-300'}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Receita por Unidade ── */}
      {!isLoading && units.length > 0 && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-10 border-l-[6px] border-l-primary pl-5">
            <h2 className="text-[1.8rem] font-black text-[#1E293B] tracking-tight">
              MRR por Unidade
            </h2>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
            <div className="p-10 pb-4">
              <div className="space-y-6">
                {[...units]
                  .filter(u => !u.hasError)
                  .sort((a, b) => b.activeMembers - a.activeMembers)
                  .map(unit => {
                    const mrr = unit.activeMembers * ticket;
                    const pct = Math.round((unit.activeMembers / maxActive) * 100);
                    return (
                      <div key={unit.name} className="group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#0F172A] text-[15px] group-hover:text-primary transition-colors">
                              {unit.name}
                            </span>
                            <span className="text-[12px] font-bold text-slate-400">
                              {unit.activeMembers.toLocaleString('pt-BR')} membros ativos
                            </span>
                          </div>
                          <span className="font-black text-primary text-[15px]">
                            R$ {mrr.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-accent"
                          />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>

            <div className="p-10 pt-8 border-t border-slate-100 mt-8 bg-[#F9FBF9] flex flex-col sm:flex-row items-center justify-between gap-8">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MRR Total</p>
                  <p className="text-[2.2rem] font-black text-primary tracking-tighter leading-none">
                    R$ {projectedMRR.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ARR Projetado</p>
                  <p className="text-[2.2rem] font-black text-accent tracking-tighter leading-none">
                    R$ {(projectedMRR * 12).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm italic text-[12px] text-slate-400 font-medium">
                * Ticket médio baseado nos planos reais da EVO · {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Disclaimer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="p-8 bg-amber-50/50 border border-amber-100 rounded-[2.5rem] flex gap-5 mb-8"
      >
        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
          <BarChart2 size={24} className="text-amber-600" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[14px] font-black text-amber-800 mb-2 uppercase tracking-wide">
            Nota sobre os Dados
          </p>
          <p className="text-[14px] text-amber-700 font-semibold leading-relaxed">
            O ticket médio é calculado automaticamente a partir dos planos cadastrados na EVO.
            O MRR projetado multiplica membros <span className="underline decoration-amber-300">ativos</span> pelo ticket médio.
            Para inadimplência, conciliação bancária e receita efetivamente liquidada, é necessário habilitar
            os endpoints financeiros (<code className="bg-amber-100 px-1 rounded text-[12px]">/api/v1/financials</code>) no painel EVO.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
