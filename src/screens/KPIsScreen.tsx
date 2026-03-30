import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Target, DollarSign,
  Clock, MessageSquare, Award,
  BarChart2, UserCheck, UserX, AlertTriangle,
  Percent, Eye, Star, Briefcase
} from 'lucide-react';
import type { DashboardData } from '../App';
import { formatNumber, getCachedAvgTicket } from '../services/evoApi';

interface Props {
  data: DashboardData | null;
  isLoading: boolean;
}

// ── Editable KPI Input ────────────────────────────────────────────────────────
function KPIInput({ label, value, onChange, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
      <div className="flex items-center bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
        {prefix && <span className="text-[13px] font-black text-primary mr-1">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          className="w-20 text-center bg-transparent text-[14px] font-black text-primary focus:outline-none"
        />
        {suffix && <span className="text-[11px] font-bold text-slate-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color = 'primary', sub, large }: {
  label: string; value: string; icon: any; color?: string; sub?: string; large?: boolean;
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    primary: { bg: 'bg-primary/5', text: 'text-primary', icon: 'text-primary' },
    accent:  { bg: 'bg-accent/10',  text: 'text-accent',  icon: 'text-accent' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-500', icon: 'text-rose-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600', icon: 'text-amber-500' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600', icon: 'text-blue-500' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-600', icon: 'text-purple-500' },
  };
  const c = colors[color] ?? colors.primary;

  return (
    <div className={`${large ? 'p-8' : 'p-6'} bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 group`}>
      <div className={`w-11 h-11 ${c.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={c.icon} strokeWidth={2.5} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{label}</p>
      <p className={`${large ? 'text-[2.4rem]' : 'text-[1.8rem]'} font-black ${c.text} tracking-tighter leading-none`}>{value}</p>
      {sub && <p className="text-[11px] font-bold text-slate-400 mt-2">{sub}</p>}
    </div>
  );
}

// ── Funnel Stage ──────────────────────────────────────────────────────────────
function FunnelStage({ stage, title, metrics, color, width }: {
  stage: number; title: string; metrics: { label: string; value: string }[]; color: string; width: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: stage * 0.08 }}
      className="flex gap-6 items-center"
    >
      <div className="flex items-center gap-4 flex-1">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-[14px] shrink-0`} style={{ backgroundColor: color }}>
          {stage}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-[#0F172A] mb-1 truncate">{title}</p>
          <div className="flex gap-4 flex-wrap">
            {metrics.map(m => (
              <span key={m.label} className="text-[10px] font-bold text-slate-400">
                <span className="font-black text-slate-600">{m.value}</span> {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner" style={{ width }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: '100%' }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: stage * 0.1 }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, borderColor = 'border-l-primary' }: { title: string; subtitle: string; borderColor?: string }) {
  return (
    <div className={`border-l-[6px] ${borderColor} pl-6 mb-10`}>
      <h2 className="text-[2rem] font-black text-primary tracking-tight">{title}</h2>
      <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function KPIsScreen({ data, isLoading }: Props) {
  // ── Editable Business Inputs ──
  const storedMetaSpend = Number(localStorage.getItem('gb_meta_total_spend') || 0);
  const [mktInvestment, setMktInvestment]       = useState(storedMetaSpend > 0 ? storedMetaSpend : 45000);
  const [salesInvestment, setSalesInvestment]    = useState(32000);
  const [leadsPerDay, setLeadsPerDay]            = useState(28);
  const [closedSales, setClosedSales]            = useState(85);
  const [experimentalClasses, setExpClasses]     = useState(120);
  const [noShowRate, setNoShowRate]              = useState(22);
  const [avgTicket, setAvgTicket]                = useState(getCachedAvgTicket);
  const [nps, setNps]                            = useState(78);
  const [turnover, setTurnover]                  = useState(8);
  const [inadimplencia, setInadimplencia]        = useState(4.2);
  const [salesCycleDays, setSalesCycleDays]      = useState(12);
  const [initialChurn, setInitialChurn]          = useState(5);

  const activeMembers   = data?.totalActiveMembers   ?? 0;
  const inactiveMembers = data?.totalInactiveMembers ?? 0;
  const totalMembers    = activeMembers + inactiveMembers;

  // ── Calculated KPIs ──
  const cac = closedSales > 0 ? (mktInvestment + salesInvestment) / closedSales : 0;

  // LTV: use turnover % as monthly churn proxy (editable by user)
  // turnover is set by the user in the UI — it's the closest real-world input available
  const monthlyChurnRate = turnover > 0 ? turnover / 100 : 0.05;
  const avgLifetimeMonths = Math.round(1 / monthlyChurnRate);
  const ltv = avgLifetimeMonths * avgTicket;
  const ltvCacRatio = cac > 0 ? (ltv / cac) : 0;

  const retentionRate = data?.retentionRate ?? 0;
  const evasionRate   = totalMembers > 0 ? Math.round((inactiveMembers / totalMembers) * 100) : 0;
  const conversionRate   = experimentalClasses > 0 ? Math.round((closedSales / experimentalClasses) * 100) : 0;
  const revenueGenerated = closedSales * avgTicket;

  // Funnel mock calculations
  const qualifiedLeads   = Math.round(leadsPerDay * 30 * 0.62);
  const scheduledClasses = Math.round(qualifiedLeads * 0.58);
  const attendedClasses  = Math.round(scheduledClasses * (1 - noShowRate / 100));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* ── Header ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-14"
      >
        <span className="text-[11px] uppercase font-black text-primary tracking-[0.4em] mb-4 block">
          Inteligência Comercial & Operacional
        </span>
        <h1 className="text-[3.6rem] font-black text-primary leading-[0.9] tracking-tighter mb-4">
          KPIs <span className="text-accent">Goodbe</span>
        </h1>
        <p className="text-slate-400 text-[17px] font-semibold max-w-2xl">
          Indicadores-chave de desempenho — Edite os valores de investimento e vendas para simular cenários em tempo real.
        </p>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: KPIs PRINCIPAIS DA COMPANHIA                              */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      <section className="mb-20">
        <SectionHeader title="Indicadores Principais" subtitle="CAC · LTV · Relação LTV/CAC" />

        {/* Editable inputs */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-8 bg-[#F0F7EC] border border-accent/20 rounded-[2.5rem] flex flex-wrap gap-6 items-center shadow-sm"
        >
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
            <DollarSign size={22} className="text-primary" strokeWidth={3} />
          </div>
          <div className="flex flex-col gap-1">
            <KPIInput label="Investimento MKT" value={mktInvestment} onChange={setMktInvestment} prefix="R$" />
            {storedMetaSpend > 0 && (
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                Sincronizado via Meta Ads (R$ {storedMetaSpend.toLocaleString('pt-BR')})
              </span>
            )}
          </div>
          <KPIInput label="Investimento Vendas" value={salesInvestment} onChange={setSalesInvestment} prefix="R$" />
          <KPIInput label="Vendas no Período" value={closedSales} onChange={setClosedSales} />
          <KPIInput label="Ticket Médio" value={avgTicket} onChange={setAvgTicket} prefix="R$" />
        </motion.div>

        {/* Main KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            label="CAC — Custo de Aquisição"
            value={`R$ ${cac.toFixed(0)}`}
            icon={Target}
            color="rose"
            sub={`(R$ ${formatNumber(mktInvestment)} + R$ ${formatNumber(salesInvestment)}) ÷ ${closedSales} vendas`}
            large
          />
          <KPICard
            label="LTV — Tempo de Vida"
            value={`R$ ${formatNumber(ltv)}`}
            icon={TrendingUp}
            color="accent"
            sub={`${avgLifetimeMonths} meses × R$ ${avgTicket} ticket médio`}
            large
          />
          <KPICard
            label="Relação LTV / CAC"
            value={`${ltvCacRatio.toFixed(1)}x`}
            icon={Award}
            color={ltvCacRatio >= 3 ? 'accent' : ltvCacRatio >= 1.5 ? 'amber' : 'rose'}
            sub={ltvCacRatio >= 3 ? 'Excelente — margem saudável' : ltvCacRatio >= 1.5 ? 'Atenção — margem apertada' : 'Crítico — CAC maior que LTV'}
            large
          />
        </div>

        {/* Formula explanation */}
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-[12px] font-mono text-slate-500">
          <p><strong className="text-primary">CAC</strong> = (Investimento MKT + Investimento Vendas) ÷ Nº Clientes Adquiridos</p>
          <p className="mt-1"><strong className="text-primary">LTV</strong> = Tempo Médio de Vida (meses) × Ticket Médio Mensal</p>
          <p className="mt-1"><strong className="text-primary">LTV/CAC</strong> = Ideal ≥ 3x para saúde financeira sustentável</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: ANÁLISE COMERCIAL — FUNIL DE 7 ETAPAS                     */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      <section className="mb-20">
        <SectionHeader title="Funil Comercial" subtitle="7 Etapas de Vendas Goodbe" borderColor="border-l-accent" />

        <div className="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] mb-10">
          {/* Editable Funnel Inputs */}
          <div className="flex flex-wrap gap-6 items-center mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <KPIInput label="Leads/Dia" value={leadsPerDay} onChange={setLeadsPerDay} />
            <KPIInput label="Aulas Experimentais" value={experimentalClasses} onChange={setExpClasses} />
            <KPIInput label="% No-Show" value={noShowRate} onChange={setNoShowRate} suffix="%" />
          </div>

          <div className="space-y-8">
          <FunnelStage
            stage={1}
            title="Atração"
            metrics={[
              { label: 'Leads/dia', value: String(leadsPerDay) },
              { label: 'CAC', value: `R$ ${cac.toFixed(0)}` },
              { label: 'Total mês', value: formatNumber(leadsPerDay * 30) },
            ]}
            color="#0F3C23"
            width="100%"
          />
          <FunnelStage
            stage={2}
            title="Conexão Rápida"
            metrics={[
              { label: 'TMPC', value: '< 5 min' },
              { label: 'TCE (Taxa Contato Efetivo)', value: '72%' },
            ]}
            color="#1A5C36"
            width="85%"
          />
          <FunnelStage
            stage={3}
            title="Diagnóstico de Dor"
            metrics={[
              { label: 'Leads Qualificados', value: `${formatNumber(qualifiedLeads)}` },
              { label: '% Qualificação', value: '62%' },
            ]}
            color="#268549"
            width="68%"
          />
          <FunnelStage
            stage={4}
            title="Proposta de Valor"
            metrics={[
              { label: 'TCA (Agendamento)', value: '58%' },
              { label: 'Agendados', value: formatNumber(scheduledClasses) },
            ]}
            color="#4CAF50"
            width="52%"
          />
          <FunnelStage
            stage={5}
            title="Compromisso com a Experiência"
            metrics={[
              { label: 'No-show', value: `${noShowRate}%` },
              { label: 'Realizadas', value: formatNumber(attendedClasses) },
            ]}
            color="#66BB6A"
            width="40%"
          />
          <FunnelStage
            stage={6}
            title="Experiência que Converte"
            metrics={[
              { label: 'Conversão Experimental', value: `${conversionRate}%` },
              { label: 'Ticket Médio', value: `R$ ${avgTicket}` },
            ]}
            color="#81C784"
            width="30%"
          />
          <FunnelStage
            stage={7}
            title="Fechamento e Início de Jornada"
            metrics={[
              { label: 'Vendas Fechadas', value: String(closedSales) },
              { label: 'Receita', value: `R$ ${formatNumber(revenueGenerated)}` },
            ]}
            color="#B1D135"
            width="22%"
          />
          </div>
        </div>

        {/* Funnel secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Clock size={20} className="text-blue-500" strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Ciclo de Vendas (CV)</p>
            <div className="flex items-baseline gap-1">
              <input type="number" value={salesCycleDays} onChange={e => setSalesCycleDays(Math.max(1, Number(e.target.value)))}
                className="w-14 text-[1.8rem] font-black text-blue-600 tracking-tighter bg-transparent focus:outline-none" />
              <span className="text-[13px] font-bold text-slate-400">dias</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-2">Lead → Compra</p>
          </div>
          <KPICard label="Leads/Dia" value={String(leadsPerDay)} icon={MessageSquare} color="accent" sub="Média mensal" />
          <KPICard label="Taxa No-Show" value={`${noShowRate}%`} icon={UserX} color="rose" sub="Experimentais" />
          <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-amber-500" strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Canc. Iniciais</p>
            <div className="flex items-baseline gap-1">
              <input type="number" value={initialChurn} onChange={e => setInitialChurn(Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-14 text-[1.8rem] font-black text-amber-600 tracking-tighter bg-transparent focus:outline-none" />
              <span className="text-[13px] font-bold text-slate-400">%</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 mt-2">Primeiros 60 dias</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: DADOS OPERACIONAIS — METAS                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      <section className="mb-20">
        <SectionHeader title="Análise Operacional" subtitle="Metas por Nível Hierárquico" borderColor="border-l-[#0F3C23]" />

        {/* Meta Recepção */}
        <div className="mb-10">
          <h3 className="text-[1.2rem] font-black text-[#0F172A] mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <UserCheck size={16} className="text-accent" />
            </div>
            Meta Recepção
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard label="% Conversão Experimentais" value={`${conversionRate}%`} icon={Percent} color="accent" sub="Vendas válidas ÷ Aulas realizadas" />
            <KPICard label="% Evasão (Inativos)" value={`${evasionRate}%`} icon={UserX} color="amber" sub={`${formatNumber(inactiveMembers)} inativos · dado real EVO`} />
            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="w-11 h-11 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <DollarSign size={20} className="text-rose-400" strokeWidth={2.5} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">% Inadimplência</p>
              <div className="flex items-baseline gap-1">
                <input type="number" step="0.1" value={inadimplencia} onChange={e => setInadimplencia(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-16 text-[1.8rem] font-black text-rose-500 tracking-tighter bg-transparent focus:outline-none" />
                <span className="text-[13px] font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-2">Débitos em aberto no mês</p>
            </div>
          </div>
        </div>

        {/* Meta Gerentes */}
        <div className="mb-10">
          <h3 className="text-[1.2rem] font-black text-[#0F172A] mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase size={16} className="text-primary" />
            </div>
            Meta Gerentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard label="Performance" value={`${retentionRate}%`} icon={BarChart2} color="primary" sub="Entrega da meta (3 indicadores)" />
            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <Star size={20} className="text-blue-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">NPS Unidade</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={nps}
                  onChange={e => setNps(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-20 text-[1.8rem] font-black text-blue-600 tracking-tighter bg-transparent focus:outline-none"
                />
                <span className="text-[14px] font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-2">Meta vigência mensal</p>
            </div>
            <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 bg-purple-50 rounded-2xl flex items-center justify-center">
                  <Users size={20} className="text-purple-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">% Turnover</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={turnover}
                  onChange={e => setTurnover(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-20 text-[1.8rem] font-black text-purple-600 tracking-tighter bg-transparent focus:outline-none"
                />
                <span className="text-[14px] font-bold text-slate-400">%</span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-2">Cancelamentos de colaboradores</p>
            </div>
          </div>
        </div>

        {/* Meta Regional */}
        <div>
          <h3 className="text-[1.2rem] font-black text-[#0F172A] mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Eye size={16} className="text-rose-500" />
            </div>
            Meta Regional
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard label="LTV Regional" value={`R$ ${formatNumber(ltv)}`} icon={TrendingUp} color="accent" sub={`${avgLifetimeMonths} meses de vida média`} />
            <KPICard label="NPS Geral" value={`${nps}%`} icon={Star} color="blue" sub="Entrega mensal consolidada" />
            <KPICard label="Receita Regional" value={`R$ ${(activeMembers * avgTicket / 1000).toFixed(0)}k`} icon={DollarSign} color="primary" sub={`${formatNumber(activeMembers)} alunos × R$ ${avgTicket}`} />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: RESUMO ESTRATÉGICO                                        */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        className="p-10 bg-gradient-to-br from-primary to-[#1A5C36] rounded-[4rem] text-white relative overflow-hidden mb-12"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/3 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full -ml-24 -mb-24 blur-3xl" />

        <div className="relative z-10">
          <h3 className="text-[2rem] font-black mb-8 tracking-tight">Resumo Estratégico</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Base Total</p>
              <p className="text-[2rem] font-black">{isLoading ? '—' : formatNumber(totalMembers)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Alunos Ativos</p>
              <p className="text-[2rem] font-black text-accent">{isLoading ? '—' : formatNumber(activeMembers)}</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">MRR Projetado</p>
              <p className="text-[2rem] font-black">R$ {(activeMembers * avgTicket / 1000).toFixed(0)}k</p>
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Retenção</p>
              <p className="text-[2rem] font-black">{retentionRate}%</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Disclaimer */}
      <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-4 text-[13px]">
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-black text-amber-800 mb-1">Sobre os dados exibidos</p>
          <p className="text-amber-700 font-medium leading-relaxed">
            Os KPIs de <strong>membros ativos, inativos e retenção</strong> são dados reais da API W12 EVO.
            O <strong>ticket médio</strong> é calculado automaticamente dos planos EVO (quando disponíveis).
            Os demais indicadores (CAC, inadimplência, leads/dia, no-show, NPS, turnover, ciclo de vendas) são
            <strong> campos editáveis</strong> — ajuste para refletir seus dados operacionais reais.
            Para automação completa, integre com CRM (RD Station), gateway financeiro e plataformas de ads.
          </p>
        </div>
      </div>
    </div>
  );
}
