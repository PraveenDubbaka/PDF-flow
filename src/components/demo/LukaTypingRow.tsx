import { useEffect, useState } from 'react';
import { LukaIcon } from '@/components/LukaIcon';

interface LukaTypingRowProps {
  /** True once lukaFilledPending or lukaFilledFields contains this row's id */
  filled: boolean;
  children: React.ReactNode;
}

export function LukaTypingRow({ filled, children }: LukaTypingRowProps) {
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (!filled) return;
    setShowTyping(true);
    const t = setTimeout(() => setShowTyping(false), 320);
    return () => clearTimeout(t);
  }, [filled]);

  if (showTyping) {
    return (
      <div className="flex items-center gap-1.5 px-1 py-1 animate-pulse">
        <LukaIcon size={12} bare animated />
        <span className="text-xs text-violet-500 font-medium">Luka is drafting…</span>
      </div>
    );
  }

  return <>{children}</>;
}
