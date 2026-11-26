import { fireEvent, render, screen, cleanup, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { engagementSidebarTrees } from '@/lib/engagementLinkTree';
import { computeProcedureTotals, formatProcedureChangePct, formatProcedureNumber, getAccountsForProcedure } from '@/lib/tbGroups';
import { EngagementLinkPicker } from './EngagementLinkPicker';

afterEach(() => {
  cleanup();
  localStorage.removeItem('engagement-node-docs-COMP-demo');
  localStorage.removeItem('engagement-node-docs-AUD-demo');
});

const setup = (mode: 'engagement' | 'lead-sheets' = 'engagement', engagementId = 'COMP-demo') => {
  const onSelect = vi.fn();
  render(<TooltipProvider><EngagementLinkPicker engagementId={engagementId} mode={mode} onSelect={onSelect} /></TooltipProvider>);
  return onSelect;
};

describe('Engagement and Lead sheet link pickers', () => {
  it('shows every non-Procedures left-panel section in order in Engagement mode and excludes PR Procedures from tree and search', () => {
    const onSelect = setup('engagement', 'COMP-demo');
    expect(screen.getByPlaceholderText('Search engagement')).toBeInTheDocument();
    const expectedSections = engagementSidebarTrees(false).engagementTree.filter(
      (section) => !(section.code === 'PR' && section.label === 'Procedures'),
    );
    for (const section of expectedSections) {
      expect(screen.getByRole('button', { name: `${section.code} ${section.label}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'PR Procedures' })).not.toBeInTheDocument();

    // Folders expand/collapse without selecting a link
    fireEvent.click(screen.getByRole('button', { name: 'CO Client Onboarding' }));
    expect(screen.getByRole('button', { name: 'AL1.1 Engagement Letter' })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'CO Client Onboarding' }));
    expect(screen.queryByRole('button', { name: 'AL1.1 Engagement Letter' })).not.toBeInTheDocument();

    // TB Trial Balance & Adj. Entries is linkable directly
    fireEvent.click(screen.getByRole('button', { name: 'TB Trial Balance & Adj. Entries' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ route: 'trial-balance', reference: 'TB' }));

    // FS Financial Statements and SO Completion & Signoffs expand to linkable leaves
    fireEvent.click(screen.getByRole('button', { name: 'FS Financial Statements' }));
    fireEvent.click(screen.getByRole('button', { name: 'FS Financial Statements Docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Balance Sheet' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ route: 'checklist/fs-bs', name: 'Balance Sheet' }));

    fireEvent.click(screen.getByRole('button', { name: 'SO Completion & Signoffs' }));
    fireEvent.click(screen.getByRole('button', { name: 'SO Signoffs' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ route: 'checklist/so-so', reference: 'SO' }));

    // Search under Engagement never returns procedure groups, lead sheets, or line items
    const searchInput = screen.getByPlaceholderText('Search engagement');
    for (const term of ['Procedures', 'Current assets', 'Accounts receivable', '1100']) {
      fireEvent.change(searchInput, { target: { value: term } });
      expect(screen.getByText('No results')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    }
  });

  it('matches the procedure lead sheet hierarchy, rows, columns, totals, and real attached docs for multiple lead sheets', () => {
    localStorage.setItem('engagement-node-docs-COMP-demo', JSON.stringify({
      'pr-ca-b': [{ id: 'doc-b-1', name: 'B-1-AR-Aging.pdf' }],
    }));
    const onSelect = setup('lead-sheets', 'COMP-demo');

    // PR Procedures hierarchy is preserved (expanded to Assets / Liabilities / Equity / Revenue / Expenses)
    expect(screen.getByRole('button', { name: 'PR Procedures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assets' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CO Client Onboarding' })).not.toBeInTheDocument();

    // Expand Assets -> Current assets -> A Cash and cash equivalents & B Accounts receivable
    fireEvent.click(screen.getByRole('button', { name: 'Assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Current assets' }));

    const cashRow = screen.getByRole('button', { name: 'A Cash and cash equivalents' }).parentElement!;
    fireEvent.click(within(cashRow).getByRole('button', { name: 'Show line items' }));
    const arRow = screen.getByRole('button', { name: 'B Accounts receivable' }).parentElement!;
    fireEvent.click(within(arRow).getByRole('button', { name: 'Show line items' }));

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);

    // Verify every column header, row, amount, Change(%), and Total matches ProcedureDetail's source for both A and B
    for (const [index, procedureId] of (['pr-ca-a', 'pr-ca-b'] as const).entries()) {
      const expectedRows = getAccountsForProcedure(procedureId)!.rows;
      const table = tables[index]!;
      const headers = within(table).getAllByRole('columnheader').map((el) => el.textContent);
      expect(headers).toEqual(['Acc No.', 'Description', 'Original', 'Adj', 'Final', 'PY1', 'Change(%)']);
      const bodyRows = table.querySelectorAll('tbody tr');
      expect(bodyRows).toHaveLength(expectedRows.length);
      expectedRows.forEach((row, rowIndex) => {
        const tr = bodyRows[rowIndex]!;
        expect(tr.textContent).toContain(row.accNo);
        expect(tr.textContent).toContain(row.description);
        expect(tr.textContent).toContain(formatProcedureNumber(row.original));
        expect(tr.textContent).toContain(formatProcedureNumber(row.adj));
        expect(tr.textContent).toContain(formatProcedureNumber(row.final));
        expect(tr.textContent).toContain(formatProcedureNumber(row.py1));
        expect(tr.textContent).toContain(formatProcedureChangePct(row.final, row.py1));
      });
      const totals = computeProcedureTotals(expectedRows);
      const footText = table.querySelector('tfoot')?.textContent ?? '';
      expect(footText).toContain('Total');
      expect(footText).toContain(formatProcedureNumber(totals.original));
      expect(footText).toContain(formatProcedureNumber(totals.final));
      expect(footText).toContain(formatProcedureNumber(totals.py1));
    }

    // Clicking a line links that whole line; clicking an amount cell links that column
    fireEvent.click(screen.getByRole('button', { name: 'B · Accounts Receivable (A/R)' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      targetId: 'pr-ca-b',
      route: 'procedure/pr-ca-b',
      reference: 'B',
      name: 'Accounts Receivable (A/R)',
      lineId: '1100',
    }));
    expect(onSelect.mock.calls.at(-1)?.[0]).not.toHaveProperty('column');

    fireEvent.click(screen.getByRole('button', { name: 'Accounts Receivable (A/R) · Final: 141,312.25' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      lineId: '1100',
      column: 'Final',
    }));

    // Real attached document under B is linkable (and no fake mock docs appear under A)
    expect(screen.queryByRole('button', { name: 'Bank Confirmation - RBC 2025.pdf' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'B-1-AR-Aging.pdf' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      name: 'B-1-AR-Aging.pdf',
      kind: 'document',
      route: 'pdf/doc-b-1',
    }));
  }, 15000);

  it('allows collapsing and re-expanding lead-sheet line items while searching in Lead sheet mode', () => {
    const onSelect = setup('lead-sheets', 'AUD-demo');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search lead sheets' }), { target: { value: 'Accounts receivable' } });
    expect(screen.getByRole('columnheader', { name: 'Acc No.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Change(%)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide line items' }));
    expect(screen.queryByRole('columnheader', { name: 'Change(%)' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show line items' }));
    expect(screen.getByRole('button', { name: 'Accounts Receivable (A/R) · PY1: 100,552.11' })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});