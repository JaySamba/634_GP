/* Message rendering — markdown-ish, citations, actions */

// Tiny markdown renderer for assistant prose (headings, bold, lists, tables, code, citations [[id]])
const renderInline = (text, onCiteClick) => {
  const parts = [];
  let i = 0;
  const regex = /(\[\[([a-z0-9-]+)\]\]|\*\*([^*]+)\*\*|`([^`]+)`)/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    if (m[2]) {
      const id = m[2];
      const num = onCiteClick ? onCiteClick.getNum(id) : "•";
      parts.push(
        <span
          key={m.index}
          className="cite"
          onClick={() => onCiteClick && onCiteClick.open(id)}
          title={`Source ${num}`}
        >{num}</span>
      );
    } else if (m[3]) {
      parts.push(<strong key={m.index}>{m[3]}</strong>);
    } else if (m[4]) {
      parts.push(<code key={m.index}>{m[4]}</code>);
    }
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
};

const renderBlocks = (md, onCiteClick) => {
  const lines = md.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("### ")) {
      blocks.push(<h3 key={i}>{renderInline(line.slice(4), onCiteClick)}</h3>);
      i++;
      continue;
    }

    if (line.startsWith("|") && i + 1 < lines.length && /^\|[-: |]+\|$/.test(lines[i+1])) {
      const headerCells = line.split("|").slice(1, -1).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").slice(1, -1).map(c => c.trim()));
        i++;
      }
      blocks.push(
        <table key={`t${i}`}>
          <thead><tr>{headerCells.map((c, j) => <th key={j}>{renderInline(c, onCiteClick)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, onCiteClick)}</td>)}</tr>
          ))}</tbody>
        </table>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(<ol key={`o${i}`}>{items.map((it, j) => <li key={j}>{renderInline(it, onCiteClick)}</li>)}</ol>);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(<ul key={`u${i}`}>{items.map((it, j) => <li key={j}>{renderInline(it, onCiteClick)}</li>)}</ul>);
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("### ") && !lines[i].startsWith("|") && !/^\d+\.\s/.test(lines[i]) && !lines[i].startsWith("- ") && !lines[i].startsWith("• ")) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={`p${i}`}>{renderInline(buf.join(" "), onCiteClick)}</p>);
  }
  return blocks;
};

const MessageActions = ({ role, content, onRegen, onEdit }) => {
  const [copied, setCopied] = React.useState(false);
  const [vote, setVote] = React.useState(null);

  const copy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="msg-actions">
      <button className={`msg-action ${copied ? "copied" : ""}`} onClick={copy}>
        <Icon name={copied ? "check" : "copy"} size={12} />
        {copied ? "Copied" : "Copy"}
      </button>
      {role === "assistant" && (
        <>
          <button className="msg-action" onClick={onRegen}>
            <Icon name="refresh" size={12} />
            Regenerate
          </button>
          <button
            className="msg-action"
            style={vote === "up" ? { color: "var(--success)" } : null}
            onClick={() => setVote(vote === "up" ? null : "up")}
          >
            <Icon name="thumbs-u" size={12} />
          </button>
          <button
            className="msg-action"
            style={vote === "down" ? { color: "var(--danger)" } : null}
            onClick={() => setVote(vote === "down" ? null : "down")}
          >
            <Icon name="thumbs-d" size={12} />
          </button>
        </>
      )}
      {role === "user" && (
        <button className="msg-action" onClick={onEdit}>
          <Icon name="edit" size={12} />
          Edit
        </button>
      )}
    </div>
  );
};

const CitationChips = ({ ids, onOpen }) => {
  if (!ids?.length) return null;
  return (
    <div className="cite-chips">
      {ids.map((id, idx) => {
        const doc = DOCS[id];
        if (!doc) return null;
        return (
          <button key={id} className="cite-chip" onClick={() => onOpen(id)}>
            <span className="num">{idx + 1}</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{doc.code}</span>
            <Icon name="chev-r" size={10} className="arrow-r" />
            <span style={{ color: "var(--text)" }}>{doc.section}</span>
          </button>
        );
      })}
    </div>
  );
};

const Message = ({ msg, onRegen, onEdit, onCiteOpen, isStreaming }) => {
  const citeHelper = msg.citations ? {
    open: onCiteOpen,
    getNum: (id) => msg.citations.indexOf(id) + 1 || "•",
  } : null;

  return (
    <div className={`msg msg-${msg.role}`} data-screen-label={`Message ${msg.role}`}>
      <div className="msg-head">
        {msg.role === "assistant" ? (
          <>
            <div className="av" />
            <span>Musashi One</span>
            <span style={{ color: "var(--text-faint)" }}>·</span>
            <span>Americas HR</span>
          </>
        ) : (
          <>
            <div className="av user">{USER.initials}</div>
            <span>{USER.fullName}</span>
          </>
        )}
      </div>

      <div className={`bubble ${msg.role === "assistant" ? "assistant-prose" : ""}`}>
        {msg.role === "assistant"
          ? <>
              {renderBlocks(msg.content, citeHelper)}
              {isStreaming && <span className="streaming-cursor" />}
            </>
          : <span>{msg.content}</span>
        }
      </div>

      {msg.role === "assistant" && msg.citations && (
        <CitationChips ids={msg.citations} onOpen={onCiteOpen} />
      )}

      {!isStreaming && (
        <MessageActions
          role={msg.role}
          content={msg.content}
          onRegen={onRegen}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};

window.Message = Message;
