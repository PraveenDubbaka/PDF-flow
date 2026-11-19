import { describe, expect, it } from 'vitest';
import { engagementSidebarTrees } from './engagementLinkTree';
import { getEngagementLinkTree, leadSheetRows, leadSheetAmount, selectEngagementTarget, engagementLinkLabel, engagementLinkTooltip, engagementTargetPath } from './pdfEngagementLinks';

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
  it('does not allow empty line cells but allows zero', () => {
    const row = leadSheetRows(node.id)[0];
    expect(selectEngagementTarget(node, { ...row, py2: null }, 'PY2')).toBeNull();
    expect(selectEngagementTarget(node, { ...row, py2: 0 }, 'PY2')?.column).toBe('PY2');
  });
  it('stores line identity and column, never the amount; suffixes Original line links too', () => {
    const row = leadSheetRows(node.id)[0];
    const link = selectEngagementTarget(node, row, 'Original');
    expect(link).toEqual({ targetId: 'pr-ca-b', route: 'procedure/pr-ca-b', reference: 'B.1', name: row.description, lineId: row.id, column: 'Original' });
    if (!link) throw new Error('Expected line link');
    expect(engagementLinkLabel(link)).toBe('B.1 Accounts Receivable (A/R) · Original');
    expect(engagementLinkTooltip(link)).toBe('B.1 Accounts Receivable (A/R) · Original · 141,312.25');
    row.original = 237307.23;
    expect(engagementLinkTooltip(link)).toBe('B.1 Accounts Receivable (A/R) · Original · 237,307.23');
    row.original = 141312.25;
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