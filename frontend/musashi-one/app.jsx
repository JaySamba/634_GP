// Musashi One GPT — main App: state machine, shader switcher, globe lifecycle.

const { useState, useEffect, useRef, useCallback } = React;

const SHADER_LIST = [
  { id: 'mercury',   label: 'Liquid Mercury' },
  { id: 'plasma',    label: 'Plasma Field' },
  { id: 'topo',      label: 'Wireframe Topo' },
  { id: 'particles', label: 'Constellation' },
  { id: 'glass',     label: 'Refraction Glass' },
];

// Stub — backend team replaces this.
function routeToAgent(scope, fn, region, companyCode) {
  console.log('[routeToAgent]', { scope, fn, region, companyCode });
  return `${scope}/${fn || 'all'}${region ? '/' + region : ''}${companyCode ? '/' + companyCode : ''}`;
}
window.routeToAgent = routeToAgent;

function ShaderSwitcher({ value, onChange }) {
  return (
    <div className="m1-shaderswitch">
      <div className="m1-shaderswitch-label">WALLPAPER</div>
      <div className="m1-shaderswitch-row">
        {SHADER_LIST.map(s => (
          <button
            key={s.id}
            className={`m1-shader-pip ${value === s.id ? 'active' : ''}`}
            onClick={() => onChange(s.id)}
            title={s.label}
          >
            <span className={`m1-shader-pip-inner pip-${s.id}`}></span>
          </button>
        ))}
      </div>
      <div className="m1-shaderswitch-name">
        {SHADER_LIST.find(s => s.id === value)?.label}
      </div>
    </div>
  );
}

function PersistentHeader({ visible, onHome }) {
  return (
    <header className={`m1-header ${visible ? 'in' : ''}`}>
      <button className="m1-header-brand" onClick={onHome}>
        <span className="m1-header-mark">◉</span>
        <span className="m1-header-name">
          <span className="m1-header-musashi">MUSASHI</span>
          <span className="m1-header-one">ONE</span>
          <span className="m1-header-gpt">GPT</span>
        </span>
      </button>
      <div className="m1-header-right">
        <span className="m1-header-status">
          <span className="m1-status-dot"></span>
          ONLINE
        </span>
      </div>
    </header>
  );
}

