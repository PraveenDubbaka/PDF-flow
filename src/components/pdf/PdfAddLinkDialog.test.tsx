import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PdfAddLinkDialog } from './PdfAddLinkDialog';

const ACCOUNTS = [
  { accNo: '1010', description: 'Cash & Bank', balance: 1240000, py1: 237307.23, py2: 975000 },
  { accNo: '1100', description: 'Accounts Receivable', balance: 141312.25, py1: null, py2: 90496.9 },
];

beforeEach(() => {
  sessionStorage.clear();
  // Radix Select uses scrollIntoView/hasPointerCapture in jsdom
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(cleanup);

function renderDialog(overrides?: Partial<React.ComponentProps<typeof PdfAddLinkDialog>>) {
  const props: React.ComponentProps<typeof PdfAddLinkDialog> = {
    open: true,
    engagementId: 'AUD-demo',
    trialBalanceAccounts: ACCOUNTS,
    selectedTbCell: null,
    onClose: vi.fn(),
    onSelectWebUrl: vi.fn(),
    onSelectEngagementLink: vi.fn(),
    onSelectTrialBalanceGeneral: vi.fn(),
    onSelectTrialBalanceAccount: vi.fn(),
    ...overrides,
  };
  const view = render(
    <TooltipProvider>
      <PdfAddLinkDialog {...props} />
    </TooltipProvider>,
  );
  return { ...view, props };
}

function chooseLinkType(label: string) {
  fireEvent.click(screen.getByRole('combobox', { name: 'Link type' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
}

describe('PdfAddLinkDialog consolidated link picker', () => {
  it('switches across Web URL, Document, and Engagement types and remembers the last-used type in the session', () => {
    const { rerender, props } = renderDialog();

    // Default: Web URL
    expect(screen.getByRole('combobox', { name: 'Link type' })).toHaveTextContent('Web URL');
    fireEvent.change(screen.getByLabelText('Web URL'), { target: { value: 'https://countable.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add link' }));
    expect(props.onSelectWebUrl).toHaveBeenCalledWith('https://countable.co');

    // Document type: searchable list of documents
    chooseLinkType('Document');
    const docSearch = screen.getByRole('textbox', { name: 'Search documents' });
    fireEvent.change(docSearch, { target: { value: 'Balance Sheet' } });
    fireEvent.click(screen.getByRole('button', { name: /Balance Sheet/ }));
    expect(props.onSelectEngagementLink).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Balance Sheet', kind: 'document' }),
      'Balance Sheet',
    );

    // Engagement type: left-panel engagement tree without PR Procedures
    chooseLinkType('Engagement');
    expect(screen.getByPlaceholderText('Search engagement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CO Client Onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DO Documents' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TB Trial Balance & Adjusting Entries' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PR Procedures' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FS Financial Statements' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SO Completion & Signoffs' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Client Onboarding/ }));
    expect(screen.getByRole('button', { name: /Engagement Letter/ })).toBeInTheDocument();

    // Reopening the dialog remembers "Engagement" from sessionStorage
    rerender(<TooltipProvider><PdfAddLinkDialog {...props} open={false} /></TooltipProvider>);
    rerender(<TooltipProvider><PdfAddLinkDialog {...props} open={true} /></TooltipProvider>);
    expect(screen.getByRole('combobox', { name: 'Link type' })).toHaveTextContent('Engagement');
  }, 15000);

  it('supports Lead sheet procedure table with PR hierarchy, attached documents, and Trial balance targets', () => {
    localStorage.setItem('engagement-node-docs-AUD-demo', JSON.stringify({
      'aud-wp-b': [{ id: 'doc-ar-1', name: 'B-1-AR-Support.pdf' }],
    }));
    const { props } = renderDialog();

    // Lead sheet type: PR Procedures hierarchy + procedure lead sheet columns + real attached docs
    chooseLinkType('Lead sheet');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search lead sheets' }), { target: { value: 'Accounts receivable' } });
    expect(screen.getByRole('columnheader', { name: 'Acc No.' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Adj' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Final' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Change(%)' })).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B-1-AR-Support.pdf' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'B · Accounts Receivable (A/R)' }));
    expect(props.onSelectEngagementLink).toHaveBeenLastCalledWith(
      expect.objectContaining({ reference: 'B', name: 'Accounts Receivable (A/R)', lineId: '1100' }),
      'B · Accounts Receivable (A/R)',
    );
    localStorage.removeItem('engagement-node-docs-AUD-demo');

    // Trial balance type: general + Original/PY1/PY2 accounts
    chooseLinkType('Trial balance');
    expect(screen.getByRole('button', { name: 'Trial Balance (general)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /1010 Cash & Bank · PY1: 237,307\.23/ }));
    expect(props.onSelectTrialBalanceAccount).toHaveBeenCalledWith(ACCOUNTS[0], 'PY1');
  }, 15000);

  it('keeps identical fixed width and height classes across all five link types, expansions, and empty searches', () => {
    renderDialog();
    const expectedSizeClasses = [
      'w-[840px]',
      'max-w-[calc(100vw-32px)]',
      'h-[640px]',
      'max-h-[calc(100dvh-32px)]',
    ];
    const assertDialogFixed = () => {
      const dialog = screen.getByRole('dialog');
      for (const cls of expectedSizeClasses) {
        expect(dialog.className).toContain(cls);
      }
      return dialog.className;
    };

    const baseline = assertDialogFixed(); // Web URL

    chooseLinkType('Document');
    expect(assertDialogFixed()).toBe(baseline);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search documents' }), { target: { value: 'zzzz-no-match' } });
    expect(screen.getByText('No documents found')).toBeInTheDocument();
    expect(assertDialogFixed()).toBe(baseline);

    chooseLinkType('Engagement');
    expect(assertDialogFixed()).toBe(baseline);
    expect(screen.queryByRole('button', { name: 'PR Procedures' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CO Client Onboarding' }));
    expect(assertDialogFixed()).toBe(baseline);
    fireEvent.click(screen.getByRole('button', { name: 'CO Client Onboarding' }));
    expect(assertDialogFixed()).toBe(baseline);

    chooseLinkType('Lead sheet');
    expect(assertDialogFixed()).toBe(baseline);
    fireEvent.click(screen.getByRole('button', { name: 'Assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Current assets' }));
    expect(assertDialogFixed()).toBe(baseline);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search lead sheets' }), { target: { value: 'zzzz-no-match' } });
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(assertDialogFixed()).toBe(baseline);

    chooseLinkType('Trial balance');
    expect(assertDialogFixed()).toBe(baseline);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search trial balance accounts' }), { target: { value: 'zzzz-no-match' } });
    expect(screen.getByText('No accounts found')).toBeInTheDocument();
    expect(assertDialogFixed()).toBe(baseline);
  }, 15000);
});