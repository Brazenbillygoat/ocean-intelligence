import type {
  ResearchEntry,
  ResearchReviewStatus,
  ResearchScope,
} from "../../types/vesselResearch";

const scopeLabels: Record<ResearchScope, string> = {
  "vessel-specific": "Vessel-specific",
  "general-reference": "General reference",
};

const reviewStatusLabels: Record<ResearchReviewStatus, string> = {
  placeholder: "Placeholder",
  "needs-review": "Needs review",
  approved: "Approved",
};

export function ResearchPlaceholderCard({ entry }: { entry: ResearchEntry }) {
  return (
    <article className="research-card">
      <div className="research-card__header">
        <h4>{entry.title}</h4>
        <div className="research-card__badges">
          <span className="research-badge">{scopeLabels[entry.scope]}</span>
          <span className={`research-badge research-badge--${entry.reviewStatus}`}>
            {reviewStatusLabels[entry.reviewStatus]}
          </span>
        </div>
      </div>

      <p>{entry.body}</p>

      {entry.media?.map((media, index) => (
        <div className="research-media-slot" key={`${entry.id}-media-${index}`}>
          <strong>No media added</strong>
          <span>Alt text: {media.alt}</span>
          <span>Caption: {media.caption}</span>
          <span>Attribution: {media.attribution || "Pending"}</span>
          <span>
            Source:{" "}
            {media.sourceUrl ? (
              <a href={media.sourceUrl} target="_blank" rel="noreferrer">
                Open media source
              </a>
            ) : (
              "Pending"
            )}
          </span>
        </div>
      ))}

      <div className="research-card__sources">
        <strong>Sources</strong>
        {entry.sources.length === 0 ? (
          <span>Source pending</span>
        ) : (
          <ul>
            {entry.sources.map((source) => (
              <li key={`${entry.id}-${source.url}`}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
