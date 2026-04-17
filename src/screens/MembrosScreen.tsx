import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, User, Phone, Mail, Calendar, Download } from 'lucide-react';
import {
  UNITS,
  STATUS,
  getMemberStatusLabel,
  getMemberStatusColor,
  fetchMembers,
  fetchMembersAllBranches,
  formatDate,
  type Member,
} from '../services/evoApi';
import { MemberDetailModal } from '../components/MemberDetailModal';

const BRANCH_OPTIONS = [
  { label: 'Todas as Unidades', idBranch: 0 },
  ...Object.entries(UNITS).map(([name, cfg]) => ({ label: name, idBranch: cfg.idBranch })),
];

// The API only supports status=1 (Active) and status=2 (Inactive).
// "Cancelled" is not a filterable status — the API ignores any other value.
const STATUS_OPTIONS = [
  { label: 'Todos',          statusId: undefined        },
  { label: 'Alunos',         statusId: STATUS.ACTIVE    },
  { label: 'Inadimplentes',  statusId: STATUS.INACTIVE  },
];

const PAGE_SIZE = 25;

interface Props {
  initialBranchId?: number;
}

export function MembrosScreen({ initialBranchId = 0 }: Props) {
  const [selectedBranch, setSelectedBranch] = useState(initialBranchId);   // 0 = all
  const [selectedStatus, setSelectedStatus] = useState<number | undefined>(STATUS.ACTIVE);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [members, setMembers]   = useState<Member[]>([]);
  const [hasMore, setHasMore]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    if (initialBranchId) {
      setSelectedBranch(initialBranchId);
    }
  }, [initialBranchId]);

  // Accumulate members from all branches when "all" is selected
  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (selectedBranch === 0) {
        const result = await fetchMembersAllBranches({
          statusId: selectedStatus,
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });
        // Sort alphabetically by name, accent-aware
        const sorted = result.members.slice().sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR', { sensitivity: 'base' })
        );
        setMembers(sorted);
        setHasMore(result.hasMore);
      } else {
        const unit = Object.values(UNITS).find(u => u.idBranch === selectedBranch);
        if (!unit) return;
        const result = await fetchMembers(unit.idBranch, unit.token, {
          statusId: selectedStatus,
          take: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });
        const sorted = result.members.slice().sort((a, b) =>
          (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR', { sensitivity: 'base' })
        );
        setMembers(sorted);
        setHasMore(result.hasMore);
      }
    } catch {
      setError('Erro ao carregar membros. Verifique a conexão com a API.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch, selectedStatus, page]);

  useEffect(() => {
    setPage(0);
  }, [selectedBranch, selectedStatus]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Client-side search filter
  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.cellPhone?.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );
  });

  const branchName = (idBranch: number) =>
    Object.entries(UNITS).find(([, cfg]) => cfg.idBranch === idBranch)?.[0] ?? `#${idBranch}`;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Unidade', 'Data_Cadastro', 'Status_Atual'];
    const csvContent = [
      headers.join(';'),
      ...filtered.map(m => [
        m.idMember,
        m.name ?? '',
        m.email ?? '',
        m.cellPhone ?? '',
        m.branchName ?? branchName(m.idBranch),
        m.registerDate ? m.registerDate.split('T')[0] : '',
        getMemberStatusLabel(m.membershipStatus)
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `evo_membros_${selectedStatus === STATUS.INACTIVE ? 'inativos' : 'lista'}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          Gestão de Membros
        </span>
        <h1 className="text-[3.5rem] font-black text-primary leading-none tracking-tighter mb-4">
          Base de <span className="text-accent">Membros</span>
        </h1>
        <p className="text-slate-400 text-[16px] font-semibold">
          Lista completa com dados reais da API W12 EVO.
        </p>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4 mb-8"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="w-full pl-12 pr-5 py-3.5 bg-[#F8FAFB] border border-slate-100 rounded-2xl text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-700"
          />
        </div>

        {/* Branch Selector */}
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(Number(e.target.value))}
          className="px-5 py-3.5 bg-[#F8FAFB] border border-slate-100 rounded-2xl text-[14px] font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer min-w-[200px]"
        >
          {BRANCH_OPTIONS.map(opt => (
            <option key={opt.idBranch} value={opt.idBranch}>{opt.label}</option>
          ))}
        </select>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0 || isLoading}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#F8FAFB] border border-slate-100 rounded-2xl text-[13px] font-black text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap lg:ml-auto"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </motion.div>

      {/* ── Status Filter Pills ── */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex gap-2 mb-8 flex-wrap"
      >
        {STATUS_OPTIONS.map(({ label, statusId }) => (
          <button
            key={label}
            onClick={() => setSelectedStatus(statusId)}
            className={`px-5 py-2.5 rounded-full text-[12px] font-black transition-all ${
              selectedStatus === statusId
                ? 'bg-primary text-white shadow-[0_4px_14px_rgba(15,60,35,0.25)]'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <p className="text-red-500 text-sm font-bold">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      >
        {/* Table Header */}
        <div className="border-b border-slate-100 bg-[#F9FBF9] px-6 py-4 grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr] gap-4">
          {['Membro', 'Contato', 'Unidade', 'Cadastro', 'Tipo'].map(h => (
            <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-4 grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr] gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100" />
                  <div className="h-4 bg-slate-100 rounded-lg flex-1" />
                </div>
                <div className="h-4 bg-slate-50 rounded-lg" />
                <div className="h-4 bg-slate-50 rounded-lg" />
                <div className="h-4 bg-slate-50 rounded-lg" />
                <div className="h-6 w-16 bg-slate-50 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Members List */}
        {!isLoading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <User size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold text-[15px]">Nenhum membro encontrado</p>
            <p className="text-slate-300 text-[13px] mt-1">Tente ajustar os filtros</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="divide-y divide-slate-50">
            {filtered.map((m, i) => (
              <motion.div
                key={m.idMember}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.4) }}
                className="px-6 py-4 grid grid-cols-[2fr_2fr_1.5fr_1fr_1.2fr] gap-4 items-center hover:bg-[#FAFCFA] transition-colors cursor-pointer group"
                onClick={() => setSelectedMember(m)}
              >
                {/* Member Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#E8F5EC] flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-[13px] font-black text-primary">
                        {m.name?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-[#0F172A] text-[13px] truncate">{m.name ?? '—'}</p>
                    <p className="text-[11px] text-slate-400 font-semibold">ID #{m.idMember}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="min-w-0">
                  {m.email && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5 truncate">
                      <Mail size={10} className="shrink-0" /> <span className="truncate">{m.email}</span>
                    </div>
                  )}
                  {m.cellPhone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Phone size={10} className="shrink-0" /> <span>{m.cellPhone}</span>
                    </div>
                  )}
                  {!m.email && !m.cellPhone && <span className="text-slate-300 text-[12px]">—</span>}
                </div>

                {/* Branch */}
                <div>
                  <span className="text-[12px] font-black text-slate-600 truncate block">
                    {m.branchName ?? branchName(m.idBranch)}
                  </span>
                </div>

                {/* Register Date */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Calendar size={10} className="shrink-0" />
                  <span>{formatDate(m.registerDate)}</span>
                </div>

                {/* Tipo Badge (Aluno / Oportunidade / etc.) */}
                <div>
                  {(() => {
                    const label = getMemberStatusLabel(m.membershipStatus);
                    const color = getMemberStatusColor(m.membershipStatus);
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap"
                        style={{ backgroundColor: `${color}18`, color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!isLoading && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-[#F9FBF9]">
            <span className="text-[12px] font-black text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'membro' : 'membros'} exibidos
              {search && ` (filtrado de ${members.length})`}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 text-[12px] font-black text-slate-600">
                Pág. {page + 1}
              </span>
              <button
                disabled={!hasMore}
                onClick={() => setPage(p => p + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <MemberDetailModal
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
