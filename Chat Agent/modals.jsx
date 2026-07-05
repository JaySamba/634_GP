/* Keyboard shortcuts modal + toast helper */

const ShortcutsModal = ({ onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <h2><Icon name="keyboard" size={14} style={{display:'inline', verticalAlign:'-2px', marginRight:6}} />Keyboard shortcuts</h2>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>
      <div className="modal-body">
        <div className="shortcut-grid">
          <div className="shortcut-section">
            <h3>NAVIGATION</h3>
            {[
              ["New chat", ["⌘", "K"]],
              ["Search chats", ["⌘", "/"]],
              ["Toggle sidebar", ["⌘", "B"]],
              ["Toggle source panel", ["⌘", "."]],
              ["Next chat", ["⌘", "↓"]],
              ["Previous chat", ["⌘", "↑"]],
            ].map(([label, keys]) => (
              <div key={label} className="shortcut-row">
                <span>{label}</span>
                <span className="keys">{keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
          <div className="shortcut-section">
            <h3>COMPOSER</h3>
            {[
              ["Send message", ["↵"]],
              ["New line", ["⇧", "↵"]],
              ["Stop generating", ["Esc"]],
              ["Slash commands", ["/"]],
              ["Attach file", ["⌘", "U"]],
              ["Voice input", ["⌘", "M"]],
            ].map(([label, keys]) => (
              <div key={label} className="shortcut-row">
                <span>{label}</span>
                <span className="keys">{keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
          <div className="shortcut-section">
            <h3>MESSAGES</h3>
            {[
              ["Copy last reply", ["⌘", "⇧", "C"]],
              ["Regenerate", ["⌘", "R"]],
              ["Edit last message", ["↑"]],
              ["Open citation", ["⌘", "1-9"]],
            ].map(([label, keys]) => (
              <div key={label} className="shortcut-row">
                <span>{label}</span>
                <span className="keys">{keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
          <div className="shortcut-section">
            <h3>CHAT ACTIONS</h3>
            {[
              ["Share chat", ["⌘", "⇧", "S"]],
              ["Export to PDF", ["⌘", "⇧", "E"]],
              ["Rename chat", ["F2"]],
              ["Pin/unpin", ["⌘", "⇧", "P"]],
              ["Delete chat", ["⌘", "⌫"]],
              ["Show shortcuts", ["?"]],
            ].map(([label, keys]) => (
              <div key={label} className="shortcut-row">
                <span>{label}</span>
                <span className="keys">{keys.map((k, i) => <kbd key={i}>{k}</kbd>)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ShareModal = ({ chatTitle, onClose, onToast }) => {
  const [scope, setScope] = React.useState("link");
  const url = `https://musashi-one.musashi-auto.com/c/${Math.random().toString(36).slice(2, 10)}`;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2><Icon name="share" size={14} style={{display:'inline', verticalAlign:'-2px', marginRight:6}} />Share chat</h2>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>
            Sharing <strong style={{ color: "var(--text)" }}>"{chatTitle}"</strong>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[
              { id: "link", label: "Anyone with link" },
              { id: "tenant", label: "Musashi only" },
              { id: "private", label: "Specific people" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setScope(opt.id)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid " + (scope === opt.id ? "var(--accent)" : "var(--border)"),
                  background: scope === opt.id ? "var(--accent-soft)" : "var(--bg-card)",
                  color: scope === opt.id ? "var(--accent)" : "var(--text-muted)",
                  fontSize: 12,
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div style={{
            display: "flex", gap: 6, padding: "8px 10px",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 8, alignItems: "center"
          }}>
            <Icon name="external" size={13} />
            <input
              readOnly value={url}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 11.5
              }}
            />
            <button
              onClick={() => { navigator.clipboard?.writeText(url); onToast("Link copied"); onClose(); }}
              style={{
                padding: "5px 12px", borderRadius: 6,
                background: "var(--accent)", color: "var(--bg-app)", fontSize: 12, fontWeight: 500
              }}
            >Copy link</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 10 }}>
            Recipients see the conversation read-only. Document citations link to your SharePoint with their own permissions enforced.
          </div>
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ onClose, onToast }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <h2><Icon name="download" size={14} style={{display:'inline', verticalAlign:'-2px', marginRight:6}} />Export chat</h2>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
      </div>
      <div className="modal-body" style={{ display: "grid", gap: 8 }}>
        {[
          { ext: "PDF", desc: "Formatted document with citations inlined", icon: "file" },
          { ext: "Markdown", desc: "Plain text — paste into Word, Notion, etc.", icon: "file-doc" },
          { ext: "JSON", desc: "Raw conversation + citations + metadata", icon: "file-doc" },
          { ext: "DOCX", desc: "Microsoft Word — opens in your tenant", icon: "file" },
        ].map(opt => (
          <button
            key={opt.ext}
            onClick={() => { onToast(`Exporting as ${opt.ext}…`); onClose(); }}
            style={{
              display: "flex", gap: 12, alignItems: "center",
              padding: "12px 14px", borderRadius: 10,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "var(--accent-soft)", color: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name={opt.icon} size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.ext}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{opt.desc}</div>
            </div>
            <Icon name="arrow-r" size={14} style={{ color: "var(--text-dim)" }} />
          </button>
        ))}
      </div>
    </div>
  </div>
);

const Toast = ({ message }) => message ? (
  <div className="toast">
    <Icon name="check-c" size={14} style={{ color: "var(--success)" }} />
    {message}
  </div>
) : null;

Object.assign(window, { ShortcutsModal, ShareModal, ExportModal, Toast });
