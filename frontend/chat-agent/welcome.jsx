/* Welcome screen — Claude-style "Hi, [name]" + templates */

const Welcome = ({ onSubmit, onPickTemplate }) => {
  const [cat, setCat] = React.useState("vacation");
  const templates = TEMPLATES[cat] || [];

  return (
    <div className="welcome" data-screen-label="Welcome">
      <div className="welcome-orb" />
      <h1>
        Hi, <span className="first">{USER.firstName}</span>
      </h1>
      <p>I'm Musashi One — here to help you navigate <strong style={{color:'var(--text)'}}>Musashi Auto Parts Canada</strong>'s HR policies. Ask anything, or pick a starting point below.</p>

      <div className="composer-shell">
        <Composer onSubmit={onSubmit} placeholder="Ask about a policy, request, or process…" autoFocus />
      </div>

      <div className="templates-strip">
        <div className="templates-tabs">
          {TEMPLATE_CATEGORIES.map(c => (
            <div
              key={c.id}
              className={`templates-tab ${cat === c.id ? "active" : ""}`}
              onClick={() => setCat(c.id)}
            >
              <Icon name={c.icon} size={12} />
              {c.label}
            </div>
          ))}
        </div>
        <div className="template-grid">
          {templates.map((t, i) => (
            <button key={i} className="template-card" onClick={() => onPickTemplate(t.prompt)}>
              <div className="ticon">
                <Icon name={TEMPLATE_CATEGORIES.find(c => c.id === cat)?.icon || "sparkle"} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ttitle">{t.title}</div>
                <div className="tdesc">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="starter-questions">
        <button className="starter-q" onClick={() => onPickTemplate("What changed in HR policies this quarter?")}>
          <Icon name="sparkle" size={11} style={{display:'inline', verticalAlign:'-2px', marginRight:4}} />
          What's new this quarter?
        </button>
        <button className="starter-q" onClick={() => onPickTemplate("Who is my HR contact?")}>
          Who is my HR contact?
        </button>
        <button className="starter-q" onClick={() => onPickTemplate("Show me the employee handbook table of contents.")}>
          Employee handbook TOC
        </button>
        <button className="starter-q" onClick={() => onPickTemplate("/policy harassment")}>
          /policy harassment
        </button>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
};

window.Welcome = Welcome;
