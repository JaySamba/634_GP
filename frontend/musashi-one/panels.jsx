// Musashi One GPT — UI components (panels rendered inside the main App).
// Loaded as a Babel script that exports components onto window.

const PLANTS_DATA = [
  { region: 'Japan',    code: '1500', name: '1500-MAP-JP'   },
  { region: 'Japan',    code: '1600', name: '1600-KMS'      },
  { region: 'Japan',    code: '1700', name: '1700-MCT'      },
  { region: 'Japan',    code: '1800', name: '1800-MES'      },
  { region: 'Americas', code: '2100', name: '2100-MAP-MI'   },
  { region: 'Americas', code: '2200', name: '2200-MAP-CA'   },
  { region: 'Americas', code: '2300', name: '2300-MAP-MX'   },
  { region: 'Americas', code: '3100', name: '3100-MAP-MSB'  },
  { region: 'Americas', code: '3200', name: '3200-MAP-MDA'  },
  { region: 'Asia',     code: '5100', name: '5100-MAP-ID'   },
  { region: 'Asia',     code: '6400', name: '6400-MAP-IN'   },
  { region: 'Asia',     code: '6600', name: '6600-MAP-VN'   },
  { region: 'Asia',     code: '6800', name: '6800-MAP-TH'   },
  { region: 'China',    code: '7100', name: '7100-MAP-CH'   },
  { region: 'China',    code: '7200', name: '7200-MAP-NT'   },
  { region: 'China',    code: '7300', name: '7300-MAP-TJ'   },
  { region: 'Europe',   code: '8G00', name: '8G00-Musashi'  },
];

const REGION_KEYS = ['japan', 'americas', 'asia', 'china', 'europe'];
const REGION_META = {
  japan:    { label: 'Japan',    sub: 'East Asia HQ',    accent: '#FF5C4D' },
  americas: { label: 'Americas', sub: 'North America',   accent: '#4DBEFF' },
  asia:     { label: 'Asia',     sub: 'SE Asia & India', accent: '#4DFFC9' },
  china:    { label: 'China',    sub: 'Greater China',   accent: '#FFC74D' },
  europe:   { label: 'Europe',   sub: 'EU operations',   accent: '#C77EFF' },
};

// ── Sliding-panel container ─────────────────────────────────────────────
// Each panel is mounted when active. We use CSS transitions on transform+opacity.
// dir: 'in-from-right' | 'in-from-left' | 'out-to-left' | 'out-to-right'
function Panel({ active, direction, children, className = '' }) {
  const [phase, setPhase] = React.useState(active ? 'entered' : 'gone');
  const [mounted, setMounted] = React.useState(active);

  React.useEffect(() => {
    if (active) {
      setMounted(true);
      // start off-screen then transition in
      setPhase('enter');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('entered')));
    } else if (mounted) {
      setPhase('exit');
      const t = setTimeout(() => { setMounted(false); setPhase('gone'); }, 520);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!mounted && !active) return null;

  const dir = direction || 1; // 1 = moving forward (new from right), -1 = back
  let style;
  if (phase === 'enter') {
    style = { transform: `translateX(${dir > 0 ? 60 : -60}px)`, opacity: 0, filter: 'blur(6px)' };
  } else if (phase === 'entered') {
    style = { transform: 'translateX(0)', opacity: 1, filter: 'blur(0)' };
  } else if (phase === 'exit') {
    style = { transform: `translateX(${dir > 0 ? -60 : 60}px)`, opacity: 0, filter: 'blur(6px)' };
  } else {
    style = { opacity: 0 };
  }

  return (
    <div className={`m1-panel ${className}`} style={style}>
      {children}
    </div>
  );
}

