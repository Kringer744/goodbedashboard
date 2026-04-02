// W12 EVO API Integration Service
// Swagger: https://evo-integracao.w12app.com.br/swagger/index.html
// Base URL proxied via Vite: /evo-api → https://evo-integracao-api.w12app.com.br

const DNS = "goodbe";
const EVO_BASE = "/evo-api";

// ─── Unit Config ──────────────────────────────────────────────────────────────

export interface UnitConfig {
  idBranch: number;
  token: string;
  location: string;
}

export const UNITS: Record<string, UnitConfig> = {
  "Altino Arantes":    { idBranch: 1, token: "406B8641-CAA9-412C-8C37-74B85A9890B3", location: "São Paulo, SP" },
  "Saúde":             { idBranch: 2, token: "1470A068-AE9E-4479-8A62-9178E0463BB9", location: "São Paulo, SP" },
  "Parque das Nações": { idBranch: 3, token: "351AE51B-E409-4A16-B53D-51CC735418C5", location: "São Paulo, SP" },
  "Alto do Ipiranga":  { idBranch: 4, token: "5CF613BE-0745-4EE4-B629-F3FC4E397E49", location: "São Paulo, SP" },
  "Jardins":           { idBranch: 5, token: "2C8926D6-D541-413A-AE71-8B4992DE5833", location: "São Paulo, SP" },
  "Belenzinho":        { idBranch: 6, token: "11F821F4-19D5-4CC3-8C5A-E22979FA8A57", location: "São Paulo, SP" },
  "Campestre":         { idBranch: 7, token: "7ECD5713-7D81-4BFD-A0AC-38D14EFC526D", location: "São Paulo, SP" },
};

// ─── Status ───────────────────────────────────────────────────────────────────

// Official documented membershipStatus values (string param on /api/v1/members)
// These reflect the CONTRACT status — not the member account status.
// "active"    → has a currently paid/active contract
// "inactive"  → contract lapsed / paused (relevant churn, reactivation targets)
// "cancelled" → formally cancelled
export const MEMBERSHIP_STATUS = {
  ACTIVE:    'active',
  INACTIVE:  'inactive',
  CANCELLED: 'cancelled',
} as const;

// Legacy integer status (undocumented, kept as fallback)
export const STATUS = { ACTIVE: 1, INACTIVE: 2 } as const;

export function getMemberStatusLabel(s: string): string {
  const n = (s ?? '').toLowerCase();
  if (n === 'active')                        return 'Aluno';
  if (n === 'inactive')                      return 'Oportunidade';
  if (n === 'cancelled' || n === 'canceled') return 'Cancelado';
  if (n === 'suspended')                     return 'Suspenso';
  return s || 'Desconhecido';
}

export function getMemberStatusColor(s: string): string {
  const n = (s ?? '').toLowerCase();
  if (n === 'active')                        return '#10B981'; // Aluno
  if (n === 'inactive')                      return '#F59E0B'; // Oportunidade
  if (n === 'cancelled' || n === 'canceled') return '#F43F5E'; // Cancelado
  if (n === 'suspended')                     return '#8B5CF6';
  return '#94a3b8';
}

// ─── Request Queue (Anti-429) ────────────────────────────────────────────────

class EvoQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = false;
  private lastRequestTime = 0;
  private minDelay = 400; // ms between requests

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.running || this.queue.length === 0) return;
    this.running = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const wait = Math.max(0, this.minDelay - (now - this.lastRequestTime));
      if (wait > 0) await new Promise(r => setTimeout(r, wait));

      const fn = this.queue.shift();
      if (fn) {
        await fn();
        this.lastRequestTime = Date.now();
      }
    }

    this.running = false;
  }
}

const evoQueue = new EvoQueue();

// ─── Auth & HTTP ──────────────────────────────────────────────────────────────

function getAuth(token: string): string {
  return btoa(`${DNS}:${token}`);
}

// Simple in-memory cache
const memCache: Record<string, { data: any, timestamp: number }> = {};
const MEM_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

