/* Microsoft profile button + dropdown — with guest-user fallback */

const Profile = ({ theme, onToggleTheme }) => {
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(USER.status);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSignIn = () => {
    setOpen(false);
    window.__musashi_signIn?.();
  };

  // ── Guest mode ──────────────────────────────────────────────────────────────
  if (USER.isGuest) {
    return (
      <div className="profile-row" ref={ref}>
        <button className="profile-btn" onClick={() => setOpen(o => !o)}>
          <div className="avatar" style={{ background: "var(--bg-elev)", border: "1px solid var(--border-strong)" }}>
            <Icon name="user-c" size={16} style={{ color: "var(--text-dim)" }} />
          </div>
          <div className="profile-info">
            <div className="profile-name">Guest</div>
            <div className="profile-org">Not signed in</div>
          </div>
          <Icon name="chev-d" size={12} className={open ? "rotated" : ""} />
        </button>

        {open && (
          <div className="profile-menu">
            <div className="profile-menu-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                Sign in with your Musashi Microsoft account to access conversation history and personalization.
              </div>
            </div>

            <div className="profile-menu-section">
              <button className="menu-item" onClick={handleSignIn} style={{ color: "var(--text)", fontWeight: 500 }}>
                <Icon name="ms-logo" size={16} />
                <span>Sign in with Microsoft</span>
                <Icon name="arrow-r" size={11} className="menu-arrow" />
              </button>
            </div>

            <div className="menu-divider" />

            <div className="profile-menu-section">
              <button className="menu-item" onClick={onToggleTheme}>
                <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
                <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Authenticated mode ──────────────────────────────────────────────────────
  return (
    <div className="profile-row" ref={ref}>
      <button className="profile-btn" onClick={() => setOpen(o => !o)}>
        <div className="avatar">
          {USER.initials}
          <span className="status-dot" style={status === "away" ? { background: "var(--warning)" } : null} />
        </div>
        <div className="profile-info">
          <div className="profile-name">{USER.fullName}</div>
          <div className="profile-org">{USER.tenant}</div>
        </div>
        <Icon name="chev-d" size={12} className={open ? "rotated" : ""} />
      </button>

      {open && (
        <div className="profile-menu">
          <div className="profile-menu-header">
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
              {USER.initials}
              <span className="status-dot" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="pname">{USER.fullName}</div>
              <div className="pmail">{USER.email}</div>
              <div className="ptitle">{USER.title} · {USER.department}</div>
              <div className="tenant-pill">
                <svg width="10" height="10" viewBox="0 0 23 23" aria-hidden="true">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                </svg>
                {USER.tenant}
              </div>
            </div>
          </div>

          <div className="profile-menu-section">
            <div className="status-toggle" style={{ cursor: "pointer" }} onClick={() => setStatus(s => s === "online" ? "away" : "online")}>
              <span className={`dot ${status === "away" ? "away" : ""}`} />
              <span>Status: <strong style={{ color: "var(--text)" }}>{status === "online" ? "Online" : "Away"}</strong></span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-dim)" }}>Click to toggle</span>
            </div>
          </div>

          <div className="menu-divider" />

          <div className="profile-menu-section">
            <button className="menu-item">
              <Icon name="user-c" size={14} />
              <span>Account settings</span>
              <Icon name="external" size={11} className="menu-arrow" />
            </button>
            <button className="menu-item" onClick={onToggleTheme}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </button>
            <button className="menu-item">
              <Icon name="keyboard" size={14} />
              <span>Keyboard shortcuts</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>?</span>
            </button>
            <button className="menu-item">
              <Icon name="switch" size={14} />
              <span>Switch account</span>
            </button>
          </div>

          <div className="menu-divider" />

          <div className="profile-menu-section">
            <button className="menu-item danger" onClick={() => { window.__musashi_signOut?.(); setOpen(false); }}>
              <Icon name="log-out" size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

window.Profile = Profile;