function App() {
  // step: 'landing' | 'scope' | 'function' | 'localMethod' | 'localRegion' | 'localPlant' | 'connecting' | 'chat'
  const [step, setStep] = useState('landing');
  const [history, setHistory] = useState([]);
  const [scope, setScope] = useState(null);
  const [fn, setFn] = useState(null);                  // function/module
  const [region, setRegion] = useState(null);
  const [hoverRegion, setHoverRegion] = useState(null);
  const [plant, setPlant] = useState(null);
  const [shaderId, setShaderId] = useState('particles');
  const [direction, setDirection] = useState(1);
  const [zooming, setZooming] = useState(false);

  const bgCanvasRef = useRef(null);
  const globeCanvasRef = useRef(null);
  const bgRef = useRef(null);
  const globeRef = useRef(null);
  const onBackRef = useRef(null);

  // Init shader background
  useEffect(() => {
    if (bgCanvasRef.current && !bgRef.current) {
      bgRef.current = new window.ShaderBG(bgCanvasRef.current);
      bgRef.current.setShader(shaderId);
    }
    return () => { if (bgRef.current) { bgRef.current.destroy(); bgRef.current = null; } };
  }, []);

  useEffect(() => { if (bgRef.current) bgRef.current.setShader(shaderId); }, [shaderId]);

  // Globe is mounted only when needed — region / plant / chat-with-region / zooming
  const needGlobe = (step === 'localRegion' || step === 'localPlant' || zooming);
  useEffect(() => {
    if (needGlobe && globeCanvasRef.current && !globeRef.current) {
      globeRef.current = new window.Globe(globeCanvasRef.current);
    }
    if (!needGlobe && globeRef.current) {
      // small fade-out before destroy
      globeRef.current.setOpacity(0);
      const t = setTimeout(() => {
        if (globeRef.current) { globeRef.current.destroy(); globeRef.current = null; }
      }, 700);
      return () => clearTimeout(t);
    }
  }, [needGlobe]);

  // Intercept browser back button and route it through app navigation
  useEffect(() => {
    const handle = () => onBackRef.current?.();
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  // Push hover/selection to the globe each frame target
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.setHovered(hoverRegion);
    globeRef.current.setRegion(region);
  }, [hoverRegion, region, needGlobe]);

  // ── Navigation helpers ───────────────────────────────────────────────
  const go = (next, dir = 1) => {
    setDirection(dir);
    setHistory(h => dir > 0 ? [...h, step] : h.slice(0, -1));
    setStep(next);
    if (dir > 0) window.history.pushState(null, '');
  };

  const onEnter = () => go('scope');

  const onPickScope = (s) => {
    setScope(s);
    setFn(null); setRegion(null); setPlant(null);
    go('function');
  };

  const onPickFunction = (id, isLive) => {
    setFn(id);
    if (scope === 'global') {
      go('connecting');
      setTimeout(() => go('chat'), 1500);
    } else {
      go('localMethod');
    }
  };

  const onPickMethod = (m) => {
    if (m === 'region') go('localRegion');
    else go('localPlant');
  };

  const onPickRegion = async (key) => {
    setRegion(key);
    setHoverRegion(null);
    setZooming(true);
    // Tell globe to do its zoom animation
    if (globeRef.current) {
      globeRef.current.setRegion(key);
      await globeRef.current.zoomTo(key, 1500);
    } else {
      await new Promise(r => setTimeout(r, 1500));
    }
    routeToAgent(scope, fn, key);
    setZooming(false);
    // Go straight into chat (no extra connecting interstitial — the zoom IS the transition)
    setDirection(1);
    setStep('chat');
    setHistory(h => [...h, 'localRegion']);
  };

  const onPickPlant = (regionKey, plantObj) => {
    setRegion(regionKey);
    setPlant(plantObj);
    routeToAgent(scope, fn, regionKey, plantObj.code);
    go('connecting');
    setTimeout(() => go('chat'), 1400);
  };

  const onBack = () => {
    if (step === 'chat') {
      if (plant) { setPlant(null); go('localPlant', -1); }
      else if (region) { setRegion(null); go('localRegion', -1); }
      else go('localMethod', -1);
      return;
    }
    const prev = history[history.length - 1];
    if (prev) go(prev, -1);
    else go('landing', -1);
  };

  // Keep ref current so the popstate listener always calls the latest onBack
  onBackRef.current = onBack;

  const onHome = () => {
    setHistory([]);
    setScope(null); setFn(null); setRegion(null); setPlant(null); setHoverRegion(null);
    setZooming(false);
    setDirection(-1);
    setStep('landing');
  };

  // ── Derived ──────────────────────────────────────────────────────────
  const fnMeta = window.FUNCTIONS.find(f => f.id === fn);
  const breadcrumb = (() => {
    const arr = ['Musashi One'];
    if (scope === 'global') arr.push('Global');
    else if (scope === 'local') arr.push('Local');
    if (fnMeta) arr.push(fnMeta.name);
    if (region) arr.push(window.REGION_META[region]?.label || region);
    if (plant) arr.push(plant.name);
    return arr;
  })();

  const agentLabel = (() => {
    const fnName = fnMeta ? fnMeta.name : 'Policy';
    if (scope === 'global') return `Global ${fnName} Agent`;
    if (plant)  return `${plant.name} · ${fnName}`;
    if (region) return `${window.REGION_META[region]?.label} · ${fnName}`;
    return `${fnName} Agent`;
  })();

  const accent = region ? window.REGION_META[region]?.accent : '#4DBEFF';

  const connectingLabel = (() => {
    if (scope === 'global') return `Global ${fnMeta?.name || 'Policy'} Agent`;
    if (plant)  return plant.name;
    if (region) return `${window.REGION_META[region]?.label} Regional Agent`;
    return 'Agent';
  })();

  const headerVisible = step !== 'landing';

  // Full-screen takeover — replaces the entire m1-root UI when chat is active
  if (step === 'chat') {
    return (
      <window.ChatApp
        onBack={onBack}
        agentLabel={agentLabel}
        scope={scope}
        region={region}
        accent={accent}
      />
    );
  }

  return (
    <div className="m1-root" style={{ '--accent': accent }}>
      <canvas ref={bgCanvasRef} className="m1-bg-canvas"></canvas>

      <div className={`m1-globe-wrap ${needGlobe ? 'in' : ''} ${zooming ? 'zooming' : ''}`}>
        <canvas ref={globeCanvasRef} className="m1-globe-canvas"></canvas>
        <div className="m1-globe-vignette"></div>
      </div>

      <PersistentHeader visible={headerVisible} onHome={onHome} />

      <main className="m1-stage">
        <window.Panel active={step === 'landing'} direction={direction}>
          <window.Landing onEnter={onEnter} />
        </window.Panel>

        <window.Panel active={step === 'scope'} direction={direction}>
          <window.ScopePanel onPick={onPickScope} />
        </window.Panel>

        <window.Panel active={step === 'function'} direction={direction}>
          <window.FunctionPanel scope={scope} onPick={onPickFunction} />
        </window.Panel>

        <window.Panel active={step === 'localMethod'} direction={direction}>
          <window.LocalMethodPanel onPick={onPickMethod} />
        </window.Panel>

        <window.Panel active={step === 'localRegion'} direction={direction}>
          <window.RegionPanel
            hoverRegion={hoverRegion}
            onHoverRegion={setHoverRegion}
            onPick={onPickRegion}
            zooming={zooming}
            selectedRegion={region}
          />
        </window.Panel>

        <window.Panel active={step === 'localPlant'} direction={direction}>
          <window.PlantPanel onPick={onPickPlant} />
        </window.Panel>

        <window.Panel active={step === 'connecting'} direction={direction}>
          <window.ConnectingPanel label={connectingLabel} />
        </window.Panel>

        <window.Panel active={step === 'chat'} direction={direction} className="m1-panel-chat">
          <window.ChatPanel
            breadcrumb={breadcrumb}
            agentLabel={agentLabel}
            accent={accent}
            onBack={onBack}
          />
        </window.Panel>
      </main>

      {(step !== 'landing' && step !== 'chat' && step !== 'connecting' && !zooming) && (
        <button className="m1-floating-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M13 7H1M6 2L1 7l5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
      )}

      <ShaderSwitcher value={shaderId} onChange={setShaderId} />
      <CursorTrail />
    </div>
  );
}

function CursorTrail() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext('2d');
    let w, h;
    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const trail = [];
    const onMove = (e) => { trail.push({ x: e.clientX, y: e.clientY, t: performance.now() }); };
    window.addEventListener('pointermove', onMove);
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      while (trail.length && now - trail[0].t > 600) trail.shift();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        const age = (now - b.t) / 600;
        const alpha = (1 - age) * 0.4;
        ctx.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
        ctx.lineWidth = (1 - age) * 2.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); };
  }, []);
  return <canvas ref={ref} className="m1-cursor-trail" />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
