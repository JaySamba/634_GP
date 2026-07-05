/* Main app — wires everything together */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showStackInComposer": true,
  "showContextBar": true,
  "cosmicBackdrop": true,
  "rightPanelDefaultOpen": false
}/*EDITMODE-END*/;

const ASSISTANT_REPLY_TEMPLATE = (q) => {
  // Generic mock reply that uses a couple of docs as citations
  return {
    content: `Thanks for asking. Here's what I found in Musashi's HR policies relevant to your question.\n\n### Short answer\n${q.length > 60 ? "Based on your situation, the policy provides specific guidance — see the steps below." : "Yes, this is covered by current Musashi policy. The relevant section is summarized below."}\n\n### What the policy says\n\n- The most relevant document is **HR-PP-49A — Harassment Policy Statement** [[1]], which covers reporting procedure and timelines.\n- For workplace meetings and manager-led processes, see **HR-PP-45 — Monthly Managers Meetings** [[2]].\n\n### Next steps\n\n1. Review the cited sections in the source panel on the right.\n2. If you need to take action, the form lives in **Workday → My HR → Forms**.\n3. Reach out to your HR business partner if you need clarification on your specific case.\n\nWant me to walk you through a specific scenario, or pull up the full text of either policy?`,
    citations: ["hs-pp-49a", "hr-pp-45"],
  };
};

