import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { UNITS } from '../services/evoApi';
import { fetchKpis, saveKpi } from '../services/nocodbApi';
import type { DashboardData } from '../App';

interface Props {
  data: DashboardData | null;
  isLoading: boolean;
}

interface UnitMeta {
  unitName: string;
  metaAtivos: number;
  metaChurn: number;
  metaInadimplentes: number;
}

function getCurrentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getIndicator(real: number, meta: number, lowerIsBetter = false) {
  if (meta === 0) return 'neutral';
  const ratio = real / meta;
  if (lowerIsBetter) {
    if (ratio <= 0.8) return 'great';
    if (ratio <= 1.0) return 'ok';
    return 'bad';
  }
  if (ratio >= 1.0) return 'great';
  if (ratio >= 0.85) return 'ok';
  return 'bad';
}

const INDICATOR_CONFIG = {
  great:   { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: TrendingUp,   label: 'Acima da meta' },
  ok:      { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   icon: Minus,        label: 'Próximo da meta' },
  bad:     { color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200',    icon: TrendingDown, label: 'Abaixo da meta' },
  neutral: { color: 'text-slate-400',   bg: 'bg-slate-50',   border: 'border-slate-200',   icon: Minus,        label: 'Meta não definida' },
};

export function MetasScreen({ data, isLoading }: Props) {
  const period = getCurrentPeriod();
  const unitNames = Object.keys(UNITS);

  const [metas, setMetas] = useState<Record<string, UnitMeta>>(() => {
    const init: Record<string, UnitMeta> = {};
    for (const name of unitNames) {
      init[name] = { unitName: name, metaAtivos: 0, metaChurn: 5, metaInadimplentes: 0 };
    }
    return init;
  });

  const [isSaving, setIsSaving]       = useState(false);
  const [isLoadingMetas, setIsLoadingMetas] = useState(true);
  const [savedAt, setSavedAt]         = useState<string | null>(null);

  // Load saved metas from NocoDB
  useEffect(() => {
    setIsLoadingMetas(true);
    fetchKpis()
      .then(kpis => {
        const periodKpis = kpis.filter(k => k.periodo === period);
        const updated = { ...metas };
        for (const kpi of periodKpis) {
          const u = kpi.unidade;
          if (!updated[u]) continue;
          if (kpi.categoria === 'meta_ativos')        updated[u].metaAtivos = kpi.meta;
          if (kpi.categoria === 'meta_churn')         updated[u].metaChurn = kpi.meta;
          if (kpi.categoria === 'meta_inadimplentes') updated[u].metaInadimplentes = kpi.meta;
        }
        setMetas(updated);
      })
      .catch(() => {})
      .finally(() => setIsLoadingMetas(false));
  }, [period]);

  const handleChange = (unitName: string, field: keyof Omit<UnitMeta, 'unitName'>, value: number) => {
    setMetas(prev => ({ ...prev, [unitName]: { ...prev[unitName], [field]: value } }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const tasks: Promise<void>[] = [];
      for (const [unitName, meta] of Object.entries(metas)) {
        if (meta.metaAtivos > 0) {
          tasks.push(saveKpi({ nome: 'Meta Ativos', valor: 0, meta: meta.metaAtivos, unidade: unitName, categoria: 'meta_ativos', periodo: period }));
        }
        tasks.push(saveKpi({ nome: 'Meta Churn %', valor: 0, meta: meta.metaChurn, unidade: unitName, categoria: 'meta_churn', periodo: period }));
        if (meta.metaInadimplentes > 0) {
          tasks.push(saveKpi({ nome: 'Meta Inadimplentes', valor: 0, meta: meta.metaInadimplentes, unidade: unitName, categoria: 'meta_inadimplentes', periodo: period }));
        }
      }
      await Promise.allSettled(tasks);
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('[Metas] save error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Real values from EVO data
  const getRealValues = (unitName: string) => {
    const unit = data?.units?.find(u => u.name === unitName);
    if (!unit) return { realAtivos: 0, realChurn: 0, realInadimplentes: 0 };
    const total = unit.activeMembers + unit.inactiveMembers;
    const churnPct = total > 0 ? Math.round((unit.inactiveMembers / total) * 100) : 0;
    return {
      realAtivos:         unit.activeMembers,
      realChurn:          churnPct,
      realInadimplentes:  unit.inactiveMembers,
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* Header */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-10">
        <span className="text-[11px] uppercase font-black text-primary tracking-[0.2em] mb-3 block">
          Planejamento Mensal
        </span>
        <h1 className="text-[3.5rem] font-black text-primary leading-none tracking-tighter mb-4">
          Metas por <span className="text-accent">Unidade</span>
        </h1>
        <p className="text-slate-400 text-[16px] font-semibold max-w-xl">
          Ativos e inadimplentes do mês por unidade, com metas individuais editáveis. Período: <strong className="text-primary">{period}</strong>
        </p>
      </motion.div>

      {/* Cards resumo por unidade — Ativos e Inadimplentes do Mês */}
      {data && (
        <motion.div
          initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10"
        >
          <div className="flex items-center gap-4 mb-5 border-l-[5px] border-l-accent pl-4">
            <div>
              <h2 className="text-[1.2rem] font-black text-primary tracking-tight">Situação Real por Unidade (Mês)</h2>
              <p className="text-[12px] text-slate-400 font-semibold">Ativos e inadimplentes em tempo real via EVO</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {unitNames.map(unitName => {
              const { realAtivos, realInadimplentes, realChurn } = getRealValues(unitName);
              const meta = metas[unitName];
              const atingiuAtivos = meta.metaAtivos > 0 && realAtivos >= meta.metaAtivos;
              const abaixoInadim  = meta.metaInadimplentes > 0 && realInadimplentes <= meta.metaInadimplentes;
              return (
                <div key={unitName} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 truncate">{unitName}</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Ativos</p>
                      <p className={`text-[1.6rem] font-black tracking-tighter leading-none ${atingiuAtivos ? 'text-emerald-600' : 'text-primary'}`}>
                        {realAtivos.toLocaleString('pt-BR')}
                      </p>
                      {meta.metaAtivos > 0 && (
                        <p className="text-[10px] font-bold text-slate-400 mt-1">meta {meta.metaAtivos.toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Inadimpl.</p>
                      <p className={`text-[1.6rem] font-black tracking-tighter leading-none ${abaixoInadim ? 'text-emerald-600' : realInadimplentes > 0 ? 'text-amber-500' : 'text-primary'}`}>
                        {realInadimplentes.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">{realChurn}% evasão</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Metas table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] mb-8"
      >
        {/* Table header */}
        <div className="bg-[#F9FBF9] px-8 py-5 grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-4 border-b border-slate-100">
          {['Unidade', 'Ativos (Real)', 'Meta Ativos', 'Churn % (Real)', 'Meta Churn %', 'Inadim. (Real)', 'Meta Inadim.'].map(h => (
            <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {isLoadingMetas ? (
          <div className="divide-y divide-slate-50">
            {unitNames.map(n => (
              <div key={n} className="px-8 py-5 grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-4 animate-pulse">
                <div className="h-5 bg-slate-100 rounded-lg" />
                {[...Array(6)].map((_, i) => <div key={i} className="h-5 bg-slate-50 rounded-lg" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {unitNames.map((unitName, idx) => {
              const meta = metas[unitName];
              const { realAtivos, realChurn, realInadimplentes } = getRealValues(unitName);
              const indAtivos  = getIndicator(realAtivos, meta.metaAtivos);
              const indChurn   = getIndicator(realChurn, meta.metaChurn, true);
              const indInadim  = getIndicator(realInadimplentes, meta.metaInadimplentes, true);

              const IndicatorBadge = ({ ind, value }: { ind: string; value: number }) => {
                const cfg = INDICATOR_CONFIG[ind as keyof typeof INDICATOR_CONFIG];
                const Icon = cfg.icon;
                return (
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                    <Icon size={11} />
                    {value.toLocaleString('pt-BR')}
                  </div>
                );
              };

              return (
                <motion.div
                  key={unitName}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  className="px-8 py-5 grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr_1.2fr] gap-4 items-center hover:bg-[#FAFCFA] transition-colors group"
                >
                  {/* Unit name */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-[#E8F5EC] flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                      <span className="text-[11px] font-black text-primary">{unitName.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="font-black text-[#0F172A] text-[14px]">{unitName}</span>
                  </div>

                  {/* Real Ativos */}
                  <IndicatorBadge ind={indAtivos} value={realAtivos} />

                  {/* Meta Ativos */}
                  <input
                    type="number" value={meta.metaAtivos || ''}
                    placeholder="0"
                    onChange={e => handleChange(unitName, 'metaAtivos', Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-black text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 text-center"
                  />

                  {/* Real Churn */}
                  <IndicatorBadge ind={indChurn} value={realChurn} />

                  {/* Meta Churn */}
                  <div className="flex items-center gap-1">
                    <input
                      type="number" value={meta.metaChurn} step="0.5" min="0" max="100"
                      onChange={e => handleChange(unitName, 'metaChurn', Math.max(0, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-black text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 text-center"
                    />
                    <span className="text-[11px] font-black text-slate-400">%</span>
                  </div>

                  {/* Real Inadimplentes */}
                  <IndicatorBadge ind={indInadim} value={realInadimplentes} />

                  {/* Meta Inadimplentes */}
                  <input
                    type="number" value={meta.metaInadimplentes || ''}
                    placeholder="0"
                    onChange={e => handleChange(unitName, 'metaInadimplentes', Math.max(0, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-black text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 text-center"
                  />
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 px-8 py-5 bg-[#F9FBF9] flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-[12px] font-black text-slate-400">
            {Object.entries(INDICATOR_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <Icon size={13} className={cfg.color} />
                  <span>{cfg.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            {savedAt && (
              <span className="text-[11px] font-bold text-emerald-600">Salvo às {savedAt}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving
                ? <><RefreshCw size={14} className="animate-spin" /> Salvando…</>
                : <><Save size={14} /> Salvar Metas</>
              }
            </button>
          </div>
        </div>
      </motion.div>

      {/* Resumo geral */}
      {data && !isLoading && (
        <motion.div
          initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              label: 'Total Ativos vs Meta',
              real:  data.totalActiveMembers,
              meta:  Object.values(metas).reduce((s, m) => s + m.metaAtivos, 0),
              unit:  'membros',
              lower: false,
            },
            {
              label: 'Evasão Geral vs Meta',
              real:  100 - (data.retentionRate ?? 0),
              meta:  Math.round(Object.values(metas).reduce((s, m) => s + m.metaChurn, 0) / unitNames.length),
              unit:  '%',
              lower: true,
            },
            {
              label: 'Inadimplentes vs Meta',
              real:  data.totalInactiveMembers,
              meta:  Object.values(metas).reduce((s, m) => s + m.metaInadimplentes, 0),
              unit:  'membros',
              lower: true,
            },
          ].map(({ label, real, meta, unit, lower }) => {
            const ind = getIndicator(real, meta, lower);
            const cfg = INDICATOR_CONFIG[ind as keyof typeof INDICATOR_CONFIG];
            const pct = meta > 0 ? Math.round((real / meta) * 100) : 0;
            return (
              <div key={label} className={`p-7 rounded-[2.5rem] border ${cfg.border} ${cfg.bg}`}>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${cfg.color}`}>{label}</p>
                <div className="flex items-end gap-3 mb-4">
                  <span className={`text-[2.2rem] font-black tracking-tighter ${cfg.color}`}>
                    {real.toLocaleString('pt-BR')}{unit === '%' ? '%' : ''}
                  </span>
                  <span className="text-[14px] font-bold text-slate-400 mb-1">/ meta {meta.toLocaleString('pt-BR')}{unit === '%' ? '%' : ''}</span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${lower ? (pct <= 100 ? 'bg-emerald-500' : 'bg-rose-400') : (pct >= 100 ? 'bg-emerald-500' : 'bg-amber-400')}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className={`mt-2 text-[11px] font-bold ${cfg.color}`}>{pct}% {lower ? 'do limite' : 'da meta atingida'}</p>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
