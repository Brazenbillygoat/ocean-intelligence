export type ResearchScope = "vessel-specific" | "general-reference";

export type ResearchReviewStatus =
  | "placeholder"
  | "needs-review"
  | "approved";

export interface ResearchSource {
  label: string;
  url: string;
  publisher?: string;
  accessedOn?: string;
}

export interface ResearchMedia {
  src?: string;
  alt: string;
  caption: string;
  attribution?: string;
  sourceUrl?: string;
}

export interface ResearchEntry {
  id: string;
  title: string;
  scope: ResearchScope;
  reviewStatus: ResearchReviewStatus;
  body: string;
  sources: ResearchSource[];
  media?: ResearchMedia[];
}
