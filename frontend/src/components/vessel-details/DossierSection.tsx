import type { ReactNode } from "react";

interface DossierSectionProps {
  id: string;
  title: string;
  label: string;
  count?: number;
  children: ReactNode;
}

export function DossierSection({
  id,
  title,
  label,
  count,
  children,
}: DossierSectionProps) {
  return (
    <details className="dossier-section" open>
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
