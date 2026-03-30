// PDF Report Generator — Goodbe Dashboard
// Uses jsPDF to programmatically build a branded multi-page report.

import { jsPDF } from 'jspdf';
import { GOODBE_LOGO_BASE64 } from './logoBase64';
import type { DashboardData } from '../App';
import { getCachedAvgTicket, formatNumber } from './evoApi';

// ─── Colors ──────────────────────────────────────────────────────────────────
const PRIMARY   = [15, 60, 35]   as const; // #0F3C23
const ACCENT    = [177, 209, 53] as const; // #B1D135
const TEXT_DARK = [15, 23, 42]   as const; // #0F172A
const GRAY      = [148, 163, 184] as const; // #94A3B8
const WHITE     = [255, 255, 255] as const;
const LIGHT_BG  = [248, 250, 251] as const; // #F8FAFB
const ROSE      = [244, 63, 94]  as const;

type RGB = readonly [number, number, number];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setColor(doc: jsPDF, rgb: RGB) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function setFillColor(doc: jsPDF, rgb: RGB) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, rgb: RGB, radius = 0) {
  setFillColor(doc, rgb);
  if (radius > 0) {
    doc.roundedRect(x, y, w, h, radius, radius, 'F');
  } else {
    doc.rect(x, y, w, h, 'F');
  }
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number, dateStr: string) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  // Separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(20, ph - 18, pw - 20, ph - 18);
  // Footer text
  doc.setFontSize(7);
  setColor(doc, GRAY);
  doc.text(`Goodbe Dashboard  ·  Relatório gerado em ${dateStr}`, 20, ph - 12);
  doc.text(`Página ${pageNum} de ${totalPages}`, pw - 20, ph - 12, { align: 'right' });
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, color: RGB = PRIMARY) {
  drawRect(doc, x, y, w, 28, LIGHT_BG, 3);
  doc.setFontSize(7);
  setColor(doc, GRAY);
  doc.text(label.toUpperCase(), x + w / 2, y + 9, { align: 'center' });
  doc.setFontSize(16);
  setColor(doc, color);
  doc.text(value, x + w / 2, y + 22, { align: 'center' });
}

