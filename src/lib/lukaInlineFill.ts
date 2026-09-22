import type { RefObject } from 'react';

/**
 * Sequentially fills fields with a typing animation.
 * Each field goes through: scroll → highlight → fill → badge appears.
 */
export interface LukaFillField {
  set: () => void;
  /** Optional ref to scroll to before filling this field */
  scrollRef?: RefObject<HTMLElement>;
}

export function lukaSequentialFill(
  fields: LukaFillField[],
  onDone: () => void,
  delay = 520
) {
  let i = 0;
  function next() {
    if (i >= fields.length) { onDone(); return; }
    const field = fields[i];
    if (field.scrollRef?.current) {
      field.scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    field.set();
    i++;
    setTimeout(next, delay);
  }
  setTimeout(next, 300);
}
