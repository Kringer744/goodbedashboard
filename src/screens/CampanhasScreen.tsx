import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, MousePointer2, Eye, 
  DollarSign, RefreshCw, AlertCircle, BarChart3
} from 'lucide-react';
import { fetchAdAccounts, fetchCampaigns, type AdAccount, type MetaCampaign } from '../services/metaApi';

type Platform = 'meta' | 'google';

export function CampanhasScreen() {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('meta');

  useEffect(() => {
    if (activePlatform === 'meta') {
      loadAccounts();
    }
  }, [activePlatform]);

  async function loadAccounts() {
    setIsLoading(true);
    setError(null);
    try {
      const accounts = await fetchAdAccounts();
      setAdAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0].id);
        loadCampaigns(accounts[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contas de anúncios');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCampaigns(accountId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCampaigns(accountId);
      setCampaigns(data);
      
      // Calculate total spend and save to localStorage for KPIs screen
      const totalSpend = data.reduce((sum, c) => sum + (Number(c.insights?.spend) || 0), 0);
      localStorage.setItem('gb_meta_total_spend', totalSpend.toString());
      
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar campanhas');
    } finally {
      setIsLoading(false);
    }
  }

  const totals = campaigns.reduce((acc, c) => {
    const i = c.insights;
    if (i) {
      acc.spend += Number(i.spend) || 0;
      acc.impressions += Number(i.impressions) || 0;
      acc.clicks += Number(i.clicks) || 0;
      acc.reach += Number(i.reach) || 0;
    }
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, reach: 0 });

  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <span className="text-[11px] uppercase font-black text-primary tracking-[0.4em] mb-4 block">
            Marketing & Aquisição
          </span>
          <h1 className="text-[3.6rem] font-black text-primary leading-[0.9] tracking-tighter mb-4">
            Campanhas <span className="text-accent">Meta Ads</span>
          </h1>
          <p className="text-slate-400 text-[17px] font-semibold max-w-2xl">
            Acompanhe o desempenho dos seus anúncios e o ROI das campanhas integradas ao financeiro.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Platform Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActivePlatform('meta')}
              className={`px-6 py-2 rounded-xl text-[12px] font-black transition-all ${
                activePlatform === 'meta' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Meta Ads
            </button>
            <button
              onClick={() => setActivePlatform('google')}
              className={`px-6 py-2 rounded-xl text-[12px] font-black transition-all ${
                activePlatform === 'google' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Google Ads
            </button>
          </div>

          {activePlatform === 'meta' && !error && adAccounts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-1.5 flex items-center gap-2 shadow-sm">
                {adAccounts.length > 1 ? (
                  <select
                    value={selectedAccount}
                    onChange={(e) => {
                      setSelectedAccount(e.target.value);
                      loadCampaigns(e.target.value);
                    }}
                    className="bg-transparent text-[13px] font-black text-primary px-4 py-2 focus:outline-none min-w-[200px]"
                  >
                    {adAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="px-6 py-2">
                    <span className="text-[13px] font-black text-primary uppercase tracking-tight">
                      {adAccounts[0].name}
                    </span>
                  </div>
                )}
                
                <button
                  onClick={() => loadCampaigns(selectedAccount)}
                  disabled={isLoading}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-primary transition-all"
                >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {activePlatform === 'google' ? (
        <div className="p-20 bg-slate-50 border border-slate-100 rounded-[3rem] flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white shadow-xl rounded-[2rem] flex items-center justify-center mb-8">
            <BarChart3 size={32} className="text-slate-300" />
          </div>
          <h3 className="text-[1.8rem] font-black text-primary mb-4 tracking-tight">Google Ads: Em Breve</h3>
          <p className="text-slate-400 font-semibold max-w-sm leading-relaxed text-[15px]">
            Estamos preparando a integração com o Google Ads. Em breve você poderá acompanhar seus gastos e conversões de busca aqui.
          </p>
        </div>
      ) : error ? (
        <div className="p-10 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-[1.4rem] font-black text-primary mb-2">Erro na Integração</h3>
          <p className="text-rose-600 font-bold mb-8 max-w-md">{error}</p>
          <button 
            onClick={loadAccounts}
            className="px-8 py-3 bg-primary text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <SummaryCard 
              label="Investimento (30d)" 
              value={`R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              color="accent"
              sub="Total investido no período"
            />
            <SummaryCard 
              label="Impressões" 
              value={totals.impressions.toLocaleString('pt-BR')}
              icon={Eye}
              color="blue"
              sub="Total de visualizações"
            />
            <SummaryCard 
              label="Cliques" 
              value={totals.clicks.toLocaleString('pt-BR')}
              icon={MousePointer2}
              color="purple"
              sub={`${avgCtr.toFixed(2)}% CTR Médio`}
            />
            <SummaryCard 
              label="CPC Médio" 
              value={`R$ ${avgCpc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="amber"
              sub="Custo por clique"
            />
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-[1.2rem] font-black text-primary">Campanhas Ativas</h3>
              <div className="flex gap-4">
                 <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" /> Ativas
                 </span>
                 <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                   <div className="w-2 h-2 rounded-full bg-slate-300" /> Pausadas
                 </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Investido</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cliques</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CTR</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CPC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaigns.map((campaign, idx) => (
                    <motion.tr
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-black text-primary group-hover:text-accent transition-colors">
                            {campaign.name}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                            {campaign.objective.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            campaign.status === 'ACTIVE' 
                              ? 'bg-emerald-50 text-emerald-600' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-primary text-[14px]">
                        R$ {Number(campaign.insights?.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-slate-600 text-[13px]">
                        {Number(campaign.insights?.clicks || 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-slate-400 text-[13px]">
                        {Number(campaign.insights?.ctr || 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-primary text-[13px]">
                        R$ {Number(campaign.insights?.cpc || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </motion.tr>
                  ))}
                  {campaigns.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <p className="text-slate-400 font-bold">Nenhuma campanha encontrada para esta conta.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integration Note */}
          <div className="mt-12 p-8 bg-gradient-to-br from-primary to-[#1A5C36] rounded-[3rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h3 className="text-[1.8rem] font-black mb-2 tracking-tight">Vincular com KPIs Financeiros</h3>
                <p className="text-white/70 font-semibold leading-relaxed max-w-xl">
                  Os dados de investimento mkt desta tela são enviados automaticamente para a aba de KPIs. 
                  Isso permite o cálculo real do CAC e LTV/CAC baseado no seu gasto atual em Ads.
                </p>
              </div>
              <div className="flex gap-4 shrink-0">
                <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Gasto 30d</p>
                  <p className="text-[1.5rem] font-black text-accent">R$ {totals.spend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">ROI Est.</p>
                  <p className="text-[1.5rem] font-black">--</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, sub }: any) {
  const colors: any = {
    accent: { bg: 'bg-accent/10', text: 'text-accent', icon: 'text-accent' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'text-amber-500' },
  };
  const c = colors[color] || colors.accent;

  return (
    <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-4`}>
        <Icon size={22} className={c.icon} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-[1.8rem] font-black ${c.text} tracking-tighter leading-none mb-2`}>{value}</p>
      <p className="text-[11px] font-bold text-slate-400">{sub}</p>
    </div>
  );
}
