import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PdfEditSplitButton } from './PdfEditSplitButton';

afterEach(cleanup);

const setup = () => {
  const onEdit = vi.fn();
  const onEditInWindow = vi.fn();
  render(<PdfEditSplitButton onEdit={onEdit} onEditInWindow={onEditInWindow} />);
  return { onEdit, onEditInWindow };
};

// Radix opens the menu on pointerdown/keyboard activation, not on click.
const openMenu = () => {
  const trigger = screen.getByRole('button', { name: 'More edit options' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
};

describe('Edit split button', () => {
  it('enters edit mode straight from the Edit half without opening the pop-out', () => {
    const { onEdit, onEditInWindow } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEditInWindow).not.toHaveBeenCalled();
  });

  it('opens the menu from the chevron half only, without entering edit mode', () => {
    const { onEdit } = setup();
    openMenu();
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByRole('menuitem', { name: 'Edit in Window' })).toBeTruthy();
  });

  it('opens the pop-out editor from the single menu item', () => {
    const { onEdit, onEditInWindow } = setup();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit in Window' }));
    expect(onEditInWindow).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('keeps the two halves as separate controls with a divider between them', () => {
    setup();
    const split = document.querySelector('[data-slot="split-button"]');
    expect(split?.children.length).toBe(3);
    expect(split?.children[1].getAttribute('aria-hidden')).toBe('true');
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('shows a plain Edit button when the document is already in its own window', () => {
    render(<PdfEditSplitButton onEdit={vi.fn()} onEditInWindow={vi.fn()} showWindowItem={false} />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'More edit options' })).toBeNull();
  });

  it('renders the menu with the standard surface: 1px border, 8px radius, standard shadow, popover surface', () => {
    setup();
    openMenu();
    const menu = screen.getByRole('menu');
    const cls = menu.className;
    expect(cls).toContain('border-border');
    expect(cls).toContain('border');
    expect(cls).not.toContain('border-2');
    expect(cls).toContain('rounded-[8px]');
    expect(cls).not.toContain('rounded-xl');
    expect(cls).not.toContain('rounded-lg');
    expect(cls).toContain('shadow-elevation-2');
    expect(cls).toContain('bg-popover');
    expect(cls).toContain('outline-none');
  });

  it('renders the menu item at 32px height with 8px/12px padding, 8px icon gap and 13px regular text', () => {
    setup();
    openMenu();
    const item = screen.getByRole('menuitem', { name: 'Edit in Window' });
    const cls = item.className;
    expect(cls).toContain('h-8');
    expect(cls).toContain('px-3');
    expect(cls).toContain('py-2');
    expect(cls).toContain('gap-2');
    expect(cls).toContain('text-[13px]');
    expect(cls).toContain('font-normal');
    const icon = item.querySelector('svg');
    expect(icon?.getAttribute('class')).toContain('h-4');
    expect(icon?.getAttribute('class')).toContain('w-4');
  });

  it('keeps the chevron half 28px wide with a 16px chevron', () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'More edit options' });
    expect(trigger.className).toContain('w-7');
    expect(trigger.className).toContain('[&_svg]:size-4');
  });
});
