import { engagementSidebarTrees, type SectionNode } from './engagementLinkTree';
import { TEMPLATE_CONFIG } from './engagementTemplatesData';
import { getAccountsForProcedure, PROCEDURE_LS_MAP, type Row } from './tbGroups';
import { type TrialBalanceColumn } from './pdfTrialBalance';
import { initialGlobalWorksheets, type WorksheetTemplate } from '@/data/globalWorksheets';

export type PdfLinkType = 'web' | 'document' | 'engagement' | 'lead-sheet' | 'trial-balance';

export interface PdfEngagementLink {
  targetId: string;
  route: string;
  reference: string;
  name: string;
  lineId?: string;
  column?: TrialBalanceColumn;
  kind?: 'document' | 'engagement' | 'lead-sheet';
  documentId?: string;
  leadSheetRef?: string;
}

export interface LeadSheetDocument {
  id: string;
  name: string;
  route: string;
}

export interface EngagementDocumentItem {
  id: string;
  name: string;
  section: string;
  link: PdfEngagementLink;
}

const MOCK_LEAD_SHEET_DOCUMENTS: Record<string, { id: string; name: string }[]> = {
  A: [
    { id: 'ls-doc-a-1', name: 'Bank Confirmation - RBC 2025.pdf' },
    { id: 'ls-doc-a-2', name: 'Year-End Bank Reconciliation.xlsx' },
  ],
  B: [
    { id: 'ls-doc-b-1', name: 'AR Aging Summary 2025.pdf' },
    { id: 'ls-doc-b-2', name: 'Subsequent Cash Receipts Testing.xlsx' },
  ],
  BB: [
    { id: 'ls-doc-bb-1', name: 'AP Subledger Listing 2025.pdf' },
    { id: 'ls-doc-bb-2', name: 'Search for Unrecorded Liabilities.xlsx' },
  ],
  '20': [
    { id: 'ls-doc-20-1', name: 'Revenue Cutoff Sample Support.pdf' },
    { id: 'ls-doc-20-2', name: 'Deferred Revenue Rollforward.xlsx' },
  ],
};

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
  const procedureMap = read<Record<string, string[]>>(`audit-590-wp-proc-map-${engagementId}`, {});
  const findWorksheet = (nodes: WorksheetTemplate[], id: string): WorksheetTemplate | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findWorksheet(node.children ?? [], id);
      if (found) return found;
    }
  };
  const procedureChildren = (node: SectionNode): SectionNode[] => {
    if (!node.id.startsWith('aud-wp-')) return [];
    const selected = (procedureMap[node.id] ?? []).flatMap((id) => {
      const item = findWorksheet(initialGlobalWorksheets, id);
      return item ? item.type === 'folder' ? item.children ?? [] : [item] : [];
    });
    return selected.filter((item, index) => selected.findIndex((other) => other.id === item.id) === index).map((item, index) => ({ id: item.id, code: `${node.code}-${index + 1}`, label: item.name, icon: 'worksheet', route: `gca-proc/${item.id}` }));
  };
  const attach = (node: SectionNode): SectionNode => ({ ...node, children: [
    ...(node.children ?? []).filter((child) => child.route !== 'trial-balance').map(attach),
    ...procedureChildren(node).map(attach),
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

export function formatLeadSheetAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '–';
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `(${formatted})` : formatted;
}

export function leadSheetDocuments(engagementId: string, node: SectionNode): LeadSheetDocument[] {
  const route = node.route ?? '';
  const procedureId = route.startsWith('procedure/') ? route.slice('procedure/'.length) : node.id;
  const lsCode = PROCEDURE_LS_MAP[procedureId] ?? node.code ?? '';
  const storedDocs = read<Record<string, { id: string; name: string; type?: string }[]>>(`engagement-node-docs-${engagementId}`, {});
  const uploaded: LeadSheetDocument[] = (storedDocs[node.id] ?? [])
    .filter((doc) => doc.type !== 'note')
    .map((doc) => ({ id: doc.id, name: doc.name, route: `pdf/${doc.id}` }));
  const mocks: LeadSheetDocument[] = (MOCK_LEAD_SHEET_DOCUMENTS[lsCode] ?? [])
    .filter((mock) => !uploaded.some((doc) => doc.id === mock.id))
    .map((mock) => ({ id: mock.id, name: mock.name, route: route || `procedure/${procedureId}` }));
  return [...uploaded, ...mocks];
}

export function getLeadSheetNodes(engagementId: string): SectionNode[] {
  const result: SectionNode[] = [];
  const walk = (nodes: SectionNode[]) => {
    for (const node of nodes) {
      if (node.route?.startsWith('procedure/')) result.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(getEngagementLinkTree(engagementId));
  return result;
}

export function getEngagementDocuments(engagementId: string): EngagementDocumentItem[] {
  const items: EngagementDocumentItem[] = [];
  const seen = new Set<string>();
  const walk = (nodes: SectionNode[], section: string) => {
    for (const node of nodes) {
      if (node.route && (node.icon === 'doc' || node.route.startsWith('pdf/'))) {
        if (!seen.has(node.id)) {
          seen.add(node.id);
          items.push({
            id: node.id,
            name: node.label,
            section,
            link: { targetId: node.id, route: node.route, reference: '', name: node.label, kind: 'document', documentId: node.id },
          });
        }
      }
      if (node.route?.startsWith('procedure/')) {
        for (const doc of leadSheetDocuments(engagementId, node)) {
          if (!seen.has(doc.id)) {
            seen.add(doc.id);
            items.push({
              id: doc.id,
              name: doc.name,
              section: `${node.code ? `${node.code} ` : ''}${node.label}`,
              link: selectLeadSheetDocument(node, doc),
            });
          }
        }
      }
      if (node.children?.length) walk(node.children, node.label || section);
    }
  };
  walk(getEngagementLinkTree(engagementId), 'Documents');
  return items;
}

export function selectLeadSheetDocument(node: SectionNode, doc: LeadSheetDocument): PdfEngagementLink {
  return {
    targetId: doc.id,
    route: doc.route,
    reference: '',
    name: doc.name,
    kind: 'document',
    documentId: doc.id,
    ...(node.code ? { leadSheetRef: node.code } : {}),
  };
}

export function selectEngagementTarget(node: SectionNode, row?: Row, column?: TrialBalanceColumn): PdfEngagementLink | null {
  if (!node.route || node.route === 'trial-balance') return null;
  if (row && column) {
    const amount = leadSheetAmount(row, column);
    if (amount == null || !Number.isFinite(amount)) return null;
  }
  const isDoc = node.icon === 'doc' || node.route.startsWith('pdf/');
  const isLeadSheet = node.route.startsWith('procedure/');
  return {
    targetId: node.id,
    route: node.route,
    reference: isDoc ? '' : (node.code ?? ''),
    name: row?.description ?? node.label,
    kind: isDoc ? 'document' : isLeadSheet ? 'lead-sheet' : 'engagement',
    ...(isDoc ? { documentId: node.id } : {}),
    ...(row ? { lineId: row.id, ...(column ? { column } : {}) } : {}),
  };
}

export function inferPdfLinkType(item: {
  kind: string;
  trialBalanceLink?: unknown;
  trialBalanceGeneral?: boolean;
  engagementLink?: PdfEngagementLink;
}): PdfLinkType {
  if (item.trialBalanceLink || item.trialBalanceGeneral || (item.kind === 'trial-balance' && !item.engagementLink)) {
    return 'trial-balance';
  }
  const eng = item.engagementLink;
  if (eng) {
    if (eng.kind === 'document' || eng.documentId || eng.route.startsWith('pdf/') || /-fs-/.test(eng.route)) return 'document';
    if (eng.kind === 'lead-sheet' || eng.route.startsWith('procedure/')) return 'lead-sheet';
    return 'engagement';
  }
  return 'web';
}

export function engagementLinkLabel(link: PdfEngagementLink) {
  if (link.kind === 'document' || link.documentId || link.route.startsWith('pdf/')) {
    return link.name;
  }
  if (link.lineId) {
    return `${link.reference ? `${link.reference} · ` : ''}${link.name}${link.column ? ` · ${link.column}` : ''}`;
  }
  return `${link.reference ? `${link.reference} ` : ''}${link.name}`;
}

export function engagementLinkTooltip(link: PdfEngagementLink) {
  if (link.kind === 'document' || link.documentId || link.route.startsWith('pdf/')) {
    return link.leadSheetRef ? `${link.leadSheetRef} · ${link.name}` : link.name;
  }
  if (link.lineId) {
    const row = leadSheetRows(link.route.replace('procedure/', '')).find((item) => item.id === link.lineId);
    if (link.column) {
      return `${engagementLinkLabel(link)} · ${formatLeadSheetAmount(row ? leadSheetAmount(row, link.column) : null)}`;
    }
    return row ? `${engagementLinkLabel(link)} · Original ${formatLeadSheetAmount(row.original)}` : engagementLinkLabel(link);
  }
  return engagementLinkLabel(link);
}

export function engagementTargetPath(engagementId: string, link: PdfEngagementLink, returnPath: string) {
  // Stored target routes are relative to this engagement, never arbitrary navigation URLs.
  if (!/^(checklist|procedure|pdf|gca-proc)\/[^/?#]+$/.test(link.route)) return null;
  const params = new URLSearchParams({ document: returnPath, target: link.targetId, name: engagementLinkLabel(link) });
  if (link.lineId) params.set('line', link.lineId);
  if (link.column) params.set('column', link.column);
  if (link.documentId) params.set('doc', link.documentId);
  return `/engagements/${engagementId}/${link.route}?${params}`;
}