const App = () => {
  // ---- App state ----
  const [theme, setTheme] = React.useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activeChat, setActiveChat] = React.useState("c3"); // "Vacation carryover into 2026"
  const [messages, setMessages] = React.useState(SEEDED_MESSAGES);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const [streamingCitations, setStreamingCitations] = React.useState([]);
  const [rightPanelDoc, setRightPanelDoc] = React.useState(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [toast, setToastMsg] = React.useState(null);
  const streamTimerRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Toast helper
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (e.key === "?" && !e.target.matches("textarea, input")) {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (meta && e.key === "k") {
        e.preventDefault();
        newChat();
      } else if (meta && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed(s => !s);
      } else if (meta && e.key === ".") {
        e.preventDefault();
        if (rightPanelDoc) setRightPanelDoc(null);
        else setRightPanelDoc(messages.find(m => m.citations)?.citations?.[0] || "hr-vac-2025");
      } else if (e.key === "Escape") {
        if (isStreaming) stopStreaming();
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (rightPanelDoc) setRightPanelDoc(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStreaming, shortcutsOpen, rightPanelDoc, messages]);

  // Scroll to bottom on new message / streaming
  React.useEffect(() => {
    messagesEndRef.current?.parentElement?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [messages, streamingContent]);

  // ---- Actions ----
  const newChat = () => {
    setActiveChat(null);
    setMessages([]);
    setRightPanelDoc(null);
  };

  const selectChat = (id) => {
    setActiveChat(id);
    // For demo: only c3 has seeded messages, others are stub
    if (id === "c3") setMessages(SEEDED_MESSAGES);
    else {
      // generate plausible stub
      const item = CHAT_HISTORY.flatMap(g => g.items).find(it => it.id === id);
      setMessages([
        { role: "user", content: item?.title || "(Previous question)" },
        ASSISTANT_REPLY_TEMPLATE(item?.title || ""),
      ].map(m => ({ role: m.role, content: m.content, citations: m.citations })));
    }
    setRightPanelDoc(null);
  };

  const streamReply = (userText) => {
    setIsStreaming(true);
    setStreamingContent("");
    const reply = ASSISTANT_REPLY_TEMPLATE(userText);
    setStreamingCitations(reply.citations);

    const chunks = reply.content.match(/[\s\S]{1,12}/g) || [];
    let i = 0;
    streamTimerRef.current = setInterval(() => {
      i++;
      const next = chunks.slice(0, i).join("");
      setStreamingContent(next);
      if (i >= chunks.length) {
        clearInterval(streamTimerRef.current);
        // commit
        setMessages(m => [...m, { role: "assistant", content: reply.content, citations: reply.citations }]);
        setIsStreaming(false);
        setStreamingContent("");
        setStreamingCitations([]);
      }
    }, 22);
  };

  const stopStreaming = () => {
    clearInterval(streamTimerRef.current);
    if (streamingContent) {
      setMessages(m => [...m, { role: "assistant", content: streamingContent + "\n\n*[Stopped]*", citations: streamingCitations }]);
    }
    setIsStreaming(false);
    setStreamingContent("");
  };

  const sendMessage = ({ text, attachments }) => {
    if (!text && !attachments?.length) return;
    const finalText = attachments?.length
      ? text + (text ? "\n\n" : "") + `📎 Attached: ${attachments.map(a => a.name).join(", ")}`
      : text;
    setMessages(m => [...m, { role: "user", content: finalText }]);
    if (!activeChat) setActiveChat("new");
    setTimeout(() => streamReply(text), 250);
  };

  const onCiteOpen = (docId) => {
    setRightPanelDoc(docId);
  };

  const onRegen = () => {
    // remove last assistant and re-stream
    setMessages(m => {
      const lastUser = [...m].reverse().find(x => x.role === "user");
      const without = m.filter((x, i) => !(x.role === "assistant" && i === m.length - 1));
      return without;
    });
    setTimeout(() => {
      const lastUser = [...messages].reverse().find(x => x.role === "user");
      streamReply(lastUser?.content || "");
    }, 200);
  };

  // Find active chat title
  const activeChatTitle = React.useMemo(() => {
    if (!activeChat) return "New chat";
    const item = CHAT_HISTORY.flatMap(g => g.items).find(it => it.id === activeChat);
    return item?.title || "New chat";
  }, [activeChat]);

  // Context bar progress (mock — based on message count)
  const ctxPercent = Math.min(messages.length * 7, 78);

  const hasMessages = messages.length > 0;

  return (
    <div
      className={`app ${rightPanelDoc ? "right-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      data-screen-label="Musashi One Chat"
    >
      <div className="starfield" />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(s => !s)}
        activeChat={activeChat}
        onSelectChat={selectChat}
        onNewChat={newChat}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")}
      />

      <main className="main">
        <div className="topbar">
          <button className="icon-btn" onClick={() => setSidebarCollapsed(s => !s)} title="Toggle sidebar">
            <Icon name="panel-l" />
          </button>
          <div className="crumbs">
            {hasMessages && <button className="back" onClick={newChat}>
              <Icon name="back" size={12} />Back
            </button>}
            <span>Musashi One</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span>{AGENT.scope}</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span>HR Policies</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span className="last">{AGENT.region}</span>
          </div>
          <div className="live-pill">
            <span className="dot" />
            Live
          </div>
          <button className="icon-btn" title="Share chat" onClick={() => hasMessages && setShareOpen(true)}>
            <Icon name="share" size={14} />
          </button>
          <button className="icon-btn" title="Export chat" onClick={() => hasMessages && setExportOpen(true)}>
            <Icon name="download" size={14} />
          </button>
          <button className="icon-btn" title="Toggle source panel"
            onClick={() => rightPanelDoc ? setRightPanelDoc(null) : setRightPanelDoc(messages.find(m => m.citations)?.citations?.[0] || "hr-vac-2025")}>
            <Icon name="panel-r" />
          </button>
          <button className="icon-btn" title="Keyboard shortcuts" onClick={() => setShortcutsOpen(true)}>
            <Icon name="keyboard" size={14} />
          </button>
        </div>

        {!hasMessages ? (
          <Welcome onSubmit={sendMessage} onPickTemplate={(p) => sendMessage({ text: p, attachments: [] })} />
        ) : (
          <>
            <div className="messages-wrap">
              <div className="context-bar">
                <span>CONTEXT</span>
                <div className="ctx-track">
                  <div className="ctx-fill" style={{ width: `${ctxPercent}%` }} />
                </div>
                <span>{ctxPercent}% of 200K · {messages.length} turn{messages.length === 1 ? "" : "s"}</span>
              </div>

              <div className="messages">
                {messages.map((m, i) => (
                  <Message
                    key={i}
                    msg={m}
                    onRegen={onRegen}
                    onEdit={() => {}}
                    onCiteOpen={onCiteOpen}
                  />
                ))}

                {isStreaming && (
                  streamingContent ? (
                    <Message
                      msg={{ role: "assistant", content: streamingContent, citations: streamingCitations }}
                      isStreaming
                      onCiteOpen={onCiteOpen}
                    />
                  ) : (
                    <div className="thinking-row">
                      <div className="av" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--planet-glow)', boxShadow: '0 0 10px var(--accent-glow)' }} />
                      <span>Searching policies</span>
                      <span className="thinking-dots"><span></span><span></span><span></span></span>
                    </div>
                  )
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="composer-wrap">
              <div className="composer-shell">
                <Composer
                  onSubmit={sendMessage}
                  placeholder="Ask about a policy…"
                  isStreaming={isStreaming}
                  onStop={stopStreaming}
                />
                <div className="composer-meta">
                  <span className="agent-meta">
                    AGENT: <strong>{AGENT.shortName.toUpperCase()} · HR POLICIES</strong>
                    <span className="stack-dot">·</span>
                    {AGENT.stack.map((s, i) => (
                      <React.Fragment key={s}>
                        {s.toUpperCase()}{i < AGENT.stack.length - 1 && <span className="stack-dot">·</span>}
                      </React.Fragment>
                    ))}
                  </span>
                  <span>Replies may be incomplete — verify against the cited document.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <RightPanel docId={rightPanelDoc} onClose={() => setRightPanelDoc(null)} />

      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {shareOpen && <ShareModal chatTitle={activeChatTitle} onClose={() => setShareOpen(false)} onToast={showToast} />}
      {exportOpen && <ExportModal onClose={() => setExportOpen(false)} onToast={showToast} />}
      <Toast message={toast} />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
