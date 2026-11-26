import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLastSignatureMode } from '@/lib/pdfSignature';
import { PdfSignatureDialog } from './PdfSignatureDialog';

const MOCK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

beforeEach(() => {
  setLastSignatureMode('draw');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 2,
    lineCap: 'round',
    lineJoin: 'round',
    globalCompositeOperation: 'source-over',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(MOCK_PNG);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PdfSignatureDialog', () => {
  it('disables Place signature when draw pad is empty and enables after drawing a stroke', () => {
    const onSubmit = vi.fn();
    render(
      <PdfSignatureDialog
        open
        defaultName="Venkata Ramana"
        defaultDate="2026-11-26"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const placeButton = screen.getByRole('button', { name: 'Place signature' });
    expect(placeButton).toBeDisabled();

    const pad = screen.getByLabelText('Signature drawing pad');
    fireEvent.pointerDown(pad, { clientX: 20, clientY: 50, button: 0, pointerId: 1 });
    fireEvent.pointerMove(pad, { clientX: 80, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(pad, { clientX: 80, clientY: 60, pointerId: 1 });

    expect(placeButton).not.toBeDisabled();
    fireEvent.click(placeButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      signatureMode: 'draw',
      signatureImage: MOCK_PNG,
      inkColor: '#1f2a44',
      signerName: 'Venkata Ramana',
      signerRole: 'Reviewed by',
      signedDate: '2026-11-26',
    });
  });

  it('disables Place signature in Type mode when typed text is empty and saves selected font + ink colour', () => {
    const onSubmit = vi.fn();
    render(
      <PdfSignatureDialog
        open
        defaultName="Venkata Ramana"
        defaultDate="2026-11-26"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Type' }));
    const input = screen.getByLabelText('Signature');
    const placeButton = screen.getByRole('button', { name: 'Place signature' });

    fireEvent.change(input, { target: { value: '   ' } });
    expect(placeButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'V. Ramana' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Caveat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ink colour Dark blue' }));
    expect(placeButton).not.toBeDisabled();

    fireEvent.click(placeButton);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      signatureMode: 'type',
      signatureText: 'V. Ramana',
      signatureFont: 'Caveat',
      inkColor: '#1d4ed8',
      signerName: 'Venkata Ramana',
      signerRole: 'Reviewed by',
      signedDate: '2026-11-26',
    }));
  });

  it('pre-fills legacy signature annotations when opened for editing', () => {
    render(
      <PdfSignatureDialog
        open
        editingAnnotation={{
          id: 'sig-old',
          kind: 'signature',
          page: 1,
          x: 10,
          y: 10,
          width: 24,
          height: 7,
          color: '#111827',
          signerLabel: 'Reviewed by Alex Chen',
          signedDate: '2026-11-20',
        }}
        defaultName="Venkata Ramana"
        defaultDate="2026-11-26"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Edit signature')).toBeTruthy();
    expect((screen.getByLabelText('Signature') as HTMLInputElement).value).toBe('Alex Chen');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Alex Chen');
    expect((screen.getByLabelText('Role / caption') as HTMLInputElement).value).toBe('Reviewed by');
    expect((screen.getByLabelText('Date') as HTMLInputElement).value).toBe('2026-11-20');
  });
});