// ── Landing: "Musashi One GPT" assembles ───────────────────────────────
function Landing({ onEnter }) {
  const title = 'MUSASHI ONE';
  const [revealed, setRevealed] = React.useState(0);
  const [showSub, setShowSub] = React.useState(false);
  const [showCta, setShowCta] = React.useState(false);
  const [signing, setSigning] = React.useState(false);

  React.useEffect(() => {
    let i = 0;
    const tick = () => {
      i++;
      setRevealed(i);
      if (i < title.length) setTimeout(tick, 90);
      else {
        setTimeout(() => setShowSub(true), 400);
        setTimeout(() => setShowCta(true), 900);
      }
    };
    setTimeout(tick, 250);
  }, []);

  const handleSignIn = () => {
    if (signing) return;
    setSigning(true);
    // No Azure credentials — simulate the handshake then proceed
    setTimeout(() => onEnter(), 1400);
  };

  return (
    <div className="m1-landing">
      <div className="m1-eyebrow">
        <span className="m1-eyebrow-dot"></span>
        <span>MUSASHI AUTO PARTS</span>
        <span className="m1-eyebrow-sep">/</span>
        <span>POLICY INTELLIGENCE</span>
      </div>

      <h1 className="m1-wordmark">
        {title.split('').map((c, i) => (
          <Letter key={i} c={c} revealed={i < revealed} delay={i * 40} />
        ))}
        <span className={`m1-wordmark-gpt ${revealed >= title.length ? 'in' : ''}`}>GPT</span>
      </h1>

      <div className={`m1-sub ${showSub ? 'in' : ''}`}>
        Your intelligent policy companion.
      </div>

      {/* Microsoft sign-in button */}
      <div style={{
        opacity: showCta ? 1 : 0,
        transform: showCta ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
        transition: 'opacity 0.7s, transform 0.7s cubic-bezier(.32,1.4,.42,1)',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <button
          onClick={handleSignIn}
          disabled={signing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '13px 24px',
            background: signing ? 'rgba(255,255,255,0.06)' : '#ffffff',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 4,
            cursor: signing ? 'default' : 'pointer',
            fontFamily: "'Segoe UI', 'DM Sans', sans-serif",
            fontSize: 15, fontWeight: 600,
            color: signing ? 'rgba(255,255,255,0.5)' : '#1a1a1a',
            letterSpacing: 0,
            transition: 'background 0.25s, color 0.25s, box-shadow 0.25s',
            boxShadow: signing ? 'none' : '0 2px 12px rgba(0,0,0,0.35)',
            minWidth: 260,
            justifyContent: 'center',
          }}
          onMouseEnter={e => { if (!signing) e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)'; }}
          onMouseLeave={e => { if (!signing) e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.35)'; }}
        >
          {signing ? (
            <>
              <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="0"  y="0"  width="9" height="9" fill="rgba(255,255,255,0.25)"/>
                <rect x="11" y="0"  width="9" height="9" fill="rgba(255,255,255,0.25)"/>
                <rect x="0"  y="11" width="9" height="9" fill="rgba(255,255,255,0.25)"/>
                <rect x="11" y="11" width="9" height="9" fill="rgba(255,255,255,0.25)"/>
              </svg>
              Signing in…
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="0"  y="0"  width="9" height="9" fill="#f25022"/>
                <rect x="11" y="0"  width="9" height="9" fill="#7fba00"/>
                <rect x="0"  y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </>
          )}
        </button>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, letterSpacing: '0.16em',
          color: 'var(--ink-4)',
        }}>
          MUSASHI CORPORATE SSO
        </div>
      </div>

      <div className={`m1-landing-foot ${showCta ? 'in' : ''}`}>
        <span>v2026.05</span>
        <span className="m1-dot-sep">•</span>
        <span>EN / 日本語</span>
        <span className="m1-dot-sep">•</span>
        <span>Internal use only</span>
      </div>
    </div>
  );
}

// Individual letter with kana→latin glitch as it resolves
function Letter({ c, revealed, delay }) {
  const [shown, setShown] = React.useState(' ');
  const ALPHA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ';
  React.useEffect(() => {
    if (!revealed) { setShown(' '); return; }
    let n = 0;
    const id = setInterval(() => {
      n++;
      if (n < 7) setShown(ALPHA[Math.floor(Math.random() * ALPHA.length)]);
      else { setShown(c); clearInterval(id); }
    }, 36);
    return () => clearInterval(id);
  }, [revealed, c]);

  if (c === ' ') return <span className="m1-letter-space"> </span>;
  return <span className={`m1-letter ${revealed ? 'in' : ''}`}>{shown}</span>;
}

// ── Scope selection ─────────────────────────────────────────────────────
function ScopePanel({ onPick }) {
  return (
    <div className="m1-step">
      <StepHeader eyebrow="01 — Scope" title="Choose your policy scope." />
      <div className="m1-scope-grid">
        <ScopeCard
          tag="GLOBAL"
          title="Global Policies"
          desc="Universal, company-wide guidance. Applies to every region and plant."
          stat="139 docs"
          accent="#4DBEFF"
          onClick={() => onPick('global')}
        />
        <ScopeCard
          tag="LOCAL"
          title="Local Policies"
          desc="Region- and plant-specific procedures, codes, and HR handbooks."
          stat="17 plants"
          accent="#FF5C4D"
          onClick={() => onPick('local')}
        />
      </div>
    </div>
  );
}

function ScopeCard({ tag, title, desc, stat, accent, onClick }) {
  const ref = React.useRef(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width  - 0.5;
    const py = (e.clientY - r.top)  / r.height - 0.5;
    setTilt({ x: py * -8, y: px * 10 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <button
      ref={ref}
      className="m1-scope-card"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        '--accent': accent,
      }}
    >
      <div className="m1-scope-tag">{tag}</div>
      <div className="m1-scope-title">{title}</div>
      <div className="m1-scope-desc">{desc}</div>
      <div className="m1-scope-foot">
        <span className="m1-scope-stat">{stat}</span>
        <span className="m1-scope-arrow">
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M3 10h14M11 4l6 6-6 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </div>
      <div className="m1-scope-glow"></div>
    </button>
  );
}

// ── Function selection (6 modules) ──────────────────────────────────────
const FUNCTIONS = [
  { id: 'hr',         name: 'HR Policies',        desc: 'Vacation, harassment, AODA, attendance, leave.', stat: '477 chunks', live: true },
  { id: 'finance',    name: 'Finance',            desc: 'Expense, procurement, budgets, compliance.',     stat: 'Preview',    live: false },
  { id: 'quality',    name: 'Quality',            desc: 'ISO standards, inspection, defect management.',  stat: 'Preview',    live: false },
  { id: 'compliance', name: 'Compliance & Audit', desc: 'Regulatory, audit procedures, governance.',      stat: 'Preview',    live: false },
  { id: 'it',         name: 'IT Policies',        desc: 'Acceptable use, security, access control.',      stat: 'Preview',    live: false },
  { id: 'other',      name: 'Other Policies',     desc: 'Travel, communications, EH&S, miscellaneous.',   stat: 'Preview',    live: false },
];

function FunctionIcon({ id }) {
  // Small line-art SVGs for each module (no emoji)
  const stroke = { stroke: 'currentColor', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'hr':         return (<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="10" r="4" {...stroke}/><path d="M5 24c1.5-4.5 5-7 9-7s7.5 2.5 9 7" {...stroke}/></svg>);
    case 'finance':    return (<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 4v20M9 8h7a3 3 0 010 6h-4a3 3 0 000 6h7" {...stroke}/></svg>);
    case 'quality':    return (<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3l2.8 6 6.5.6-4.9 4.4 1.5 6.4L14 17l-5.9 3.4 1.5-6.4L4.7 9.6 11.2 9 14 3z" {...stroke}/></svg>);
    case 'compliance': return (<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3l9 3v6c0 6-4 11-9 13-5-2-9-7-9-13V6l9-3z" {...stroke}/><path d="M10 14l3 3 5-6" {...stroke}/></svg>);
    case 'it':         return (<svg width="28" height="28" viewBox="0 0 28 28"><rect x="4" y="6" width="20" height="13" rx="1.5" {...stroke}/><path d="M10 23h8M14 19v4" {...stroke}/></svg>);
    case 'other':      return (<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="7"  cy="14" r="2" {...stroke}/><circle cx="14" cy="14" r="2" {...stroke}/><circle cx="21" cy="14" r="2" {...stroke}/></svg>);
  }
}

function FunctionPanel({ scope, onPick }) {
  const eyebrow = scope === 'global' ? '02 — Global' : '02 — Local';
  return (
    <div className="m1-step m1-function-step">
      <StepHeader eyebrow={eyebrow} title="Choose a policy domain." />
      <div className="m1-func-grid">
        {FUNCTIONS.map(f => (
          <button
            key={f.id}
            className={`m1-func-card ${f.live ? 'live' : 'preview'}`}
            onClick={() => onPick(f.id, f.live)}
          >
            <div className="m1-func-head">
              <div className="m1-func-icon"><FunctionIcon id={f.id} /></div>
              <div className={`m1-func-badge ${f.live ? 'live' : ''}`}>
                {f.live ? <><span className="m1-func-badge-dot"></span>LIVE</> : 'PREVIEW'}
              </div>
            </div>
            <div className="m1-func-name">{f.name}</div>
            <div className="m1-func-desc">{f.desc}</div>
            <div className="m1-func-foot">
              <span>{f.stat}</span>
              <span className="m1-func-arrow">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Local method (Region vs Plant) ──────────────────────────────────────
function LocalMethodPanel({ onPick }) {
  return (
    <div className="m1-step">
      <StepHeader eyebrow="02 — Local" title="How would you like to narrow it down?" />
      <div className="m1-method-grid">
        <MethodCard
          icon="globe"
          title="By Region"
          desc="Browse all five regional groupings."
          onClick={() => onPick('region')}
        />
        <MethodCard
          icon="grid"
          title="By Plant"
          desc="Pick a specific company code (1500 – 8G00)."
          onClick={() => onPick('plant')}
        />
      </div>
    </div>
  );
}

function MethodCard({ icon, title, desc, onClick }) {
  return (
    <button className="m1-method-card" onClick={onClick}>
      <div className="m1-method-icon">
        {icon === 'globe' ? (
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.3"/>
            <ellipse cx="18" cy="18" rx="14" ry="6" stroke="currentColor" strokeWidth="1.3"/>
            <ellipse cx="18" cy="18" rx="6" ry="14" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="4" y1="18" x2="32" y2="18" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
        ) : (
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="5"  y="5"  width="10" height="10" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="21" y="5"  width="10" height="10" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="5"  y="21" width="10" height="10" stroke="currentColor" strokeWidth="1.3"/>
            <rect x="21" y="21" width="10" height="10" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.18"/>
          </svg>
        )}
      </div>
      <div className="m1-method-title">{title}</div>
      <div className="m1-method-desc">{desc}</div>
      <div className="m1-method-foot">Continue <span>→</span></div>
    </button>
  );
}

// ── Region selection (uses the globe behind) ────────────────────────────
function RegionPanel({ hoverRegion, onHoverRegion, onPick, zooming, selectedRegion }) {
  return (
    <div className={`m1-step m1-region-step ${zooming ? 'zooming' : ''}`}>
      <StepHeader eyebrow="03 — Region" title="Select a region." inline />
      <div className="m1-region-arc">
        {REGION_KEYS.map((k, i) => {
          const meta = REGION_META[k];
          const active = hoverRegion === k;
          const isSelected = selectedRegion === k;
          return (
            <button
              key={k}
              className={`m1-region-tile ${active ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
              onMouseEnter={() => !zooming && onHoverRegion(k)}
              onMouseLeave={() => !zooming && onHoverRegion(null)}
              onClick={() => !zooming && onPick(k)}
              disabled={zooming}
              style={{ '--accent': meta.accent }}
            >
              <div className="m1-region-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="m1-region-name">{meta.label}</div>
              <div className="m1-region-sub">{meta.sub}</div>
              <div className="m1-region-bar"></div>
            </button>
          );
        })}
      </div>
      <div className="m1-region-hint">
        {zooming
          ? <>Zooming into <strong>{REGION_META[selectedRegion]?.label}</strong>…</>
          : 'Hover to spin the globe · Click to connect'}
      </div>
    </div>
  );
}

// ── Plant selection (collapsible regions, chips) ────────────────────────
function PlantPanel({ onPick }) {
  const [openRegion, setOpenRegion] = React.useState('Japan');
  const grouped = {};
  PLANTS_DATA.forEach(p => { (grouped[p.region] = grouped[p.region] || []).push(p); });

  return (
    <div className="m1-step m1-plant-step">
      <StepHeader eyebrow="03 — Plant" title="Select your company." />
      <div className="m1-plant-groups">
        {Object.entries(grouped).map(([region, plants]) => {
          const key = region.toLowerCase();
          const meta = REGION_META[key] || { accent: '#fff' };
          const open = openRegion === region;
          return (
            <div key={region} className={`m1-plant-group ${open ? 'open' : ''}`} style={{ '--accent': meta.accent }}>
              <button
                className="m1-plant-region-head"
                onClick={() => setOpenRegion(open ? null : region)}
              >
                <span className="m1-plant-region-dot"></span>
                <span className="m1-plant-region-name">{region}</span>
                <span className="m1-plant-region-count">{plants.length}</span>
                <span className="m1-plant-region-caret">{open ? '−' : '+'}</span>
              </button>
              <div className="m1-plant-chips" style={{ maxHeight: open ? 200 : 0 }}>
                {plants.map(p => (
                  <button
                    key={p.code}
                    className="m1-plant-chip"
                    onClick={() => onPick(key, p)}
                  >
                    <span className="m1-plant-chip-code">{p.code}</span>
                    <span className="m1-plant-chip-name">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Global "connecting" interstitial ────────────────────────────────────
function ConnectingPanel({ label }) {
  return (
    <div className="m1-step m1-connecting">
      <div className="m1-conn-rings">
        <span></span><span></span><span></span>
      </div>
      <div className="m1-conn-label">Connecting you to</div>
      <div className="m1-conn-agent">{label}</div>
      <div className="m1-conn-shimmer"></div>
    </div>
  );
}

// ── Scramble text animation ───────────────────────────────────────────────────
// Each newly streamed character cycles through random symbols for ~180ms
// before snapping to the real character. Only used for agent messages.
const _SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#@$%&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const _SCRAMBLE_MS    = 180;  // duration per character
const _SCRAMBLE_LAG   = 12;   // ms stagger between successive chars

function ScrambleText({ text }) {
  const [displayed, setDisplayed] = React.useState(text);
  const sRef = React.useRef({ text, active: [], rafId: null });

  React.useEffect(() => {
    const s = sRef.current;
    const prevLen = s.text.length;
    s.text = text;

    if (text.length < prevLen) {
      s.active = [];
      setDisplayed(text);
      return;
    }

    const now = performance.now();
    for (let i = prevLen; i < text.length; i++) {
      const c = text[i];
      if (c !== ' ' && c !== '\n' && c !== '\t') {
        s.active.push({ index: i, endMs: now + _SCRAMBLE_MS + (i - prevLen) * _SCRAMBLE_LAG });
      }
    }

    if (s.rafId) return; // loop already running — it will pick up new entries

    const animate = () => {
      const now = performance.now();
      const chars = sRef.current.text.split('');
      sRef.current.active = sRef.current.active.filter(({ index, endMs }) => {
        if (now >= endMs || index >= chars.length) return false;
        chars[index] = _SCRAMBLE_CHARS[Math.floor(Math.random() * _SCRAMBLE_CHARS.length)];
        return true;
      });
      setDisplayed(chars.join(''));
      if (sRef.current.active.length > 0) {
        sRef.current.rafId = requestAnimationFrame(animate);
      } else {
        sRef.current.rafId = null;
        setDisplayed(sRef.current.text);
      }
    };
    s.rafId = requestAnimationFrame(animate);
  }, [text]);

  React.useEffect(() => () => {
    if (sRef.current.rafId) cancelAnimationFrame(sRef.current.rafId);
  }, []);

  return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>;
}

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8501'
  : '/api';

// ── Chat ────────────────────────────────────────────────────────────────
function ChatPanel({ breadcrumb, onBack, agentLabel, accent }) {
  const [messages, setMessages] = React.useState([
    { role: 'agent', text: `Connected to ${agentLabel}. Ask me anything about your policies — I'll cite sources from indexed documents.` },
  ]);
  const [sources, setSources] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [thinking, setThinking] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = async () => {
    const q = input.trim();
    if (!q || thinking) return;
    setInput('');

    // Build prior-turn history (skip the initial greeting, exclude current query)
    const apiHistory = messages
      .slice(1)
      .map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.text }));

    setMessages(m => [...m, { role: 'user', text: q }]);
    setThinking(true);
    setSources([]);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, history: apiHistory, agent_label: agentLabel }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let agentText = '';
      let buffer = '';
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep any incomplete trailing line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const payload = JSON.parse(data);
            if (payload.sources) {
              setSources(payload.sources);
              continue;
            }
            if (payload.text) {
              if (firstToken) {
                setThinking(false);
                setMessages(m => [...m, { role: 'agent', text: '' }]);
                firstToken = false;
              }
              agentText += payload.text;
              setMessages(m => [...m.slice(0, -1), { role: 'agent', text: agentText }]);
            }
          } catch {}
        }
      }
      // Ensure thinking is off even if no tokens arrived
      setThinking(false);
    } catch (e) {
      setThinking(false);
      setMessages(m => [...m, { role: 'agent', text: `Could not reach the backend API (${e.message}). Make sure the API server is running: .\\run.ps1` }]);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="m1-chat" style={{ '--accent': accent || '#4DBEFF' }}>
      <div className="m1-chat-head">
        <button className="m1-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M13 7H1M6 2L1 7l5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div className="m1-breadcrumb">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="m1-bc-sep">›</span>}
              <span className={i === breadcrumb.length - 1 ? 'm1-bc-current' : ''}>{b}</span>
            </React.Fragment>
          ))}
        </div>
        <div className="m1-chat-status">
          <span className="m1-status-dot"></span>
          Live
        </div>
      </div>

      <div className="m1-chat-scroll" ref={scrollRef}>
        <div className="m1-chat-thread">
          {messages.map((m, i) => (
            <div key={i} className={`m1-msg m1-msg-${m.role}`}>
              {m.role === 'agent' && <div className="m1-msg-avatar">◉</div>}
              <div className="m1-msg-bubble">
                {m.role === 'agent' ? <ScrambleText text={m.text} /> : m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="m1-msg m1-msg-agent">
              <div className="m1-msg-avatar">◉</div>
              <div className="m1-msg-bubble m1-msg-thinking">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="m1-chat-inputwrap">
        <div className="m1-chat-input">
          <input
            autoFocus
            type="text"
            placeholder="Ask about a policy…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button
            className="m1-chat-send"
            onClick={send}
            disabled={!input.trim() || thinking}
          >
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div className="m1-chat-foot">
          <span>Agent: <strong>{agentLabel}</strong></span>
          <span className="m1-chat-foot-sep">•</span>
          <span>RAG · Pinecone + Supabase · Claude</span>
        </div>
        {sources.length > 0 && (
          <div style={{ maxWidth: 760, margin: '10px auto 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sources.map((s, i) => (
              <span key={i} style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, letterSpacing: '0.12em',
                color: 'var(--ink-3)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '3px 8px',
              }}>
                {s.document_name}{s.section_title ? ` › ${s.section_title}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────
function StepHeader({ eyebrow, title, inline }) {
  return (
    <div className={`m1-step-head ${inline ? 'inline' : ''}`}>
      <div className="m1-step-eyebrow">{eyebrow}</div>
      <h2 className="m1-step-title">{title}</h2>
    </div>
  );
}

Object.assign(window, {
  Panel, Landing, ScopePanel, FunctionPanel, LocalMethodPanel,
  RegionPanel, PlantPanel, ConnectingPanel, ChatPanel,
  REGION_KEYS, REGION_META, PLANTS_DATA, FUNCTIONS,
});
