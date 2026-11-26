import { Eye } from 'lucide-react';
import { ExpandableIconButton } from '@/components/ui/expandable-icon-button';
import type { EngagementPreviewTarget } from '@/lib/engagementDocumentPreview';

export function EngagementDocumentPreviewTrigger({
  target,
  onOpen,
}: {
  target: EngagementPreviewTarget | null;
  onOpen: () => void;
}) {
  if (!target) return null;
  return <ExpandableIconButton variant="secondary" icon={<Eye className="h-4 w-4" />} label="Preview" size="sm" onClick={onOpen} />;
}