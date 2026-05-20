/* Main ChatApp — wires everything together, streams from real API */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8501'
  : '/api';

const ChatApp = ({ onBack, agentLabel, scope, region, accent }) => {
  // ---- App state ----
  const [theme, setTheme] = React.useState("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [activeChat, setActiveChat] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const [streamingCitations, setStreamingCitations] = React.useState([]);
  const [rightPanelDoc, setRightPanelDoc] = React.useState(null);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [toast, setToastMsg] = React.useState(null);
  const abortRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);

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
        else {
          const firstCited = messages.find(m => m.citations)?.citations?.[0];
          if (firstCited) setRightPanelDoc(firstCited);
        }
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
    // Demo: c3 loads seeded messages, others load a stub
    if (id === "c3") {
      setMessages(SEEDED_MESSAGES);
    } else {
      const item = CHAT_HISTORY.flatMap(g => g.items).find(it => it.id === id);
      setMessages([
        { role: "user", content: item?.title || "(Previous question)" },
        {
          role: "assistant",
          content: `Here is what Musashi's HR policies say about **${item?.title || "this topic"}**.\n\nI found relevant information in the policy documents. Ask me a follow-up question or start a new chat to search a different topic.`,
          citations: [],
        },
      ]);
    }
    setRightPanelDoc(null);
  };

  // ---- Real SSE streaming ----
  const streamReply = async (userText) => {
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingCitations([]);

    const controller = new AbortController();
    abortRef.current = controller;

    const apiHistory = messages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.content }));

    let fullText = "";
    let citationIds = [];

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userText,
          history: apiHistory,
          agent_label: agentLabel || "Americas HR",
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const payload = JSON.parse(data);
            if (payload.sources) {
              payload.sources.forEach((s) => {
                const id = (s.document_name || "").toLowerCase().replace(/[\s/]+/g, "-");
                if (!window.DOCS[id]) {
                  window.DOCS[id] = {
                    id,
                    code: s.document_name,
                    title: s.document_name,
                    section: s.section_title || "",
                    version: "",
                    page: null,
                    updated: "",
                    owner: "HR",
                    excerpt: "",
                    fullText: [],
                  };
                }
                if (!citationIds.includes(id)) citationIds.push(id);
              });
              setStreamingCitations([...citationIds]);
            }
            if (payload.text) {
              fullText += payload.text;
              setStreamingContent(fullText);
            }
          } catch {}
        }
      }

      setMessages(m => [...m, { role: "assistant", content: fullText, citations: citationIds }]);
    } catch (e) {
      if (e.name !== "AbortError") {
        setMessages(m => [...m, {
          role: "assistant",
          content: `Something went wrong: ${e.message}. Please try again or contact HR at hr@musashina.com.`,
        }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setStreamingCitations([]);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    if (streamingContent) {
      setMessages(m => [...m, {
        role: "assistant",
        content: streamingContent + "\n\n*(Response stopped)*",
        citations: streamingCitations,
      }]);
    }
    setIsStreaming(false);
    setStreamingContent("");
    setStreamingCitations([]);
  };

  const sendMessage = ({ text, attachments }) => {
    if (!text && !attachments?.length) return;
    const finalText = attachments?.length
      ? text + (text ? "\n\n" : "") + `Attached: ${attachments.map(a => a.name).join(", ")}`
      : text;
    setMessages(m => [...m, { role: "user", content: finalText }]);
    if (!activeChat) setActiveChat("new");
    streamReply(text);
  };

  const onCiteOpen = (docId) => setRightPanelDoc(docId);

  const onRegen = () => {
    const lastUser = [...messages].reverse().find(x => x.role === "user");
    setMessages(m => m.filter((x, i) => !(x.role === "assistant" && i === m.length - 1)));
    if (lastUser) streamReply(lastUser.content);
  };

  // Active chat title for share modal
  const activeChatTitle = React.useMemo(() => {
    if (!activeChat || activeChat === "new") return "New chat";
    const item = CHAT_HISTORY.flatMap(g => g.items).find(it => it.id === activeChat);
    return item?.title || "Untitled chat";
  }, [activeChat]);

  const ctxPercent = Math.min(messages.length * 7, 78);
  const hasMessages = messages.length > 0;

  const displayScope = scope || AGENT.scope;
  const displayRegion = region || AGENT.region;
  const displayLabel = agentLabel || AGENT.shortName;

  return (
    <div
      className={`chat-app app ${rightPanelDoc ? "right-open" : ""} ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      data-theme={theme}
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
          {/* Back to HR selection */}
          <button
            className="icon-btn"
            title="Back to HR selection"
            onClick={onBack}
            style={{ color: "var(--text-muted)" }}
          >
            <Icon name="back" />
          </button>
          <div className="crumbs">
            {hasMessages && (
              <button className="back" onClick={newChat}>
                <Icon name="back" size={12} />New chat
              </button>
            )}
            <span>Musashi One</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span>{displayScope}</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span>HR Policies</span>
            <Icon name="chev-r" size={11} className="sep" />
            <span className="last">{displayRegion}</span>
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
          <button
            className="icon-btn"
            title="Toggle source panel"
            onClick={() => {
              if (rightPanelDoc) {
                setRightPanelDoc(null);
              } else {
                const firstCited = messages.find(m => m.citations)?.citations?.[0];
                if (firstCited) setRightPanelDoc(firstCited);
              }
            }}
          >
            <Icon name="panel-r" />
          </button>
          <button className="icon-btn" title="Keyboard shortcuts" onClick={() => setShortcutsOpen(true)}>
            <Icon name="keyboard" size={14} />
          </button>
        </div>

        {!hasMessages ? (
          <Welcome
            onSubmit={sendMessage}
            onPickTemplate={(p) => sendMessage({ text: p, attachments: [] })}
          />
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
                      <div className="av" style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--planet-glow)", boxShadow: "0 0 10px var(--accent-glow)" }} />
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
                    AGENT: <strong>{displayLabel.toUpperCase()} · HR POLICIES</strong>
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

              {messages.some(m => m.citations?.length) && (
                <div className="cite-chips-row">
                  {[...new Set(messages.flatMap(m => m.citations || []))].map((id, idx) => {
                    const doc = DOCS[id];
                    if (!doc) return null;
                    return (
                      <button key={id} className="cite-chip" onClick={() => onCiteOpen(id)}>
                        <span className="num">{idx + 1}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{doc.code}</span>
                        <Icon name="chev-r" size={10} className="arrow-r" />
                        <span style={{ color: "var(--text)" }}>{doc.section}</span>
                      </button>
                    );
                  })}
                </div>
              )}
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

window.ChatApp = ChatApp;
