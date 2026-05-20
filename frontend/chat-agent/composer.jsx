/* Composer — textarea, attachments, voice, slash, send/stop */

const Composer = ({ onSubmit, placeholder = "Ask about a policy…", autoFocus = false, isStreaming = false, onStop }) => {
  const [text, setText] = React.useState("");
  const [attachments, setAttachments] = React.useState([]);
  const [recording, setRecording] = React.useState(false);
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashFocus, setSlashFocus] = React.useState(0);
  const taRef = React.useRef(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus();
  }, [autoFocus]);

  React.useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [text]);

  const slashFiltered = React.useMemo(() => {
    if (!text.startsWith("/")) return [];
    const q = text.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter(s => s.cmd.slice(1).startsWith(q));
  }, [text]);

  React.useEffect(() => {
    setSlashOpen(text.startsWith("/") && slashFiltered.length > 0);
    setSlashFocus(0);
  }, [text, slashFiltered.length]);

  const submit = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSubmit({ text: text.trim(), attachments });
    setText("");
    setAttachments([]);
  };

  const onKey = (e) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashFocus(f => Math.min(f + 1, slashFiltered.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSlashFocus(f => Math.max(f - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = slashFiltered[slashFocus];
        if (cmd) setText(cmd.cmd + " ");
        return;
      }
      if (e.key === "Escape") { setSlashOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachments(a => [...a, ...files.map(f => ({ name: f.name, size: f.size, type: f.type }))]);
    }
    e.target.value = "";
  };

  const toggleVoice = () => {
    setRecording(r => !r);
    if (recording) {
      setText(t => t + (t ? " " : "") + "How many sick days do I get this year?");
    }
  };

  const canSubmit = text.trim().length > 0 || attachments.length > 0;

  return (
    <>
      {attachments.length > 0 && (
        <div className="attach-strip">
          {attachments.map((a, i) => (
            <div key={i} className="attach-pill">
              <Icon name="file-doc" size={13} className="file-icon" />
              <span>{a.name}</span>
              <span style={{ color: "var(--text-faint)", fontSize: 10 }}>
                {a.size ? (a.size / 1024).toFixed(0) + " KB" : ""}
              </span>
              <span className="x" onClick={() => setAttachments(at => at.filter((_, j) => j !== i))}>
                <Icon name="x" size={12} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="composer">
        {slashOpen && (
          <div className="slash-menu">
            <div className="slash-head">SLASH COMMANDS</div>
            {slashFiltered.map((s, i) => (
              <div
                key={s.cmd}
                className={`slash-item ${i === slashFocus ? "focused" : ""}`}
                onMouseEnter={() => setSlashFocus(i)}
                onClick={() => { setText(s.cmd + " "); taRef.current?.focus(); }}
              >
                <span className="scmd">{s.cmd}</span>
                <span className="sdesc">{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          rows={1}
        />

        <div className="composer-toolbar">
          <button
            className="tool-btn"
            title="Attach file"
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="paperclip" size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={onFileChange}
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
          />
          <button
            className={`tool-btn ${recording ? "recording" : ""}`}
            title={recording ? "Stop recording" : "Voice input"}
            onClick={toggleVoice}
          >
            <Icon name="mic" size={16} />
          </button>
          <button
            className="tool-btn"
            title="Slash commands"
            onClick={() => { setText("/"); taRef.current?.focus(); }}
          >
            <Icon name="slash" size={16} />
          </button>

          <div className="spacer" />

          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", marginRight: 6 }}>
            {text.length > 0 ? `${text.length} chars` : "↵ to send · ⇧↵ newline"}
          </span>

          {isStreaming ? (
            <button className="send-btn stop" title="Stop generating" onClick={onStop}>
              <Icon name="stop" size={14} />
            </button>
          ) : (
            <button
              className={`send-btn ${canSubmit ? "" : "disabled"}`}
              disabled={!canSubmit}
              onClick={submit}
              title="Send (↵)"
            >
              <Icon name="arrow-u" size={16} />
            </button>
          )}
        </div>
      </div>
    </>
  );
};

window.Composer = Composer;
