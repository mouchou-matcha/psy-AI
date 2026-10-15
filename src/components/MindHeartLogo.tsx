import React from 'react';

/** Emblème de Marie : deux lignes de souffle concentriques. */
export const MindHeartLogo = ({ className = 'w-6 h-6', ...props }: React.SVGAttributes<SVGSVGElement>) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className} {...props}>
    <path
      d="M16 3.5c7.2 0 12.5 5.6 12.5 12.6 0 6.9-5.6 12.4-12.6 12.4C9 28.5 3.5 23 3.5 16 3.5 8.8 8.9 3.5 16 3.5Z"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M16.2 9.5c3.7 0 6.3 2.9 6.3 6.6 0 3.6-2.8 6.4-6.5 6.4-3.6 0-6.5-2.9-6.5-6.5 0-3.8 2.9-6.5 6.7-6.5Z"
      stroke="#e39a5f"
      strokeWidth="2"
    />
  </svg>
);

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <MindHeartLogo className="w-7 h-7 text-ink" />
      <span className="font-serif text-xl font-medium tracking-tight text-ink">Marie</span>
    </span>
  );
}
