import type { ResearchEntry } from "../types/vesselResearch";

export interface ResearchSection {
  id: string;
  title: string;
  description: string;
  entries: ResearchEntry[];
}

export const vesselResearchPlaceholderSections: ResearchSection[] = [
  {
    id: "equipment-methods",
    title: "Equipment and Fishing Methods",
    description:
      "Future general reference material may explain equipment appearance, operation, and identification cues. It must not imply this vessel carries specific equipment without vessel-specific evidence.",
    entries: [
      {
        id: "equipment-reference",
        title: "Equipment reference",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "Research pending for reviewed equipment descriptions and identification cues.",
        sources: [],
      },
      {
        id: "fishing-method-reference",
        title: "Fishing method reference",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "Research pending for a reviewed explanation of relevant fishing methods.",
        sources: [],
      },
    ],
  },
  {
    id: "species-context",
    title: "Species and Fishery Context",
    description:
      "Future material may describe species or fisheries generally associated with reviewed gear evidence. It must not claim this vessel caught a species without vessel-specific evidence.",
    entries: [
      {
        id: "species-reference",
        title: "Species and fishery reference",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "Research pending for reviewed species and fishery context.",
        sources: [],
      },
    ],
  },
  {
    id: "imagery",
    title: "Vessel Imagery and Identification Cues",
    description:
      "Future media must distinguish confirmed images of this vessel from representative imagery.",
    entries: [
      {
        id: "vessel-image",
        title: "Selected vessel image",
        scope: "vessel-specific",
        reviewStatus: "needs-review",
        body: "No confirmed image has been added.",
        sources: [],
        media: [
          {
            alt: "Alt text pending",
            caption: "Caption pending",
            attribution: "Attribution pending",
          },
        ],
      },
      {
        id: "representative-image",
        title: "Representative identification image",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "No reviewed representative image has been added.",
        sources: [],
        media: [
          {
            alt: "Alt text pending",
            caption: "Caption pending",
            attribution: "Attribution pending",
          },
        ],
      },
    ],
  },
  {
    id: "regional-context",
    title: "Regional and Coastline Context",
    description:
      "The searched bounds and dates below are report context, not the vessel's current position.",
    entries: [
      {
        id: "regional-reference",
        title: "Regional reference",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "Research pending for reviewed regional and coastline context.",
        sources: [],
      },
    ],
  },
  {
    id: "research-notes",
    title: "Research Notes and Fun Facts",
    description:
      "Internal notes remain unapproved until the developer reviews their evidence and sources.",
    entries: [
      {
        id: "research-note",
        title: "Research note",
        scope: "vessel-specific",
        reviewStatus: "needs-review",
        body: "Research pending.",
        sources: [],
      },
      {
        id: "fun-fact",
        title: "Fun fact",
        scope: "general-reference",
        reviewStatus: "placeholder",
        body: "Research pending.",
        sources: [],
      },
    ],
  },
];
