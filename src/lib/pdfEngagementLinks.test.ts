import { describe, expect, it } from 'vitest';
import { engagementSidebarTrees } from './engagementLinkTree';
import {
  engagementLinkLabel,
  engagementLinkTooltip,
  engagementTargetPath,
  formatLeadSheetAmount,
  getEngagementDocuments,
  getEngagementLinkTree,
  inferPdfLinkType,
  leadSheetAmount,
  leadSheetDocuments,
  leadSheetRows,
  selectEngagementTarget,
  selectLeadSheetDocument,
} from './pdfEngagementLinks';

const node = { id: 'pr-ca-b', code: 'B', label: 'Accounts receivable', route: 'procedure/pr-ca-b' };

describe('Engagement hyperlinks', () => {
  it('mirrors selected procedure checklists and attached documents, without Trial Balance', () => {
    localStorage.setItem('audit-590-wp-proc-map-AUD-audit', JSON.stringify({ 'aud-wp-a': ['gca-ws-proc-cash-grp'] }));
    localStorage.setItem('engagement-node-docs-AUD-audit', JSON.stringify({ 'aud-wp-a': [{ id: 'doc-1', name: 'Cash.pdf' }] }));
    const flatten = (nodes: ReturnType<typeof getEngagementLinkTree>): ReturnType<typeof getEngagementLinkTree> => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
    const nodes = flatten(getEngagementLinkTree('AUD-audit'));
    expect(nodes.find((node) => node.id === 'gca-ws-proc-cash-bank')?.code).toBe('A-2');
    expect(nodes.find((node) => node.id === 'doc-1')?.route).toBe('pdf/doc-1');
    expect(nodes.some((node) => node.route === 'trial-balance')).toBe(false);
    localStorage.removeItem('audit-590-wp-proc-map-AUD-audit');
    localStorage.removeItem('engagement-node-docs-AUD-audit');
  });
  it('keeps Trial Balance out of selectable engagement targets', () => {
    expect(selectEngagementTarget({ id: 'tb', label: 'Trial Balance', route: 'trial-balance' })).toBeNull();
  });
  it('provides two letters and two checklists in the existing engagement tree', () => {
    const onboarding = engagementSidebarTrees(false).engagementTree[0].children ?? [];
    expect(onboarding.filter((item) => item.icon === 'letter').length).toBeGreaterThanOrEqual(2);
    expect(onboarding.filter((item) => item.icon === 'checklist').length).toBeGreaterThanOrEqual(2);
  });
  it('has two lead sheets with four to six rows and all three amount columns', () => {
    for (const id of ['pr-ca-b', 'pr-rev-20']) {
      const rows = leadSheetRows(id);
      expect(rows.length).toBeGreaterThanOrEqual(4);
      expect(rows.length).toBeLessThanOrEqual(6);
      for (const row of rows) for (const column of ['Original', 'PY1', 'PY2'] as const) expect(Number.isFinite(leadSheetAmount(row, column))).toBe(true);
    }
  });
  it('provides mock documents on at least two lead sheets and includes them in engagement documents', () => {
    const bDocs = leadSheetDocuments('demo', node);
    const revDocs = leadSheetDocuments('demo', { id: 'pr-rev-20', code: '20', label: 'Revenue', route: 'procedure/pr-rev-20' });
    expect(bDocs.length).toBeGreaterThanOrEqual(1);
    expect(bDocs.length).toBeLessThanOrEqual(2);
    expect(revDocs.length).toBeGreaterThanOrEqual(1);
    expect(revDocs.length).toBeLessThanOrEqual(2);
    const docLink = selectLeadSheetDocument(node, bDocs[0]);
    expect(engagementLinkLabel(docLink)).toBe(bDocs[0].name);
    const allDocs = getEngagementDocuments('demo');
    expect(allDocs.some((item) => item.name === bDocs[0].name)).toBe(true);
  });
  it('formats lead sheet amounts with 2 decimals, thousands separators, brackets for negatives, and dash for empty', () => {
    expect(formatLeadSheetAmount(141312.25)).toBe('141,312.25');
    expect(formatLeadSheetAmount(-31270.49)).toBe('(31,270.49)');
    expect(formatLeadSheetAmount(0)).toBe('0.00');
    expect(formatLeadSheetAmount(null)).toBe('–');
    expect(formatLeadSheetAmount(undefined)).toBe('–');
  });
  it('does not allow empty line cells but allows zero', () => {
    const row = leadSheetRows(node.id)[0];
    expect(selectEngagementTarget(node, { ...row, py2: null }, 'PY2')).toBeNull();
    expect(selectEngagementTarget(node, { ...row, py2: 0 }, 'PY2')?.column).toBe('PY2');
  });
  it('stores lead sheet line and column links without line reference numbers and resolves live amounts', () => {
    const row = leadSheetRows(node.id)[0];
    const lineLink = selectEngagementTarget(node, row);
    expect(lineLink).toEqual({
      targetId: 'pr-ca-b',
      route: 'procedure/pr-ca-b',
      reference: 'B',
      name: row.description,
      kind: 'lead-sheet',
      lineId: row.id,
    });
    if (!lineLink) throw new Error('Expected line link');
    expect(engagementLinkLabel(lineLink)).toBe('B · Accounts Receivable (A/R)');

    const link = selectEngagementTarget(node, row, 'Original');
    expect(link).toEqual({
      targetId: 'pr-ca-b',
      route: 'procedure/pr-ca-b',
      reference: 'B',
      name: row.description,
      kind: 'lead-sheet',
      lineId: row.id,
      column: 'Original',
    });
    if (!link) throw new Error('Expected column link');
    expect(engagementLinkLabel(link)).toBe('B · Accounts Receivable (A/R) · Original');
    expect(engagementLinkTooltip(link)).toBe('B · Accounts Receivable (A/R) · Original · 141,312.25');
    row.original = 237307.23;
    expect(engagementLinkTooltip(link)).toBe('B · Accounts Receivable (A/R) · Original · 237,307.23');
    row.original = 141312.25;
  });
  it('infers all five link types for both new and legacy saved links', () => {
    expect(inferPdfLinkType({ kind: 'link' })).toBe('web');
    expect(inferPdfLinkType({ kind: 'link', engagementLink: { targetId: 'd1', route: 'pdf/d1', reference: '', name: 'Doc.pdf' } })).toBe('document');
    expect(inferPdfLinkType({ kind: 'link', engagementLink: { targetId: 'co-el', route: 'checklist/co-el', reference: 'AL1.1', name: 'Engagement Letter' } })).toBe('engagement');
    expect(inferPdfLinkType({ kind: 'trial-balance', engagementLink: { targetId: 'pr-ca-b', route: 'procedure/pr-ca-b', reference: 'B', name: 'Accounts receivable' } })).toBe('lead-sheet');
    expect(inferPdfLinkType({ kind: 'trial-balance', trialBalanceGeneral: true })).toBe('trial-balance');
  });
  it('opens the target with same-document return information and rejects external routes', () => {
    const link = selectEngagementTarget(node);
    if (!link) throw new Error('Expected lead sheet');
    const target = engagementTargetPath('demo', link, '/engagements/demo/pdf/doc?page=3');
    expect(target).toContain('/engagements/demo/procedure/pr-ca-b?');
    const params = new URLSearchParams(target?.split('?')[1]);
    expect(params.get('document')).toBe('/engagements/demo/pdf/doc?page=3');
    expect(engagementTargetPath('demo', { ...link, route: 'https://example.com' }, '/')).toBeNull();
  });
});