async function evoGet(path: string, token: string, retries = 3, backoff = 1500): Promise<unknown> {
  const cacheKey = `${token}:${path}`;
  if (memCache[cacheKey] && (Date.now() - memCache[cacheKey].timestamp < MEM_CACHE_TTL)) {
    return memCache[cacheKey].data;
  }

  return evoQueue.add(async () => {
    // Double check internal cache inside the queue in case multiple same requests were queued
    if (memCache[cacheKey] && (Date.now() - memCache[cacheKey].timestamp < MEM_CACHE_TTL)) {
      return memCache[cacheKey].data;
    }

    const res = await fetch(`${EVO_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${getAuth(token)}`,
      },
    });

    if (res.status === 429 && retries > 0) {
      console.warn(` Rate limited (429) on ${path}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return evoGet(path, token, retries - 1, backoff * 2);
    }

    if (!res.ok) throw new Error(`EVO API ${res.status}: ${path}`);
    
    const data = await res.json();
    memCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  });
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ─── Response Parsing ─────────────────────────────────────────────────────────

export function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data !== null && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.members))     return o.members;
    if (Array.isArray(o.memberships)) return o.memberships;
    if (Array.isArray(o.data))        return o.data;
    if (Array.isArray(o.entries))     return o.entries;
    if (Array.isArray(o.result))      return o.result;
    if (Array.isArray(o.items))       return o.items;
    // Last resort: return the first array value found in the object
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Member {
  idMember: number;
  firstName?: string;
  lastName?: string;
  registerName?: string;
  registerLastName?: string;
  name?: string;
  email?: string;
  cellPhone?: string;
  photoUrl?: string;
  membershipStatus: string;
  status?: string;
  idBranch: number;
  branchName?: string;
  registerDate?: string;
  birthDate?: string;
  lastAccessDate?: string;
  contacts?: Array<{
    contactType?: string;
    content?: string;
    contactValue?: string;
  }>;
}

function normalizeMember(raw: unknown): Member {
  const m = raw as Member;

  // Build display name
  const first = m.firstName  ?? m.registerName     ?? '';
  const last  = m.lastName   ?? m.registerLastName ?? '';
  m.name = [first, last].filter(Boolean).join(' ') || `Membro #${m.idMember}`;

  // v2 API returns membershipStatus as "" but puts the real value in `status`
  // v1 API correctly sets membershipStatus. Normalise so both work.
  if (!m.membershipStatus && m.status) {
    m.membershipStatus = m.status;
  }

  // Resolve email / phone from contacts array when top-level fields are absent
  if (Array.isArray(m.contacts)) {
    if (!m.email) {
      const ec = m.contacts.find(c => /email/i.test(c.contactType ?? ''));
      m.email = ec?.contactValue ?? ec?.content;
    }
    if (!m.cellPhone) {
      const pc = m.contacts.find(c => /cel|phone|fone|tel/i.test(c.contactType ?? ''));
      m.cellPhone = pc?.contactValue ?? pc?.content;
    }
  }
  return m;
}

// ─── Branch Stats (for Dashboard & Unidades) ──────────────────────────────────

export interface BranchStats {
  name: string;
  location: string;
  idBranch: number;
  activeMembers: number;
  cancelledMembers: number;
  inactiveMembers: number;
  hasError: boolean;
  lastUpdate?: number;
}

const V1_PAGE = 150;

/**
 * Count members by their status using the official EVO API parameter:
 * - 1: Active (includes VIP/Suspended)
 * - 2: Inactive
 */
async function countMembersByStatus(idBranch: number, token: string, status: number, extraParams = ''): Promise<number> {
  let count = 0;
  let skip = 0;
  while (true) {
    const data = await evoGet(
      `/api/v2/members?take=${V1_PAGE}&skip=${skip}&status=${status}&idBranch=${idBranch}${extraParams}`,
      token
    );
    const page = extractArray(data);
    count += page.length;
    if (page.length < V1_PAGE) break;
    skip += V1_PAGE;
    if (skip >= 20_000) break;
  }
  return count;
}

// Cache version bump — forces refresh when counting method changes
const STATS_CACHE_VERSION = 3; // bump this if query param changes

export async function fetchBranchStats(name: string): Promise<BranchStats> {
  const cacheKey = `stats:${name}`;
  const local = localStorage.getItem(cacheKey);
  if (local) {
    const parsed = JSON.parse(local) as BranchStats & { _v?: number };
    // Invalidate cache if version mismatch (forces re-fetch with new param)
    const cacheValid =
      parsed._v === STATS_CACHE_VERSION &&
      parsed.lastUpdate &&
      (Date.now() - parsed.lastUpdate < 3 * 60 * 60 * 1000);
    if (cacheValid) return parsed;
  }

  const { idBranch, token, location } = UNITS[name];
  try {
    // Use the official `status` parameter (1=Active, 2=Inactive) as documented in EVO Swagger
    let activeMembers    = await countMembersByStatus(idBranch, token, 1);

    // Limit inactive members to those whose membership ended in the last 30 days 
    // to represent recent churn/evasion, rather than the entire history of the gym.
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const dateLimit = d.toISOString().split('T')[0];
    let inactiveMembers  = await countMembersByStatus(idBranch, token, 2, `&membershipEndDateStart=${dateLimit}`);
    
    let cancelledMembers = 0; // API /api/v2/members does not support filtering by cancelled

    console.log(`[EVO Stats] ${name}: active=${activeMembers}, inactive=${inactiveMembers}, cancelled=${cancelledMembers}`);

    const stats = {
      name,
      location,
      idBranch,
      activeMembers,
      inactiveMembers,
      cancelledMembers,
      hasError: false,
      lastUpdate: Date.now(),
      _v: STATS_CACHE_VERSION,
    };
    localStorage.setItem(cacheKey, JSON.stringify(stats));
    return stats;
  } catch (err) {
    console.error(`Error fetching stats for ${name}:`, err);
    if (local) return JSON.parse(local); // fallback to old cache on error
    return { name, location, idBranch, activeMembers: 0, cancelledMembers: 0, inactiveMembers: 0, hasError: true };
  }
}

export async function fetchAllBranchStats(): Promise<BranchStats[]> {
  const results: BranchStats[] = [];
  // Use sequential processing (already handled by evoQueue internally but we stagger branch triggers too)
  for (const name of Object.keys(UNITS)) {
    results.push(await fetchBranchStats(name));
  }
  return results;
}

// ─── Member List ──────────────────────────────────────────────────────────────

export interface MembersResult {
  members: Member[];
  hasMore: boolean;
}

export async function fetchMembers(
  idBranch: number,
  token: string,
  opts: { statusId?: number; take?: number; skip?: number } = {}
): Promise<MembersResult> {
  const { statusId, take = 25, skip = 0 } = opts;
  let url = `/api/v2/members?take=${Math.min(take, 50)}&skip=${skip}&idBranch=${idBranch}`;
  if (statusId) url += `&status=${statusId}`;
  const data = await evoGet(url, token);
  const members = extractArray(data).map(normalizeMember);
  return { members, hasMore: members.length === take };
}

export async function fetchMembersAllBranches(
  opts: { statusId?: number; take?: number; skip?: number } = {}
): Promise<MembersResult> {
  const all: Member[] = [];
  // We cannot easily do global skip across branches without fetching all.
  // We'll just fetch a few from each branch to show a combined view.
  for (const [, unit] of Object.entries(UNITS)) {
    try {
      const res = await fetchMembers(unit.idBranch, unit.token, opts);
      all.push(...res.members);
    } catch { /* non-fatal */ }
  }
  return { members: all, hasMore: false };
}

// ─── Today's Entries ─────────────────────────────────────────────────────────

export interface EntryRecord {
  date?: string;
  entryDate?: string;
  registerDate?: string;
  [key: string]: unknown;
}

export async function fetchTodayEntriesForBranch(token: string): Promise<EntryRecord[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  const startDate = `${yyyy}-${mm}-${dd}T00:00:00`;
  const endDate   = `${yyyy}-${mm}-${dd}T23:59:59`;

  try {
    const data = await evoGet(
      `/api/v1/entries?take=1000&registerDateStart=${startDate}&registerDateEnd=${endDate}`,
      token
    );
    return extractArray(data) as EntryRecord[];
  } catch {
    return [];
  }
}

export function groupEntriesBySlotPerBranch(entries: EntryRecord[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  
  // Initialize grid
  Object.keys(UNITS).forEach(unitName => {
    result[unitName] = new Array(12).fill(0);
  });

  for (const e of entries) {
    const raw = e.date ?? e.entryDate ?? e.registerDate;
    const unitName = e._unitName;
    if (!raw || !unitName || !result[unitName]) continue;
    const h = new Date(raw).getHours();
    if (!isNaN(h)) {
      result[unitName][Math.min(Math.floor(h / 2), 11)]++;
    }
  }

  // Normalize percentages per row
  for (const unitName in result) {
    const max = Math.max(...result[unitName], 1);
    result[unitName] = result[unitName].map(v => Math.round((v / max) * 100));
  }

  return result;
}

export function groupEntriesBySlot(entries: EntryRecord[]): number[] {
  const slots = new Array(12).fill(0);
  for (const e of entries) {
    const raw = e.date ?? e.entryDate ?? e.registerDate;
    if (!raw) continue;
    const h = new Date(raw).getHours();
    if (!isNaN(h)) slots[Math.min(Math.floor(h / 2), 11)]++;
  }
  const max = Math.max(...slots, 1);
  return slots.map(v => Math.round((v / max) * 100));
}

export async function fetchTodayEntriesAllBranches(): Promise<EntryRecord[]> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const dd   = String(today.getDate()).padStart(2, '0');
  const startDate = `${yyyy}-${mm}-${dd}T00:00:00`;
  const endDate   = `${yyyy}-${mm}-${dd}T23:59:59`;

  const all: EntryRecord[] = [];
  for (const [unitName, unit] of Object.entries(UNITS)) {
    try {
      const data = await evoGet(
        `/api/v1/entries?take=1000&registerDateStart=${startDate}&registerDateEnd=${endDate}`,
        unit.token
      );
      const d = extractArray(data) as EntryRecord[];
      d.forEach(e => e._unitName = unitName); // Inject branch
      all.push(...d);
    } catch { /* non-fatal */ }
  }
  return all;
}

export async function fetchEntriesAllBranchesForDate(date: Date): Promise<number> {
  const yyyy = date.getFullYear();
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const dd   = String(date.getDate()).padStart(2, '0');
  const startDate = `${yyyy}-${mm}-${dd}T00:00:00`;
  const endDate   = `${yyyy}-${mm}-${dd}T23:59:59`;

  let total = 0;
  for (const [, unit] of Object.entries(UNITS)) {
    try {
      const data = await evoGet(
        `/api/v1/entries?take=1000&registerDateStart=${startDate}&registerDateEnd=${endDate}`,
        unit.token
      );
      total += (extractArray(data) as EntryRecord[]).length;
    } catch { /* non-fatal */ }
  }
  return total;
}

// ─── Cached Ticket Helper ─────────────────────────────────────────────────────

/** Returns the EVO avg ticket from localStorage cache, or 180 if not yet loaded. */
export function getCachedAvgTicket(): number {
  try {
    const raw = localStorage.getItem('gb_ticket_data');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.data?.avgTicket === 'number') return parsed.data.avgTicket;
    }
  } catch { /* ignore */ }
  return 180;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return n.toLocaleString('pt-BR');
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

// ─── Memberships / Plans ──────────────────────────────────────────────────────

export interface Membership {
  idMembership: number;
  nameMembership?: string;
  name?: string;
  membershipType?: string;
  // Price field — EVO may return it under various names
  value?: number | null;
  price?: number | null;
  amount?: number | null;
  monthlyFee?: number | null;
  regularValue?: number | null;
  membershipValue?: number | null;
  duration?: number | null;
  durationType?: string;
  description?: string;
  idBranch?: number | null;
  accessBranches?: { idBranch: number; nameBranch?: string }[];
  _unitName?: string;
}

export interface EntryRecord {
  idMember?: number;
  name?: string;
  registerDate?: string;
  entryDate?: string;
  date?: string;
  _unitName?: string;
}

/** Extract numeric price from a membership object, trying all known field names. */
function getMembershipPrice(p: Membership): number {
  const candidates = [p.value, p.price, p.amount, p.monthlyFee, p.regularValue, p.membershipValue];
  for (const c of candidates) {
    if (typeof c === 'number' && c > 0) return c;
  }
  return 0;
}

/** Send a push notification via EVO App */
export async function sendPushNotification(idBranch: number, token: string, idMember: number, message: string) {
  try {
    const res = await fetch(`${EVO_BASE}/api/v1/members/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`goodbe:${token}`)}`, // specific branch auth
      },
      body: JSON.stringify({
        idMember,
        message,
        idBranch
      }),
    });
    if (!res.ok) throw new Error('Falha ao enviar Push');
    return true;
  } catch (err) {
    console.error('[EVO Push]', err);
    return false;
  }
}

