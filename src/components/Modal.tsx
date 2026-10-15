import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'alert';
  /** Bloque la fermeture par Échap ou clic extérieur (consentement). */
  dismissible?: boolean;
  zIndex?: number;
}

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-5xl' };

/**
 * Fenêtre modale accessible : feuille montante sur mobile, panneau centré sur ordinateur.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = 'md',
  tone = 'default',
  dismissible = true,
  zIndex = 50,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const timer = setTimeout(() => panelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 flex items-end sm:items-center justify-center sm:p-6" style={{ zIndex }}>
          <motion.div
            className={`absolute inset-0 ${tone === 'alert' ? 'bg-[#3a0d0a]/70' : 'bg-ink/45'} backdrop-blur-[3px]`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissible && onClose?.()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative w-full ${WIDTHS[size]} max-h-[92dvh] sm:max-h-[86vh] flex flex-col bg-paper text-ink rounded-t-3xl sm:rounded-3xl shadow-[0_24px_60px_-20px_rgba(23,26,51,0.45)] outline-none ${
              tone === 'alert' ? 'ring-2 ring-alert/60' : ''
            }`}
          >
            <header className="flex items-start gap-3 px-6 pt-6 pb-4 sm:px-8 sm:pt-7">
              {icon && <div className="mt-1 shrink-0">{icon}</div>}
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className={`text-2xl ${tone === 'alert' ? 'text-alert' : 'text-ink'}`}>
                  {title}
                </h2>
                {description && <p className="mt-1.5 text-sm text-ink-soft">{description}</p>}
              </div>
              {dismissible && onClose && (
                <button onClick={onClose} className="btn btn-quiet w-10 h-10 -mr-2 -mt-1 shrink-0" aria-label="Fermer">
                  <X className="w-5 h-5" />
                </button>
              )}
            </header>
            <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8">{children}</div>
            {footer && (
              <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-6 py-4 sm:px-8 border-t border-line pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
