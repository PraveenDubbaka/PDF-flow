import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EngagementLinkPicker } from './EngagementLinkPicker';

vi.mock('@/lib/pdfEngagementLinks', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/pdfEngagementLinks')>(),
  getEngagementLinkTree: () => [{ id: 'folder', label: 'Section', icon: 'folder', route: 'checklist/not-a-target', children: [
    { id: 'subfolder', label: 'Subfolder', icon: 'folder', children: [{ id: 'letter', label: 'Letter', icon: 'letter', route: 'checklist/letter' }] },
    { id: 'pr-ca-b', code: 'B', label: 'Accounts receivable', icon: 'book', route: 'procedure/pr-ca-b' },
    { id: 'checklist', label: 'Checklist', icon: 'checklist', route: 'checklist/checklist' },
    { id: 'document', label: 'Document', icon: 'doc', route: 'pdf/document' },
  ] }],
}));

afterEach(cleanup);
const setup = (mode: 'engagement' | 'lead-sheets' = 'engagement') => {
  const onSelect = vi.fn();
  render(<TooltipProvider><EngagementLinkPicker engagementId="demo" mode={mode} onSelect={onSelect} /></TooltipProvider>);
  return onSelect;
};

describe('Engagement tree click behavior', () => {
  it('expands and collapses folders without selecting a link, even when a folder has a route', () => {
    const onSelect = setup('engagement');
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subfolder' }));
    expect(screen.getByRole('button', { name: 'Letter' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accounts receivable/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Document' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subfolder' }));
    expect(screen.queryByRole('button', { name: 'Letter' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    expect(screen.queryByRole('button', { name: 'Subfolder' })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('lists lead sheets directly in lead-sheets mode, shows reference-free rows with columns and documents, and links lines, columns, and docs', () => {
    const onSelect = setup('lead-sheets');
    expect(screen.queryByRole('button', { name: 'Checklist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subfolder' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Section' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show line items' }));
    expect(screen.getByRole('columnheader', { name: 'Account description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Original' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'PY1' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'PY2' })).toBeInTheDocument();
    expect(screen.queryByText(/B\.1/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Provision for Bad Debt · Original: \(31,270\.49\)/ })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();

    // Clicking the line item row links that whole line without a column suffix
    fireEvent.click(screen.getByRole('button', { name: 'B · Accounts Receivable (A/R)' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      targetId: 'pr-ca-b',
      route: 'procedure/pr-ca-b',
      reference: 'B',
      name: 'Accounts Receivable (A/R)',
      lineId: '1100',
    }));
    expect(onSelect.mock.calls.at(-1)?.[0]).not.toHaveProperty('column');

    // Clicking an individual amount cell links that specific column
    fireEvent.click(screen.getByRole('button', { name: /Accounts Receivable \(A\/R\) · PY2:/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      lineId: '1100',
      column: 'PY2',
    }));

    // Documents group under the lead sheet is linkable
    expect(screen.getByText('Documents')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AR Aging Summary 2025.pdf' }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({
      name: 'AR Aging Summary 2025.pdf',
      kind: 'document',
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Hide line items' }));
    expect(screen.queryByRole('button', { name: /· PY2:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'B Accounts receivable' }));
    expect(onSelect).toHaveBeenLastCalledWith({ targetId: 'pr-ca-b', route: 'procedure/pr-ca-b', reference: 'B', name: 'Accounts receivable', kind: 'lead-sheet' });
  }, 15000);
  it.each([['Letter', 'checklist/letter'], ['Checklist', 'checklist/checklist']])('keeps %s selectable in engagement mode', (name, route) => {
    const onSelect = setup('engagement');
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Subfolder' }));
    fireEvent.click(screen.getByRole('button', { name }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ route }));
  });
  it('allows line items to collapse and reopen while searching', () => {
    const onSelect = setup('lead-sheets');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Accounts receivable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hide line items' }));
    expect(screen.queryByRole('button', { name: /· PY2:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show line items' }));
    expect(screen.getByRole('button', { name: /Accounts Receivable \(A\/R\) · PY2:/ })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});