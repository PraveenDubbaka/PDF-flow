import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DocumentLinkReturn() {
  const { engagementId } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnUrl = params.get('document');
  const target = params.get('target');
  const line = params.get('line');
  const [highlight, setHighlight] = useState(false);
  const valid = !location.pathname.endsWith('/trial-balance') && !!returnUrl && returnUrl.startsWith(`/engagements/${engagementId}/pdf/`) && !returnUrl.includes('..');
  useEffect(() => {
    if (!valid || !target) return;
    setHighlight(true);
    let highlighted: HTMLElement | undefined;
    const frame = requestAnimationFrame(() => {
      const element = line ? Array.from(document.querySelectorAll<HTMLElement>('[data-lead-line]')).find((item) => item.dataset.leadLine === line) : document.querySelector<HTMLElement>('.app-main');
      if (!line && element) {
        highlighted = element;
        element.classList.add('ring-2', 'ring-inset', 'ring-primary');
      }
      const column = params.get('column');
      const cell = line && element && column ? Array.from(element.querySelectorAll<HTMLElement>('[data-lead-column]')).find((item) => item.dataset.leadColumn === column) : undefined;
      (cell ?? element)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
    const clear = () => highlighted?.classList.remove('ring-2', 'ring-inset', 'ring-primary');
    const timer = setTimeout(() => { setHighlight(false); clear(); }, 3000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); clear(); };
  }, [location.pathname, target, line, valid]);
  if (!valid) return null;
  return <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2"><Button variant="secondary" onClick={() => navigate(returnUrl)}><ChevronLeft />Back to document</Button>{highlight && !line && <span className="min-w-0 max-w-full truncate rounded-[4px] bg-primary/15 px-2 py-1 text-xs text-primary ring-1 ring-primary" title={params.get('name') ?? undefined}>{params.get('name') ?? 'Linked item'}</span>}</div>;
}