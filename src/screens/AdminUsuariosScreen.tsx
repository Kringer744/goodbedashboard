import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Save, RefreshCw, Shield, User, X,
  Eye, EyeOff, CheckSquare, Square, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  fetchAllUsers,
  updateUserPermissions,
  createNewUser,
  type GbUserRecord,
} from '../services/nocodbApi';
import { UNITS } from '../services/evoApi';

const ALL_PAGES = [
  { id: 'dashboard',   label: 'Painel' },
  { id: 'unidades',    label: 'Unidades' },
  { id: 'financeiro',  label: 'Financeiro' },
  { id: 'membros',     label: 'Membros' },
  { id: 'metas',       label: 'Metas' },
  { id: 'agregadores', label: 'Agregadores' },
  { id: 'campanhas',   label: 'Marketing' },
  { id: 'kpis',        label: 'KPIs' },
];

const ALL_UNITS = Object.keys(UNITS);

const ROLES = [
  { value: 'admin',     label: 'Administrador', color: 'text-primary bg-[#E8F5EC] border-[#C3E6CB]' },
  { value: 'gerente',   label: 'Gerente',        color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { value: 'consultor', label: 'Consultor',      color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'viewer',    label: 'Visualizador',   color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

interface EditState {
  user: GbUserRecord;
  allowedUnits: string[];
  allowedPages: string[];
  allUnits: boolean;
  allPages: boolean;
}

interface CreateState {
  email: string;
  name: string;
  role: string;
  password: string;
  confirmPassword: string;
  allowedUnits: string[];
  allowedPages: string[];
  allUnits: boolean;
  allPages: boolean;
}

function parseList(val: string | undefined, allItems: string[]): { items: string[]; all: boolean } {
  if (!val || val === 'all') return { items: allItems, all: true };
  const items = val.split(',').map(s => s.trim()).filter(Boolean);
  return { items, all: false };
}

function serializeList(items: string[], all: boolean, allItems: string[]): string {
  if (all || items.length === allItems.length) return 'all';
  return items.join(',');
}

function roleConfig(role: string) {
  return ROLES.find(r => r.value === role) ?? ROLES[3];
}

export function AdminUsuariosScreen() {
  const [users, setUsers]           = useState<GbUserRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [editing, setEditing]       = useState<EditState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [savedId, setSavedId]       = useState<number | null>(null);
  const [showPass, setShowPass]     = useState(false);

  const blankCreate = (): CreateState => ({
    email: '', name: '', role: 'viewer', password: '', confirmPassword: '',
    allowedUnits: ALL_UNITS, allowedPages: ALL_PAGES.map(p => p.id),
    allUnits: true, allPages: true,
  });
  const [createForm, setCreateForm] = useState<CreateState>(blankCreate);

  const loadUsers = () => {
    setLoading(true);
    setError(null);
    fetchAllUsers()
      .then(setUsers)
      .catch(() => setError('Erro ao carregar usuários. Verifique o token NocoDB.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const openEdit = (u: GbUserRecord) => {
    const { items: units, all: allU } = parseList(u.allowed_units, ALL_UNITS);
    const { items: pages, all: allP } = parseList(u.allowed_pages, ALL_PAGES.map(p => p.id));
    setEditing({ user: { ...u }, allowedUnits: units, allowedPages: pages, allUnits: allU, allPages: allP });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      await updateUserPermissions(editing.user.Id, {
        name:          editing.user.name,
        role:          editing.user.role,
        active:        editing.user.active,
        allowed_units: serializeList(editing.allowedUnits, editing.allUnits, ALL_UNITS),
        allowed_pages: serializeList(editing.allowedPages, editing.allPages, ALL_PAGES.map(p => p.id)),
      });
      setSavedId(editing.user.Id);
      setTimeout(() => setSavedId(null), 2500);
      setEditing(null);
      loadUsers();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (u: GbUserRecord) => {
    try {
      await updateUserPermissions(u.Id, { active: !u.active });
      setUsers(prev => prev.map(x => x.Id === u.Id ? { ...x, active: !x.active } : x));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.name || !createForm.password) {
      setError('Preencha e-mail, nome e senha.');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setError('Senhas não coincidem.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createNewUser({
        email:         createForm.email,
        name:          createForm.name,
        role:          createForm.role,
        password:      createForm.password,
        allowed_units: serializeList(createForm.allowedUnits, createForm.allUnits, ALL_UNITS),
        allowed_pages: serializeList(createForm.allowedPages, createForm.allPages, ALL_PAGES.map(p => p.id)),
      });
      setShowCreate(false);
      setCreateForm(blankCreate());
      loadUsers();
    } catch {
      setError('Erro ao criar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Multi-select helpers ────────────────────────────────────────────────────

  const toggleUnit = (unit: string, isEdit: boolean) => {
    if (isEdit && editing) {
      const has = editing.allowedUnits.includes(unit);
      const next = has ? editing.allowedUnits.filter(u => u !== unit) : [...editing.allowedUnits, unit];
      setEditing({ ...editing, allowedUnits: next, allUnits: next.length === ALL_UNITS.length });
    } else {
      const has = createForm.allowedUnits.includes(unit);
      const next = has ? createForm.allowedUnits.filter(u => u !== unit) : [...createForm.allowedUnits, unit];
      setCreateForm({ ...createForm, allowedUnits: next, allUnits: next.length === ALL_UNITS.length });
    }
  };

  const togglePage = (pageId: string, isEdit: boolean) => {
    if (isEdit && editing) {
      const has = editing.allowedPages.includes(pageId);
      const next = has ? editing.allowedPages.filter(p => p !== pageId) : [...editing.allowedPages, pageId];
      setEditing({ ...editing, allowedPages: next, allPages: next.length === ALL_PAGES.length });
    } else {
      const has = createForm.allowedPages.includes(pageId);
      const next = has ? createForm.allowedPages.filter(p => p !== pageId) : [...createForm.allowedPages, pageId];
      setCreateForm({ ...createForm, allowedPages: next, allPages: next.length === ALL_PAGES.length });
    }
  };

  const toggleAllUnits = (isEdit: boolean) => {
    if (isEdit && editing) {
      const next = !editing.allUnits;
      setEditing({ ...editing, allUnits: next, allowedUnits: next ? ALL_UNITS : [] });
    } else {
      const next = !createForm.allUnits;
      setCreateForm({ ...createForm, allUnits: next, allowedUnits: next ? ALL_UNITS : [] });
    }
  };

  const toggleAllPages = (isEdit: boolean) => {
    if (isEdit && editing) {
      const next = !editing.allPages;
      setEditing({ ...editing, allPages: next, allowedPages: next ? ALL_PAGES.map(p => p.id) : [] });
    } else {
      const next = !createForm.allPages;
      setCreateForm({ ...createForm, allPages: next, allowedPages: next ? ALL_PAGES.map(p => p.id) : [] });
    }
  };

  // ── Shared permission panel ─────────────────────────────────────────────────

  const PermissionPanel = ({
    isEdit,
    allowedUnits, allowedPages,
    allUnits, allPages,
  }: {
    isEdit: boolean;
    allowedUnits: string[]; allowedPages: string[];
    allUnits: boolean; allPages: boolean;
  }) => (
    <div className="space-y-6">
      {/* Units */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Unidades com Acesso</label>
          <button
            onClick={() => toggleAllUnits(isEdit)}
            className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:text-accent transition-colors"
          >
            {allUnits ? <CheckSquare size={14} /> : <Square size={14} />}
            Todas
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_UNITS.map(unit => {
            const checked = allowedUnits.includes(unit);
            return (
              <button
                key={unit}
                onClick={() => toggleUnit(unit, isEdit)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-[12px] font-bold transition-all text-left ${
                  checked
                    ? 'bg-[#E8F5EC] border-[#B1D135]/40 text-primary'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {checked ? <CheckSquare size={13} className="shrink-0 text-accent" /> : <Square size={13} className="shrink-0" />}
                <span className="truncate">{unit}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Páginas com Acesso</label>
          <button
            onClick={() => toggleAllPages(isEdit)}
            className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:text-accent transition-colors"
          >
            {allPages ? <CheckSquare size={14} /> : <Square size={14} />}
            Todas
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PAGES.map(page => {
            const checked = allowedPages.includes(page.id);
            return (
              <button
                key={page.id}
                onClick={() => togglePage(page.id, isEdit)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-[12px] font-bold transition-all ${
                  checked
                    ? 'bg-[#E8F5EC] border-[#B1D135]/40 text-primary'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {checked ? <CheckSquare size={13} className="shrink-0 text-accent" /> : <Square size={13} className="shrink-0" />}
                {page.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">

      {/* Header */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }} className="mb-12">
        <span className="text-[11px] uppercase font-black text-primary tracking-[0.2em] mb-3 block">
          Painel Administrativo
        </span>
        <h1 className="text-[3.5rem] font-black text-primary leading-none tracking-tighter mb-4">
          Gestão de <span className="text-accent">Usuários</span>
        </h1>
        <p className="text-slate-400 text-[16px] font-semibold max-w-xl">
          Crie e gerencie acessos. Defina quais páginas e unidades cada usuário pode visualizar.
        </p>
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-8">
        {error && (
          <p className="text-rose-600 text-[13px] font-bold bg-rose-50 border border-rose-100 px-4 py-2.5 rounded-2xl">{error}</p>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="w-11 h-11 flex items-center justify-center rounded-2xl border border-slate-100 text-slate-400 hover:text-primary hover:border-primary/20 transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreateForm(blankCreate()); setError(null); }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={15} /> Novo Usuário
          </button>
        </div>
      </div>

      {/* Users table */}
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
      >
        <div className="bg-[#F9FBF9] px-8 py-5 grid grid-cols-[2fr_2fr_1fr_2fr_2fr_auto] gap-4 border-b border-slate-100">
          {['Usuário', 'E-mail', 'Role', 'Unidades', 'Páginas', ''].map(h => (
            <span key={h} className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="divide-y divide-slate-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-8 py-5 grid grid-cols-[2fr_2fr_1fr_2fr_2fr_auto] gap-4 animate-pulse">
                {[...Array(5)].map((__, j) => <div key={j} className="h-5 bg-slate-100 rounded-lg" />)}
                <div className="h-8 w-20 bg-slate-50 rounded-xl" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <User size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {users.map((u, idx) => {
              const cfg = roleConfig(u.role);
              const unitsSummary = !u.allowed_units || u.allowed_units === 'all'
                ? 'Todas as unidades'
                : u.allowed_units.split(',').slice(0, 2).join(', ') + (u.allowed_units.split(',').length > 2 ? `…+${u.allowed_units.split(',').length - 2}` : '');
              const pagesSummary = !u.allowed_pages || u.allowed_pages === 'all'
                ? 'Todas as páginas'
                : u.allowed_pages.split(',').length + ' páginas';

              return (
                <motion.div
                  key={u.Id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.04 }}
                  className={`px-8 py-5 grid grid-cols-[2fr_2fr_1fr_2fr_2fr_auto] gap-4 items-center transition-colors ${u.active ? 'hover:bg-[#FAFCFA]' : 'bg-slate-50/50 opacity-60'}`}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-[#E8F5EC] flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-black text-primary">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-[13px] text-[#0F172A] truncate">{u.name}</p>
                      {savedId === u.Id && <p className="text-[10px] text-emerald-600 font-bold">Salvo ✓</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-[12px] text-slate-500 font-semibold truncate">{u.email}</p>

                  {/* Role */}
                  <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-[10px] font-black border whitespace-nowrap ${cfg.color}`}>
                    {cfg.label}
                  </span>

                  {/* Units */}
                  <p className="text-[12px] text-slate-500 font-semibold truncate">{unitsSummary}</p>

                  {/* Pages */}
                  <p className="text-[12px] text-slate-500 font-semibold">{pagesSummary}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(u)}
                      title={u.active ? 'Desativar' : 'Ativar'}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                        u.active
                          ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50'
                          : 'border-slate-200 text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {u.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => openEdit(u)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all"
                    >
                      <Shield size={12} /> Acessos
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden mb-10"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-10 pt-10 pb-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Editar Acessos</p>
                  <h3 className="text-[1.8rem] font-black text-primary tracking-tight">{editing.user.name}</h3>
                  <p className="text-[13px] text-slate-400 font-semibold mt-0.5">{editing.user.email}</p>
                </div>
                <button onClick={() => setEditing(null)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              <div className="px-10 py-8 space-y-6">
                {/* Role selector */}
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">Nível de Acesso</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setEditing({ ...editing, user: { ...editing.user, role: r.value } })}
                        className={`py-3 rounded-2xl border text-[12px] font-black transition-all ${
                          editing.user.role === r.value ? r.color : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <PermissionPanel
                  isEdit={true}
                  allowedUnits={editing.allowedUnits}
                  allowedPages={editing.allowedPages}
                  allUnits={editing.allUnits}
                  allPages={editing.allPages}
                />
              </div>

              <div className="px-10 pb-10 flex gap-4">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl text-[12px] font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSaving ? <><RefreshCw size={14} className="animate-spin" /> Salvando…</> : <><Save size={14} /> Salvar Acessos</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/40 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden mb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-10 pt-10 pb-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Novo Usuário</p>
                  <h3 className="text-[1.8rem] font-black text-primary tracking-tight">Criar Acesso</h3>
                </div>
                <button onClick={() => setShowCreate(false)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>

              <div className="px-10 py-8 space-y-5">
                {error && (
                  <p className="text-rose-600 text-[13px] font-bold bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome</label>
                    <input
                      type="text" value={createForm.name} placeholder="Ex: João Silva"
                      onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">E-mail</label>
                    <input
                      type="email" value={createForm.email} placeholder="email@goodbe.com.br"
                      onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Senha</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={createForm.password} placeholder="••••••••"
                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                        className="w-full px-5 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                      />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Confirmar Senha</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={createForm.confirmPassword} placeholder="••••••••"
                      onChange={e => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">Nível de Acesso</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r.value}
                        onClick={() => setCreateForm({ ...createForm, role: r.value })}
                        className={`py-3 rounded-2xl border text-[11px] font-black transition-all ${
                          createForm.role === r.value ? r.color : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <PermissionPanel
                  isEdit={false}
                  allowedUnits={createForm.allowedUnits}
                  allowedPages={createForm.allowedPages}
                  allUnits={createForm.allUnits}
                  allPages={createForm.allPages}
                />
              </div>

              <div className="px-10 pb-10 flex gap-4">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-[12px] font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl text-[12px] font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isSaving ? <><RefreshCw size={14} className="animate-spin" /> Criando…</> : <><Plus size={14} /> Criar Usuário</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