async function fetchMemberships(token: string): Promise<Membership[]> {
  let all: Membership[] = [];
  let skip = 0;
  const take = 50;
  while (true) {
    try {
      // Adicionando active=true para puxar apenas os planos que estão vigentes na unidade, evitando usar preços históricos mortos no cálculo.
      const data = await evoGet(`/api/v2/membership?take=${take}&skip=${skip}&active=true`, token);

      // Debug: log the raw structure once (first page only) to diagnose field names
      if (skip === 0) {
        console.log('[EVO Membership] raw response sample:', JSON.stringify(data).slice(0, 500));
      }

      const page = extractArray(data) as Membership[];
      if (page.length === 0) break;

      // Normalise: copy the detected price into `value` so the rest of the code works uniformly
      const normalised = page.map(p => ({ ...p, value: getMembershipPrice(p) || p.value }));
      all = all.concat(normalised);
      if (page.length < take) break;
      skip += take;
      if (skip >= 500) break;
    } catch (err) {
      console.error('[EVO Membership] fetch error:', err);
      break;
    }
  }
  return all;
}

export interface BranchMemberships {
  unitName: string;
  idBranch: number;
  plans: Membership[];
}

export async function fetchMembershipsPerBranch(): Promise<BranchMemberships[]> {
  const cacheKey = 'gb_memberships_per_branch';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 3 * 60 * 60 * 1000) {
        return parsed.data;
      }
    } catch { /* ignore */ }
  }

  const result: BranchMemberships[] = [];
  for (const [unitName, unit] of Object.entries(UNITS)) {
    try {
      const plans = await fetchMemberships(unit.token);
      // Normalise name field
      const normalised = plans.map(p => ({
        ...p,
        nameMembership: p.nameMembership ?? p.name ?? `Plano #${p.idMembership}`,
        _unitName: unitName,
      }));
      result.push({ unitName, idBranch: unit.idBranch, plans: normalised });
    } catch {
      result.push({ unitName, idBranch: unit.idBranch, plans: [] });
    }
  }

  localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
  return result;
}