// ─── Table Helper ────────────────────────────────────────────────────────────
function drawTable(
  doc: jsPDF,
  startY: number,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  startX = 20,
): number {
  const rowH = 9;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  let y = startY;

  // Header
  drawRect(doc, startX, y, totalW, rowH + 2, PRIMARY);
  doc.setFontSize(7.5);
  setColor(doc, WHITE);
  let cx = startX;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], cx + 4, y + 7);
    cx += colWidths[i];
  }
  y += rowH + 2;

  // Rows
  for (let r = 0; r < rows.length; r++) {
    const isEven = r % 2 === 0;
    if (isEven) drawRect(doc, startX, y, totalW, rowH, LIGHT_BG);

    doc.setFontSize(7.5);
    setColor(doc, TEXT_DARK);
    cx = startX;
    for (let i = 0; i < rows[r].length; i++) {
      doc.text(rows[r][i], cx + 4, y + 6.5);
      cx += colWidths[i];
    }
    y += rowH;

    // Page break check
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      y = 25;
    }
  }

  return y;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export async function generateReport(data: DashboardData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(); // 210
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const dateShort = now.toLocaleDateString('pt-BR');
  const totalPages = 4;

  const avgTicket = getCachedAvgTicket();
  const mrr = data.totalActiveMembers * avgTicket;
  const arr = mrr * 12;
  const total = data.totalActiveMembers + data.totalInactiveMembers;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — CAPA + KPIs PRINCIPAIS
  // ═══════════════════════════════════════════════════════════════════════════

  // Top accent bar
  drawRect(doc, 0, 0, pw, 4, PRIMARY);
  drawRect(doc, pw * 0.6, 0, pw * 0.4, 4, ACCENT);

  // Logo
  try {
    doc.addImage(GOODBE_LOGO_BASE64, 'PNG', 20, 14, 22, 22);
  } catch { /* logo failed, skip */ }

  // Title
  doc.setFontSize(22);
  setColor(doc, PRIMARY);
  doc.text('Relatório Goodbe', 48, 27);
  doc.setFontSize(10);
  setColor(doc, GRAY);
  doc.text(`Gerado em ${dateStr}`, 48, 34);

  // Separator
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.5);
  doc.line(20, 42, pw - 20, 42);

  // Section title
  doc.setFontSize(13);
  setColor(doc, PRIMARY);
  doc.text('Visão Geral da Operação', 20, 54);
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text('Dados consolidados de todas as unidades Goodbe · API W12 EVO', 20, 60);

  // KPI boxes — row 1
  const bw = (pw - 60) / 3; // box width
  kpiBox(doc, 20, 68, bw, 'Membros Ativos', formatNumber(data.totalActiveMembers), PRIMARY);
  kpiBox(doc, 20 + bw + 5, 68, bw, 'Entradas Hoje', formatNumber(data.todayEntries), ACCENT);
  kpiBox(doc, 20 + (bw + 5) * 2, 68, bw, 'Retenção', `${data.retentionRate}%`, PRIMARY);

  // KPI boxes — row 2
  const bw2 = (pw - 55) / 2;
  kpiBox(doc, 20, 102, bw2, 'MRR Estimado', `R$ ${(mrr / 1000).toFixed(1)}k`, ACCENT);
  kpiBox(doc, 20 + bw2 + 5, 102, bw2, 'Membros Inativos', formatNumber(data.totalInactiveMembers), ROSE);

  // Additional info
  kpiBox(doc, 20, 136, bw2, 'ARR Projetado', `R$ ${(arr / 1000).toFixed(0)}k`, PRIMARY);
  kpiBox(doc, 20 + bw2 + 5, 136, bw2, 'Ticket Médio (EVO)', `R$ ${avgTicket}`, ACCENT);

  // Small summary box
  drawRect(doc, 20, 172, pw - 40, 20, PRIMARY, 3);
  doc.setFontSize(9);
  setColor(doc, WHITE);
  doc.text('Resumo Operacional', pw / 2, 180, { align: 'center' });
  doc.setFontSize(7);
  doc.text(
    `${Object.keys(data.units).length} unidades ativas · ${formatNumber(total)} membros na base · ${data.hasAnyError ? 'Erros detectados' : 'Todas operacionais'}`,
    pw / 2, 187, { align: 'center' }
  );

  // Units quick preview table
  doc.setFontSize(11);
  setColor(doc, PRIMARY);
  doc.text('Unidades — Resumo Rápido', 20, 206);

  const unitRows = data.units.map(u => {
    const ret = (u.activeMembers + u.inactiveMembers) > 0
      ? Math.round((u.activeMembers / (u.activeMembers + u.inactiveMembers)) * 100)
      : 0;
    return [
      u.name,
      u.activeMembers.toLocaleString('pt-BR'),
      u.inactiveMembers.toLocaleString('pt-BR'),
      `${ret}%`,
      u.hasError ? 'Erro' : 'OK',
    ];
  });

  drawTable(
    doc, 212,
    ['Unidade', 'Ativos', 'Inativos', 'Retenção', 'Status'],
    unitRows,
    [55, 30, 30, 30, 25],
  );

  addFooter(doc, 1, totalPages, dateStr);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — UNIDADES DETALHADAS
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  drawRect(doc, 0, 0, pw, 4, PRIMARY);
  drawRect(doc, pw * 0.6, 0, pw * 0.4, 4, ACCENT);

  doc.setFontSize(15);
  setColor(doc, PRIMARY);
  doc.text('Unidades Operacionais', 20, 20);
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text('Desempenho individual de cada unidade Goodbe', 20, 26);

  let yPos = 34;

  for (const unit of data.units) {
    const unitTotal = unit.activeMembers + unit.inactiveMembers;
    const ret = unitTotal > 0 ? Math.round((unit.activeMembers / unitTotal) * 100) : 0;
    const unitMrr = unit.activeMembers * avgTicket;

    // Unit card
    drawRect(doc, 20, yPos, pw - 40, 30, LIGHT_BG, 3);

    // Accent bar
    const barColor: RGB = ret >= 80 ? ACCENT : ret >= 60 ? [245, 158, 11] : ROSE;
    drawRect(doc, 20, yPos, 3, 30, barColor, 1);

    doc.setFontSize(11);
    setColor(doc, PRIMARY);
    doc.text(unit.name, 28, yPos + 10);

    doc.setFontSize(7);
    setColor(doc, GRAY);
    doc.text(unit.location, 28, yPos + 16);

    // Stats
    doc.setFontSize(8);
    setColor(doc, TEXT_DARK);
    const statsX = 110;
    doc.text(`Ativos: ${unit.activeMembers.toLocaleString('pt-BR')}`, statsX, yPos + 10);
    doc.text(`Inativos: ${unit.inactiveMembers.toLocaleString('pt-BR')}`, statsX, yPos + 17);
    doc.text(`Retenção: ${ret}%`, statsX + 55, yPos + 10);
    doc.text(`MRR: R$ ${(unitMrr / 1000).toFixed(1)}k`, statsX + 55, yPos + 17);

    if (unit.hasError) {
      setColor(doc, ROSE);
      doc.text('⚠ Erro na conexão', statsX + 55, yPos + 24);
    }

    yPos += 35;

    if (yPos > 260) {
      doc.addPage();
      drawRect(doc, 0, 0, pw, 4, PRIMARY);
      drawRect(doc, pw * 0.6, 0, pw * 0.4, 4, ACCENT);
      yPos = 15;
    }
  }

  addFooter(doc, 2, totalPages, dateStr);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — FINANCEIRO
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  drawRect(doc, 0, 0, pw, 4, PRIMARY);
  drawRect(doc, pw * 0.6, 0, pw * 0.4, 4, ACCENT);

  doc.setFontSize(15);
  setColor(doc, PRIMARY);
  doc.text('Análise Financeira', 20, 20);
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text(`Receita calculada com ticket médio de R$ ${avgTicket} (planos reais EVO)`, 20, 26);

  // Financial KPIs
  const fw = (pw - 55) / 2;
  kpiBox(doc, 20, 34, fw, 'MRR Projetado', `R$ ${(mrr / 1000).toFixed(1)}k`, ACCENT);
  kpiBox(doc, 20 + fw + 5, 34, fw, 'Receita em Risco', `R$ ${((data.totalInactiveMembers * avgTicket) / 1000).toFixed(1)}k`, ROSE);
  kpiBox(doc, 20, 68, fw, 'ARR Projetado', `R$ ${(arr / 1000).toFixed(0)}k`, PRIMARY);
  kpiBox(doc, 20 + fw + 5, 68, fw, 'Base de Membros', formatNumber(total), PRIMARY);

  // MRR per unit table
  doc.setFontSize(11);
  setColor(doc, PRIMARY);
  doc.text('MRR por Unidade', 20, 110);

  const sortedUnits = [...data.units].filter(u => !u.hasError).sort((a, b) => b.activeMembers - a.activeMembers);
  const mrrRows = sortedUnits.map(u => [
    u.name,
    u.activeMembers.toLocaleString('pt-BR'),
    `R$ ${((u.activeMembers * avgTicket) / 1000).toFixed(1)}k`,
    `${total > 0 ? Math.round((u.activeMembers / total) * 100) : 0}%`,
  ]);

  // Totals
  mrrRows.push([
    'TOTAL',
    data.totalActiveMembers.toLocaleString('pt-BR'),
    `R$ ${(mrr / 1000).toFixed(1)}k`,
    '100%',
  ]);

  const endY = drawTable(
    doc, 116,
    ['Unidade', 'Membros Ativos', 'MRR', '% Base'],
    mrrRows,
    [55, 40, 40, 35],
  );

  // Disclaimer box
  drawRect(doc, 20, endY + 10, pw - 40, 22, [255, 251, 235], 3); // amber-50
  doc.setFontSize(7);
  setColor(doc, [146, 64, 14]); // amber-800
  doc.text('Nota: O MRR projetado multiplica membros ativos pelo ticket médio dos planos EVO.', 25, endY + 19);
  doc.text('Para receita efetivamente liquidada, habilite os endpoints financeiros no painel EVO.', 25, endY + 26);

  addFooter(doc, 3, totalPages, dateStr);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — KPIs
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  drawRect(doc, 0, 0, pw, 4, PRIMARY);
  drawRect(doc, pw * 0.6, 0, pw * 0.4, 4, ACCENT);

  doc.setFontSize(15);
  setColor(doc, PRIMARY);
  doc.text('Indicadores-Chave (KPIs)', 20, 20);
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text('Métricas operacionais e de performance — dados reais + campos editáveis', 20, 26);

  // Base metrics
  const evasionRate = total > 0 ? Math.round((data.totalInactiveMembers / total) * 100) : 0;

  doc.setFontSize(11);
  setColor(doc, PRIMARY);
  doc.text('Indicadores da Base (Dados Reais EVO)', 20, 40);

  const kw = (pw - 55) / 3;
  kpiBox(doc, 20, 46, kw, 'Membros Ativos', formatNumber(data.totalActiveMembers), PRIMARY);
  kpiBox(doc, 20 + kw + 5, 46, kw, 'Retenção', `${data.retentionRate}%`, ACCENT);
  kpiBox(doc, 20 + (kw + 5) * 2, 46, kw, 'Evasão (Inativos)', `${evasionRate}%`, ROSE);

  // Ticket info
  kpiBox(doc, 20, 80, kw, 'Ticket Médio', `R$ ${avgTicket}`, ACCENT);
  kpiBox(doc, 20 + kw + 5, 80, kw, 'MRR Projetado', `R$ ${(mrr / 1000).toFixed(1)}k`, PRIMARY);
  kpiBox(doc, 20 + (kw + 5) * 2, 80, kw, 'Entradas Hoje', formatNumber(data.todayEntries), PRIMARY);

  // Formulas section
  doc.setFontSize(11);
  setColor(doc, PRIMARY);
  doc.text('Fórmulas de Referência', 20, 122);

  drawRect(doc, 20, 128, pw - 40, 40, LIGHT_BG, 3);
  doc.setFontSize(7.5);
  setColor(doc, TEXT_DARK);
  const fmX = 25;
  doc.text('CAC = (Investimento MKT + Investimento Vendas) ÷ Nº Clientes Adquiridos', fmX, 137);
  doc.text('LTV = Tempo Médio de Vida (1 / churn mensal) × Ticket Médio', fmX, 145);
  doc.text('LTV/CAC ≥ 3x = Saúde financeira sustentável', fmX, 153);
  doc.text('Retenção = Membros Ativos ÷ (Ativos + Inativos) × 100', fmX, 161);

  // Units ranking
  doc.setFontSize(11);
  setColor(doc, PRIMARY);
  doc.text('Ranking de Unidades por Retenção', 20, 182);

  const ranked = [...data.units]
    .map(u => {
      const ut = u.activeMembers + u.inactiveMembers;
      return { ...u, retention: ut > 0 ? Math.round((u.activeMembers / ut) * 100) : 0 };
    })
    .sort((a, b) => b.retention - a.retention);

  const rankRows = ranked.map((u, i) => [
    `#${i + 1}`,
    u.name,
    `${u.retention}%`,
    u.activeMembers.toLocaleString('pt-BR'),
    u.retention >= 80 ? 'Excelente' : u.retention >= 60 ? 'Atenção' : 'Crítico',
  ]);

  drawTable(
    doc, 188,
    ['#', 'Unidade', 'Retenção', 'Ativos', 'Status'],
    rankRows,
    [15, 55, 30, 35, 35],
  );

  // Disclaimer
  drawRect(doc, 20, 260, pw - 40, 16, [255, 251, 235], 3);
  doc.setFontSize(6.5);
  setColor(doc, [146, 64, 14]);
  doc.text('Nota: Membros ativos, inativos e retenção são dados reais da API EVO. CAC, NPS, turnover e demais', 25, 267);
  doc.text('indicadores são campos editáveis no dashboard — ajuste para refletir dados operacionais reais.', 25, 273);

  addFooter(doc, 4, totalPages, dateStr);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  doc.save(`Relatorio_Goodbe_${dateShort.replace(/\//g, '-')}.pdf`);
}
