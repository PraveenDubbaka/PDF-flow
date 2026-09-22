import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_COUNT = 11;

/**
 * Appendix B viewer for (CA) — shows the CPA Canada
 * "FAQ for Auditors: CAS 600" (December 2022) document pages, extracted
 * from the source Word file, exactly as they appear in print.
 */
export function AppendixBFaqDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
 <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: '#E2E5EB' }}>
 <DialogTitle className="text-base">
 Appendix B — FAQ for Auditors: CAS 600 (CPA Canada, December 2022)
 </DialogTitle>
 </DialogHeader>
 <div className="max-h-[80vh] overflow-y-auto bg-muted/40 px-6 py-5 space-y-5">
 {Array.from({ length: PAGE_COUNT }, (_, i) => {
 const n = String(i + 1).padStart(2, '0');
 return (
 <img
 key={n}
 src={`${import.meta.env.BASE_URL}appendices/form410-ca-appendix-b/page-${n}.jpg`}
 alt={`Appendix B — FAQ for Auditors, page ${i + 1} of ${PAGE_COUNT}`}
 loading="lazy"
 className="w-full rounded-sm border bg-white shadow-sm"
 style={{ borderColor: '#E2E5EB' }} />
 );
 })}
 </div>
 </DialogContent>
 </Dialog>
 );
}