export interface TicketData {
  avgTicket: number;
  minTicket: number;
  maxTicket: number;
  totalPlans: number;
  plans: { name: string; value: number; unitName: string }[];
  perBranch: BranchMemberships[];
}

export async function fetchAvgTicket(): Promise<TicketData> {
  const cacheKey = 'gb_ticket_data';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < 3 * 60 * 60 * 1000) {
        return parsed.data;
      }
    } catch { /* ignore */ }
  }

  const perBranch = await fetchMembershipsPerBranch();

  // Deduplicate by idMembership across branches, keep priciest entry
  const seen = new Map<number, { name: string; value: number; unitName: string }>();
  for (const branch of perBranch) {
    for (const p of branch.plans) {
      const val = typeof p.value === 'number' && p.value > 0 ? p.value : null;
      if (!val) continue;
      const existing = seen.get(p.idMembership);
      if (!existing || val > existing.value) {
        seen.set(p.idMembership, {
          name: p.nameMembership ?? `Plano #${p.idMembership}`,
          value: val,
          unitName: branch.unitName,
        });
      }
    }
  }

  const plans = [...seen.values()].sort((a, b) => b.value - a.value);
  const values = plans.map(p => p.value);

  const result: TicketData = {
    avgTicket:  values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 180,
    minTicket:  values.length > 0 ? Math.min(...values) : 0,
    maxTicket:  values.length > 0 ? Math.max(...values) : 0,
    totalPlans: plans.length,
    plans,
    perBranch,
  };

  localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
  return result;
}

