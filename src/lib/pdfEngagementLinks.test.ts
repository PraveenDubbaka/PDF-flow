import { describe, expect, it } from 'vitest';
import { engagementSidebarTrees } from './engagementLinkTree';
import {
  computeProcedureTotals,
  formatProcedureChangePct,
  formatProcedureNumber,
  getAccountsForProcedure,
  PROCEDURE_AMOUNT_COLUMNS,
} from './tbGroups';
import {
  engagementLinkLabel,
  engagementLinkTooltip,
  engagementTargetPath,
  excludeProcedureHierarchy,
  formatLeadSheetAmount,
  getEngagementDocuments,
  getEngagementLinkTree,
  getEngagementMenuTree,
  getProcedureSectionTree,
  inferPdfLinkType,
  leadSheetAmount,
  leadSheetDocuments,
  leadSheetRows,
  selectEngagementTarget,
  selectLeadSheetDocument,
} from './pdfEngagementLinks';

const node = { id: 'pr-ca-b', code: 'B', label: 'Accounts receivable', route: 'procedure/pr-ca-b' };

describe('Engagement hyperlinks', () => {
  it('mirrors every top-level section from the left panel in order, including Trial Balance, procedure checklists, and attached docs', () => {
    localStorage.setItem('audit-590-wp-proc-map-AUD-audit', JSON.stringify({ 'aud-wp-a': ['gca-ws-proc-cash-grp'] }));
    localStorage.setItem('engagement-node-docs-AUD-audit', JSON.stringify({ 'aud-wp-a': [{ id: 'doc-1', name: 'Cash.pdf' }] }));
    const flatten = (nodes: ReturnType<typeof getEngagementLinkTree>): ReturnType<typeof getEngagementLinkTree> => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
    const auditTree = getEngagementLinkTree('AUD-audit');
    const sidebarTrees = engagementSidebarTrees(false);
    expect(auditTree.map((s) => `${s.code} ${s.label}`)).toEqual(sidebarTrees.auditEngagementTree.map((s) => `${s.code} ${s.label}`));
    expect(getEngagementLinkTree('COMP-demo').map((s) => `${s.code} ${s.label}`)).toEqual(sidebarTrees.engagementTree.map((s) => `${s.code} ${s.label}`));
    expect(getEngagementLinkTree('AUD-US-demo').map((s) => `${s.code} ${s.label}`)).toEqual(sidebarTrees.usAuditEngagementTree.map((s) => `${s.code} ${s.label}`));

    const nodes = flatten(auditTree);
    expect(nodes.find((node) => node.id === 'gca-ws-proc-cash-bank')?.code).toBe('A-2');
    expect(nodes.find((node) => node.id === 'doc-1')?.route).toBe('pdf/doc-1');
    expect(nodes.some((node) => node.route === 'trial-balance')).toBe(true);
    localStorage.removeItem('audit-590-wp-proc-map-AUD-audit');
    localStorage.removeItem('engagement-node-docs-AUD-audit');
  });
  it('excludes PR Procedures and all procedure lead sheets from the Engagement menu tree across all templates', () => {
    const sidebarTrees = engagementSidebarTrees(false);
    const cases = [
      { id: 'COMP-demo', source: sidebarTrees.engagementTree },
      { id: 'AUD-demo', source: sidebarTrees.auditEngagementTree },
      { id: 'AUD-US-demo', source: sidebarTrees.usAuditEngagementTree },
    ];
    const flatten = (nodes: ReturnType<typeof getEngagementMenuTree>): ReturnType<typeof getEngagementMenuTree> =>
      nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);

    for (const { id, source } of cases) {
      const menuTree = getEngagementMenuTree(id);
      expect(menuTree.map((s) => `${s.code} ${s.label}`)).toEqual(
        source.filter((s) => !(s.code === 'PR' && s.label === 'Procedures')).map((s) => `${s.code} ${s.label}`),
      );
      const allNodes = flatten(menuTree);
      expect(allNodes.some((n) => n.code === 'PR' && n.label === 'Procedures')).toBe(false);
      expect(allNodes.some((n) => n.route?.startsWith('procedure/'))).toBe(false);
    }

    // CA Audit's "PR Populate Responses" subfolder under Risk Assessment stays intact
    const caNodes = flatten(excludeProcedureHierarchy(getEngagementLinkTree('AUD-demo')));
    expect(caNodes.some((n) => n.id === 'aud-ra-respond' && n.label === 'Populate Responses')).toBe(true);
  });
  it('makes Trial Balance and completion leaf items linkable while keeping folders non-linkable', () => {
    const tbLink = selectEngagementTarget({ id: 'tb', code: 'TB', label: 'Trial Balance & Adj. Entries', icon: 'folder', route: 'trial-balance' });
    expect(tbLink).toEqual({
      targetId: 'tb',
      route: 'trial-balance',
      reference: 'TB',
      name: 'Trial Balance & Adj. Entries',
      kind: 'engagement',
    });
    if (!tbLink) throw new Error('Expected TB link');
    expect(engagementTargetPath('demo', tbLink, '/engagements/demo/pdf/doc?page=1')).toContain('/engagements/demo/trial-balance?');

    const signoffLink = selectEngagementTarget({ id: 'so-so', code: 'SO', label: 'Signoffs', icon: 'completion' });
    expect(signoffLink).toEqual({ targetId: 'so-so', route: 'checklist/so-so', reference: 'SO', name: 'Signoffs', kind: 'engagement' });
    expect(selectEngagementTarget({ id: 'do-sha', code: 'SHA', label: 'Shareholders Agreements', icon: 'folder' })).toBeNull();
  });
  it('matches the procedure lead sheet hierarchy, rows, columns, and totals with no picker-only mocks', () => {
    const procTree = getProcedureSectionTree('COMP-demo');
    expect(procTree).toHaveLength(1);
    expect(procTree[0]?.code).toBe('PR');
    expect(procTree[0]?.children?.map((group) => group.label)).toEqual(['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses']);

    for (const id of ['pr-ca-a', 'pr-ca-b', 'pr-rev-20']) {
      const expected = getAccountsForProcedure(id)?.rows ?? [];
      const actual = leadSheetRows(id);
      expect(actual).toEqual(expected);
      expect(actual.length).toBeGreaterThan(0);
      for (const row of actual) {
        for (const column of PROCEDURE_AMOUNT_COLUMNS) {
          expect(Number.isFinite(leadSheetAmount(row, column))).toBe(true);
        }
      }
      const totals = computeProcedureTotals(actual);
      expect(totals.final).toBeCloseTo(totals.original + totals.adj, 2);
    }
    expect(formatProcedureChangePct(141312.25, 100552.11)).toBe('40.54%');
  });
  it('returns only real attached documents on lead sheets (no picker-only mock documents)', () => {
    localStorage.removeItem('engagement-node-docs-demo');
    expect(leadSheetDocuments('demo', node)).toEqual([]);

    localStorage.setItem('engagement-node-docs-demo', JSON.stringify({
      'pr-ca-b': [{ id: 'real-doc-1', name: 'B-1-AR-Support.pdf' }],
    }));
    const attached = leadSheetDocuments('demo', node);
    expect(attached).toEqual([{ id: 'real-doc-1', name: 'B-1-AR-Support.pdf', route: 'pdf/real-doc-1' }]);
    const docLink = selectLeadSheetDocument(node, attached[0]);
    expect(engagementLinkLabel(docLink)).toBe('B-1-AR-Support.pdf');
    const allDocs = getEngagementDocuments('demo');
    expect(allDocs.some((item) => item.name === 'B-1-AR-Support.pdf')).toBe(true);
    localStorage.removeItem('engagement-node-docs-demo');
  });
  it('formats lead sheet amounts identically to ProcedureDetail with 2 decimals, thousands separators, and dash for empty', () => {
    expect(formatLeadSheetAmount(141312.25)).toBe('141,312.25');
    expect(formatLeadSheetAmount(-31270.49)).toBe('-31,270.49');
    expect(formatProcedureNumber(-31270.49)).toBe('-31,270.49');
    expect(formatLeadSheetAmount(0)).toBe('0.00');
    expect(formatLeadSheetAmount(null)).toBe('–');
    expect(formatLeadSheetAmount(undefined)).toBe('–');
  });
  it('does not allow empty line cells but allows zero', () => {
    const row = leadSheetRows(node.id)[0];
    expect(selectEngagementTarget(node, { ...row, py2: null }, 'PY2')).toBeNull();
    expect(selectEngagementTarget(node, { ...row, adj: 0 }, 'Adj')?.column).toBe('Adj');
    expect(selectEngagementTarget(node, { ...row, final: 141312.25 }, 'Final')?.column).toBe('Final');
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
    // Legacy PY2 column links still open cleanly
    const legacyPy2 = engagementTargetPath('demo', { ...link, lineId: '1100', column: 'PY2' }, '/engagements/demo/pdf/doc?page=3');
    expect(legacyPy2).toContain('column=PY2');
    expect(engagementTargetPath('demo', { ...link, route: 'https://example.com' }, '/')).toBeNull();
  });
});