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
    fireEvent.click(screen.getByRole('button', { name: 'Subfolder' }));
    expect(screen.queryByRole('button', { name: 'Letter' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    expect(screen.queryByRole('button', { name: 'Subfolder' })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('shows only lead sheets in lead-sheets mode and toggles line items independently from selecting its name', () => {
    const onSelect = setup('lead-sheets');
    fireEvent.click(screen.getByRole('button', { name: 'Section' }));
    expect(screen.queryByRole('button', { name: 'Checklist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subfolder' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show line items' }));
    expect(screen.getByRole('button', { name: /B\.1 Accounts Receivable \(A\/R\) · PY2:/ })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hide line items' }));
    expect(screen.queryByRole('button', { name: /· PY2:/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'B Accounts receivable' }));
    expect(onSelect).toHaveBeenCalledWith({ targetId: 'pr-ca-b', route: 'procedure/pr-ca-b', reference: 'B', name: 'Accounts receivable' });
  });
  it.each([['Letter', 'checklist/letter'], ['Checklist', 'checklist/checklist'], ['Document', 'pdf/document']])('keeps %s selectable', (name, route) => {
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
    expect(screen.getByRole('button', { name: /B\.1 Accounts Receivable \(A\/R\) · PY2:/ })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});