// ─── Receivables (Recebíveis) ─────────────────────────────────────────────────

export interface ReceivableRow {
  [key: string]: any;
}

export interface ReceivablesData {
  data: ReceivableRow[];
  period: string;
  total: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  totalAmount: number;
}

const RECEIVABLES_CACHE_KEY = 'gb_receivables_data';
const RECEIVABLES_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function fetchReceivables(dtFrom?: string, dtTo?: string): Promise<ReceivablesData> {
  // Check cache
  const cached = localStorage.getItem(RECEIVABLES_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < RECEIVABLES_CACHE_TTL) {
        console.log('[Receivables] Using cached data');
        return parsed.data;
      }
    } catch { /* ignore */ }
  }

  // Default to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const from = dtFrom ?? fmt(firstDay);
  const to   = dtTo   ?? fmt(lastDay);

  // Use first unit token for auth
  const firstToken = Object.values(UNITS)[0].token;
  const authHeader = 'Basic ' + btoa(`${DNS}:${firstToken}`);

  const url = `/evo-integracao/api/v1/receivables/summary-excel?dtLancamentoDe=${from}&dtLancamentoAte=${to}`;
  console.log(`[Receivables] Fetching: ${url}`);

  const res = await fetch(url, {
    headers: { 'Authorization': authHeader },
  });

  if (!res.ok) {
    throw new Error(`Receivables API ${res.status}`);
  }

  const { read, utils } = await import('xlsx');

  const buffer = await res.arrayBuffer();
  const workbook = read(new Uint8Array(buffer), { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: ReceivableRow[] = utils.sheet_to_json(worksheet);

  // Normalize keys (trim whitespace)
  const data = rawData.map(row => {
    const newRow: ReceivableRow = {};
    for (const key in row) {
      newRow[key.trim()] = row[key];
    }
    return newRow;
  });

  console.log(`[Receivables] Parsed ${data.length} rows. Sample keys:`, data[0] ? Object.keys(data[0]) : []);

  // Calculate totals — try common column names
  const amountKey  = findKey(data[0], ['Valor', 'valor', 'Value', 'value', 'Total', 'total', 'ValorLiquido', 'Valor Líquido']);
  const statusKey  = findKey(data[0], ['Status', 'status', 'Situação', 'situacao', 'Situacao']);

  let totalAmount   = 0;
  let totalReceived = 0;
  let totalPending  = 0;
  let totalOverdue  = 0;

  for (const row of data) {
    const amount = typeof row[amountKey] === 'number' ? row[amountKey] : parseFloat(String(row[amountKey] ?? '0').replace(',', '.')) || 0;
    totalAmount += amount;

    const status = String(row[statusKey] ?? '').toLowerCase();
    if (status.includes('pago') || status.includes('receb') || status.includes('liquidado') || status.includes('paid')) {
      totalReceived += amount;
    } else if (status.includes('atraso') || status.includes('vencido') || status.includes('overdue')) {
      totalOverdue += amount;
    } else {
      totalPending += amount;
    }
  }

  const result: ReceivablesData = {
    data,
    period: `${from} até ${to}`,
    total: data.length,
    totalReceived,
    totalPending,
    totalOverdue,
    totalAmount,
  };

  localStorage.setItem(RECEIVABLES_CACHE_KEY, JSON.stringify({ data: result, timestamp: Date.now() }));
  return result;
}

function findKey(row: ReceivableRow | undefined, candidates: string[]): string {
  if (!row) return candidates[0];
  for (const c of candidates) {
    if (c in row) return c;
  }
  const keys = Object.keys(row);
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase().includes(c.toLowerCase()));
    if (found) return found;
  }
  return candidates[0];
}
