import { useState, useEffect, useRef } from 'react';
import { IconMenu } from './Icons';

export default function NoteMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn" title="Más opciones" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IconMenu />
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-empty">Sin opciones todavía</div>
        </div>
      )}
    </div>
  );
}
