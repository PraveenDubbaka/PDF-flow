import { engagementSidebarTrees, type SectionNode } from './engagementLinkTree';
import { TEMPLATE_CONFIG } from './engagementTemplatesData';
import { getAccountsForProcedure, type Row } from './tbGroups';
import { formatTrialBalanceAmount, type TrialBalanceColumn } from './pdfTrialBalance';

export interface PdfEngagementLink {
  targetId: string;
  route: string;
  reference: string;
  name: string;
  lineId?: string;
  column?: TrialBalanceColumn;
}

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}

export function getEngagementLinkTree(engagementId: string): SectionNode[] {
  const meta = read<{ templateId?: string; firstYearAudit?: boolean }>(`engagement-meta-${engagementId}`, {});
  const type = meta.templateId ? TEMPLATE_CONFIG[meta.templateId]?.sidebarType : undefined;
  const trees = engagementSidebarTrees(meta.firstYearAudit === true);
  const tree = type === 'audit-us' || (!type && engagementId.includes('-US-')) ? trees.usAuditEngagementTree
    : type === 'audit-ca' || (!type && engagementId.startsWith('AUD-')) ? trees.auditEngagementTree : trees.engagementTree;
  const docs = read<Record<string, { id: string; name: string; type?: string }[]>>(`engagement-node-docs-${engagementId}`, {});
  const custom = read<{ id: string; name: string; category: 'checklist' | 'letter' | 'folder'; parentId: string }[]>(`engagement-custom-sections-${engagementId}`, []);
  const attach = (node: SectionNode): SectionNode => ({ ...node, children: [
    ...(node.children ?? []).filter((child) => child.route !== 'trial-balance').map(attach),
    ...custom.filter((child) => child.parentId === node.id).map((child) => attach({ id: child.id, label: child.name, code: child.name.slice(0, 2).toUpperCase(), icon: child.category, route: child.category === 'folder' ? undefined : `checklist/${child.id}` })),
    ...(docs[node.id] ?? []).filter((doc) => doc.type !== 'note').map((doc, index) => ({ id: doc.id, label: doc.name, code: `${node.code ?? 'D'}.${index + 1}`, icon: 'doc' as const, route: `pdf/${doc.id}` })),
  ] });
  return tree.filter((node) => node.route !== 'trial-balance').map(attach);
}

// Both picker and destination read the same lead-sheet rows; links never snapshot an amount.
export function leadSheetRows(procedureId: string): Row[] {
  return getAccountsForProcedure(procedureId)?.rows ?? [];
}

export function leadSheetAmount(row: Row, column: TrialBalanceColumn) {
  return column === 'Original' ? row.original : column === 'PY1' ? row.py1 : row.py2;
}

export function selectEngagementTarget(node: SectionNode, row?: Row, column?: TrialBalanceColumn): PdfEngagementLink | null {
  if (!node.route || node.route === 'trial-balance') return null;
  if (row && (!column || leadSheetAmount(row, column) == null || !Number.isFinite(leadSheetAmount(row, column)))) return null;
  const rows = node.route.startsWith('procedure/') ? leadSheetRows(node.route.slice('procedure/'.length)) : [];
  return {
    targetId: node.id, route: node.route, reference: row ? `${node.code ?? ''}.${rows.findIndex((item) => item.id === row.id) + 1}` : node.code ?? '',
    name: row?.description ?? node.label, ...(row ? { lineId: row.id, column } : {}),
  };
}

export function engagementLinkLabel(link: PdfEngagementLink) {
  return `${link.reference ? `${link.reference} ` : ''}${link.name}${link.lineId && link.column ? ` · ${link.column}` : ''}`;
}

export function engagementLinkTooltip(link: PdfEngagementLink) {
  if (!link.lineId || !link.column) return engagementLinkLabel(link);
  const row = leadSheetRows(link.route.replace('procedure/', '')).find((item) => item.id === link.lineId);
  return `${engagementLinkLabel(link)} · ${formatTrialBalanceAmount(row ? leadSheetAmount(row, link.column) : null)}`;
}

export function engagementTargetPath(engagementId: string, link: PdfEngagementLink, returnPath: string) {
  // Stored target routes are relative to this engagement, never arbitrary navigation URLs.
  if (!/^(checklist|procedure|pdf|gca-proc)\/[^/?#]+$/.test(link.route)) return null;
  const params = new URLSearchParams({ document: returnPath, target: link.targetId, name: engagementLinkLabel(link) });
  if (link.lineId) params.set('line', link.lineId);
  if (link.column) params.set('column', link.column);
  return `/engagements/${engagementId}/${link.route}?${params}`;
}