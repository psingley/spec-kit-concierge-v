import { useEffect } from 'react';
import type React from 'react';

export const useClickOutside = (
  refs: ReadonlyArray<React.RefObject<HTMLElement>>,
  active: boolean,
  onOutside: () => void
): void => {
  useEffect(() => {
    if (!active) return undefined;
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const clickedInside = refs.some((ref) => ref.current?.contains(target) ?? false);
      if (!clickedInside) onOutside();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [active, onOutside, refs]);
};
