/* Left sidebar — chat history, search, folders, filters */

const Sidebar = ({ collapsed, onToggle, activeChat, onSelectChat, onNewChat, theme, onToggleTheme }) => {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [openFolders, setOpenFolders] = React.useState({});

  const filteredHistory = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return CHAT_HISTORY.map(group => ({
      ...group,
      items: group.items.filter(it => {
        if (q && !it.title.toLowerCase().includes(q)) return false;
        if (filter === "starred" && !it.pinned) return false;
        return true;
      }),
    })).filter(group => group.items.length > 0);
  }, [search, filter]);

  return (
    <aside className="sidebar" data-screen-label="Sidebar">
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-orb" />
          <div className="brand-name">MUSASHI <span className="one">ONE</span></div>
        </div>
        <span className="brand-tag">GPT</span>
        <button className="icon-btn" title="Collapse sidebar" onClick={onToggle}>
          <Icon name="panel-l" />
        </button>
      </div>

      {!collapsed && <>
        <button className="new-chat-btn" onClick={onNewChat}>
          <Icon name="plus" />
          <span>New chat</span>
          <span className="kbd">⌘K</span>
        </button>

        <div className="search-wrap">
          <Icon name="search" size={14} className="search-icon" />
          <input
            placeholder="Search chats…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-row">
          {FILTERS.map(f => (
            <button
              key={f.id}
              className={`filter-chip ${filter === f.id ? "on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="chat-list">
          {/* Folders */}
          <div className="section-label">
            FOLDERS <span className="count">{FOLDERS.length}</span>
          </div>
          {FOLDERS.map(f => {
            const open = openFolders[f.id];
            return (
              <React.Fragment key={f.id}>
                <div
                  className={`folder-row ${open ? "open" : ""}`}
                  onClick={() => setOpenFolders(o => ({ ...o, [f.id]: !o[f.id] }))}
                >
                  <Icon name="chev-r" size={12} className="chev" />
                  <Icon name="folder" size={14} />
                  <span>{f.name}</span>
                  <span className="folder-count">{f.count}</span>
                </div>
              </React.Fragment>
            );
          })}

          {/* Chat groups */}
          {filteredHistory.map(group => (
            <React.Fragment key={group.group}>
              <div className="section-label">
                {group.group === "pinned" ? (<><Icon name="pin" size={11}/> PINNED</>) : group.label?.toUpperCase()}
              </div>
              {group.items.map(item => (
                <div
                  key={item.id}
                  className={`chat-item ${activeChat === item.id ? "active" : ""}`}
                  onClick={() => onSelectChat(item.id)}
                >
                  {item.pinned && <span className="pin-dot" />}
                  <span className="chat-item-title">{item.title}</span>
                  <div className="chat-item-actions">
                    <button className="chat-item-action" title="Rename" onClick={e => { e.stopPropagation(); }}>
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="chat-item-action" title="More" onClick={e => { e.stopPropagation(); }}>
                      <Icon name="dots" size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))}

          {filteredHistory.length === 0 && (
            <div style={{ padding: "24px 16px", color: "var(--text-dim)", fontSize: 12, textAlign: "center" }}>
              No chats match "{search}"
            </div>
          )}
        </div>
      </>}

      <Profile theme={theme} onToggleTheme={onToggleTheme} />
    </aside>
  );
};

window.Sidebar = Sidebar;
