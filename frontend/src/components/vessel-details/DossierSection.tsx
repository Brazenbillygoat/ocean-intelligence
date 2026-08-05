import type { ReactNode } from "react";

interface DossierSectionProps {
  id: string;
  title: string;
  label: string;
  count?: number;
  // initialOpen sets the open attribute once on mount. It is a stable default
  // rather than a controlled value, so native toggles persist for the panel
  // session and reset only when the panel unmounts.
  initialOpen?: boolean;
  children: ReactNode;
}

export function DossierSection({
  id,
  title,
  label,
  count,
  initialOpen,
  children,
}: DossierSectionProps) {
  return (
    <details className="dossier-section" open={initialOpen}>
      <summary>
        <span className="dossier-section__indicator" aria-hidden="true" />
        <span className="dossier-section__title" id={`${id}-heading`}>
          {title}
          {count !== undefined && (
            <span className="dossier-section__count">{count.toLocaleString()}</span>
          )}
        </span>
        <span className="dossier-badge">{label}</span>
      </summary>
      <div className="dossier-section__content" aria-labelledby={`${id}-heading`}>
        {children}
      </div>
    </details>
  );
}
