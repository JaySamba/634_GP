/* Right panel — document/citation viewer */

const RightPanel = ({ docId, onClose }) => {
  const [tab, setTab] = React.useState("doc");
  const doc = DOCS[docId];

  if (!doc) return null;

  return (
    <aside className="right-panel" data-screen-label="Citation Panel">
      <div className="rp-header">
        <div className="rp-title">
          <span className="doc-num">i</span>
          Source preview
        </div>
        <button className="icon-btn" title="Open in full view"><Icon name="external" size={14} /></button>
        <button className="icon-btn" title="Close" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>

      <div className="rp-tabs">
        <div className={`rp-tab ${tab === "doc" ? "active" : ""}`} onClick={() => setTab("doc")}>DOCUMENT</div>
        <div className={`rp-tab ${tab === "meta" ? "active" : ""}`} onClick={() => setTab("meta")}>METADATA</div>
        <div className={`rp-tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>REVISIONS</div>
      </div>

      <div className="rp-body">
        {tab === "doc" && <>
          <h2>{doc.title}</h2>
          <div className="doc-meta">
            <span>{doc.code}</span>
            <span>{doc.version}</span>
            {doc.page && <span>Page {doc.page}</span>}
            {doc.updated && <span>Updated {doc.updated}</span>}
          </div>

          {doc.excerpt && (
            <div className="doc-excerpt">
              <span className="label">▌ EXCERPT CITED IN REPLY</span>
              {doc.excerpt}
            </div>
          )}

          {doc.fullText && doc.fullText.map((b, i) =>
            b.type === "h"
              ? <div key={i} className="doc-section">{b.text}</div>
              : <p key={i}>{b.text.split(/(\*\*[^*]+\*\*)/).map((seg, j) =>
                  seg.startsWith("**") ? <strong key={j}>{seg.slice(2, -2)}</strong> : <span key={j}>{seg}</span>
                )}</p>
          )}

          {doc.section && !doc.fullText?.length && (
            <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
              Section: <strong style={{ color: "var(--text)" }}>{doc.section}</strong>
            </p>
          )}
        </>}

        {tab === "meta" && <>
          <h2>Document metadata</h2>
          <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Code", doc.code],
                ["Title", doc.title],
                ["Version", doc.version || "—"],
                ["Section", doc.section || "—"],
                ["Page", doc.page || "—"],
                ["Last updated", doc.updated || "—"],
                ["Owner", doc.owner || "HR"],
                ["Retrieval source", "Pinecone vector index · Supabase FTS"],
                ["Embedding model", "Voyage AI voyage-3"],
              ].map(([k, v], i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 0", color: "var(--text-dim)", fontSize: 11.5, fontFamily: "var(--font-mono)", letterSpacing: "0.04em", width: 140, verticalAlign: "top" }}>{k.toUpperCase()}</td>
                  <td style={{ padding: "8px 0", color: "var(--text)", fontSize: 12.5 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>}

        {tab === "history" && <>
          <h2>Revision history</h2>
          <div style={{ marginTop: 12 }}>
            {[
              { v: doc.version || "Current", date: doc.updated || "—", who: "HR Operations", note: "Current published version" },
              { v: "Prior revision", date: "Aug 2023", who: "HR Operations", note: "Annual review — clarified eligibility window" },
              { v: "Initial release", date: "Feb 2022", who: "Legal & HR", note: "First published policy" },
            ].map((r, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ fontSize: 12.5 }}>{r.v}</strong>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-dim)" }}>{r.date}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{r.who} — {r.note}</div>
              </div>
            ))}
          </div>
        </>}
      </div>

      <div className="rp-footer">
        <button><Icon name="external" size={12} />Open in SharePoint</button>
        <button><Icon name="download" size={12} />Download PDF</button>
        <button><Icon name="share" size={12} />Share</button>
      </div>
    </aside>
  );
};

window.RightPanel = RightPanel;
