import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLastSignatureMode } from '@/lib/pdfSignature';
import { MAX_SIGNATURE_UPLOAD_BYTES } from '@/lib/pdfSignatureUpload';
import { PdfSignatureDialog } from './PdfSignatureDialog';

const MOCK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

beforeEach(() => {
  setLastSignatureMode('draw');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255, 10, 20, 40, 255]) })),
    putImageData: vi.fn(),
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

    const typeTab = screen.getByRole('tab', { name: 'Type' });
    fireEvent.mouseDown(typeTab, { button: 0 });
    fireEvent.click(typeTab);
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

  it('supports Upload mode with file validation, preview, Remove, and upload submission', async () => {
    const OriginalImage = globalThis.Image;
    class MockImage {
      naturalWidth = 120;
      naturalHeight = 40;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    try {
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

      const uploadTab = screen.getByRole('tab', { name: 'Upload' });
      fireEvent.mouseDown(uploadTab, { button: 0 });
      fireEvent.click(uploadTab);
      const placeButton = screen.getByRole('button', { name: 'Place signature' });
      expect(placeButton).toBeDisabled();

      const input = screen.getByLabelText('Upload signature image') as HTMLInputElement;

      // Wrong file type -> inline error
      const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      fireEvent.change(input, { target: { files: [badFile] } });
      expect(screen.getByRole('alert').textContent).toMatch(/PNG, JPG, or SVG/i);
      expect(placeButton).toBeDisabled();

      // Oversized file -> inline error
      const bigFile = new File([new Uint8Array(MAX_SIGNATURE_UPLOAD_BYTES + 10)], 'huge.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [bigFile] } });
      expect(screen.getByRole('alert').textContent).toMatch(/2 MB/i);
      expect(placeButton).toBeDisabled();

      // Valid PNG -> enables Place signature and submits upload mode
      const goodFile = new File([new Uint8Array([137, 80, 78, 71])], 'sig.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [goodFile] } });

      await waitFor(() => expect(placeButton).not.toBeDisabled());
      expect(screen.getByAltText('Uploaded signature preview')).toBeTruthy();
      expect(screen.getByLabelText('Remove background')).toBeTruthy();

      // Remove disables Place signature again
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(placeButton).toBeDisabled();

      // Re-upload and submit
      fireEvent.change(input, { target: { files: [goodFile] } });
      await waitFor(() => expect(placeButton).not.toBeDisabled());

      fireEvent.click(placeButton);
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        signatureMode: 'upload',
        signatureImage: MOCK_PNG,
        signerName: 'Venkata Ramana',
        signerRole: 'Reviewed by',
        signedDate: '2026-11-26',
      }));
    } finally {
      globalThis.Image = OriginalImage;
    }
  });
});