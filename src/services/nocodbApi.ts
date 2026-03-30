// NocoDB Integration Service
// Base: https://app.nocodb.com | Project: p3wsy6twa4cp83k

const NOCO_BASE = 'https://app.nocodb.com/api/v2';
const NOCO_TOKEN = 'nrUcWLti4g7sq9DDozerYytubAt8_7lvFEw0Ek6H';

const TABLES = {
  users:       'mkq4uec7wcr07vx',
  evoSnapshot: 'mz3j6q155ow62wg',
  kpis:        'm0e4fmdvti599he',
  relatorios:  'mz64de7m3jrw9k3',
  financeiro:  'md8nl1tu1gyvhzd',
} as const;

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function nocoGet(table: string, params = ''): Promise<any> {
  const res = await fetch(`${NOCO_BASE}/tables/${table}/records${params}`, {
    headers: { 'xc-token': NOCO_TOKEN },
  });
  if (!res.ok) throw new Error(`NocoDB GET ${res.status}`);
  return res.json();
}

async function nocoPost(table: string, body: object): Promise<any> {
  const res = await fetch(`${NOCO_BASE}/tables/${table}/records`, {
    method: 'POST',
    headers: { 'xc-token': NOCO_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`NocoDB POST ${res.status}`);
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface GbUser {
  Id: number;
  email: string;
  name: string;
  role: string;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function loginWithNocoDB(email: string, password: string): Promise<GbUser> {
  const hash = await sha256(password);
  const encoded = encodeURIComponent(email);
  const data = await nocoGet(
    TABLES.users,
    `?where=(email,eq,${encoded})~and(password_hash,eq,${hash})~and(active,eq,true)&limit=1`
  );
  const record = data?.list?.[0];
  if (!record) throw new Error('Credenciais inválidas ou acesso inativo.');
  return { Id: record.Id, email: record.email, name: record.name, role: record.role };
}

export function saveSession(user: GbUser) {
  localStorage.setItem('gb_session', JSON.stringify(user));
}

export function getSession(): GbUser | null {
  try {
    const raw = localStorage.getItem('gb_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem('gb_session');
}

// ─── EVO Snapshot ─────────────────────────────────────────────────────────────

export async function saveEvoSnapshot(branchName: string, data: {
  activeMembers: number;
  inactiveMembers: number;
  todayEntries: number;
  rawJson?: object;
}) {
  const today = new Date().toISOString().split('T')[0];
  return nocoPost(TABLES.evoSnapshot, {
    branch_name:     branchName,
    active_members:  data.activeMembers,
    inactive_members: data.inactiveMembers,
    today_entries:   data.todayEntries,
    snapshot_date:   today,
    raw_json:        data.rawJson ? JSON.stringify(data.rawJson) : null,
  });
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

export async function logRelatorio(opts: {
  titulo: string;
  tipo: string;
  geradoPor: string;
  periodoInicio?: string;
  periodoFim?: string;
  resumo?: object;
}) {
  const today = new Date().toISOString().split('T')[0];
  return nocoPost(TABLES.relatorios, {
    titulo:         opts.titulo,
    tipo:           opts.tipo,
    gerado_por:     opts.geradoPor,
    periodo_inicio: opts.periodoInicio ?? today,
    periodo_fim:    opts.periodoFim ?? today,
    resumo_json:    opts.resumo ? JSON.stringify(opts.resumo) : null,
  });
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface Kpi {
  Id?: number;
  nome: string;
  valor: number;
  meta: number;
  unidade: string;
  categoria: string;
  periodo: string;
  observacao?: string;
}

export async function fetchKpis(): Promise<Kpi[]> {
  const data = await nocoGet(TABLES.kpis, '?limit=100&sort=-CreatedAt');
  return data?.list ?? [];
}

export async function saveKpi(kpi: Omit<Kpi, 'Id'>): Promise<void> {
  await nocoPost(TABLES.kpis, kpi);
}

// ─── Financeiro ───────────────────────────────────────────────────────────────

export interface LancamentoFinanceiro {
  Id?: number;
  unidade: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  observacao?: string;
}

export async function fetchLancamentos(): Promise<LancamentoFinanceiro[]> {
  const data = await nocoGet(TABLES.financeiro, '?limit=200&sort=-data');
  return data?.list ?? [];
}

export async function saveLancamento(l: Omit<LancamentoFinanceiro, 'Id'>): Promise<void> {
  await nocoPost(TABLES.financeiro, l);
}
