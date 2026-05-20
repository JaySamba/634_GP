/* Inline SVG icons — all 16x16 stroke-1.6 outline, currentColor */

const Icon = ({ name, size = 16, className = "", style }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.7",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
    "aria-hidden": true,
  };

  switch (name) {
    case "plus":      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":    return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case "panel-l":   return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>;
    case "panel-r":   return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></svg>;
    case "settings":  return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "chev-r":    return <svg {...props}><path d="M9 6l6 6-6 6"/></svg>;
    case "chev-d":    return <svg {...props}><path d="M6 9l6 6 6-6"/></svg>;
    case "folder":    return <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>;
    case "send":      return <svg {...props}><path d="M5 12l14-7-7 14-2-5z"/></svg>;
    case "arrow-u":   return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case "arrow-r":   return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "back":      return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "mic":       return <svg {...props}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>;
    case "paperclip": return <svg {...props}><path d="M21 12.5l-8.5 8.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></svg>;
    case "slash":     return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 16l6-8"/></svg>;
    case "copy":      return <svg {...props}><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>;
    case "refresh":   return <svg {...props}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>;
    case "thumbs-u":  return <svg {...props}><path d="M7 22h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-3l1.5-5A2 2 0 0 0 13.5 4l-4 6H7zM7 22V11"/></svg>;
    case "thumbs-d":  return <svg {...props}><path d="M17 2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3l-1.5 5A2 2 0 0 0 10.5 20l4-6H17zM17 2v11"/></svg>;
    case "edit":      return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case "share":     return <svg {...props}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>;
    case "download":  return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
    case "pin":       return <svg {...props}><path d="M12 17v5M9 3l6 0 1 4-2 1v5l3 2H7l3-2V8L8 7z"/></svg>;
    case "trash":     return <svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    case "dots":      return <svg {...props}><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/></svg>;
    case "archive":   return <svg {...props}><rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/></svg>;
    case "x":         return <svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case "moon":      return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>;
    case "sun":       return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "keyboard":  return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></svg>;
    case "stop":      return <svg {...props}><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/></svg>;
    case "calendar":  return <svg {...props}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "users":     return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0M17 11a3 3 0 1 0 0-6M22 21a5.5 5.5 0 0 0-4.5-5.4"/></svg>;
    case "help":      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01"/></svg>;
    case "book":      return <svg {...props}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5a2.5 2.5 0 0 0 0 5H20"/></svg>;
    case "list":      return <svg {...props}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>;
    case "compare":   return <svg {...props}><path d="M9 3v18M15 3v18M3 9h6M15 9h6M3 15h6M15 15h6"/></svg>;
    case "lightbulb": return <svg {...props}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3v1h6v-1c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z"/></svg>;
    case "check":     return <svg {...props}><path d="M5 12l5 5L20 7"/></svg>;
    case "check-c":   return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>;
    case "phone":     return <svg {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.4 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z"/></svg>;
    case "templates": return <svg {...props}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>;
    case "file":      return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    case "file-doc":  return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>;
    case "external":  return <svg {...props}><path d="M15 3h6v6M10 14L21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>;
    case "log-out":   return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>;
    case "switch":    return <svg {...props}><path d="M7 4v16M17 4v16M3 8l4-4 4 4M21 16l-4 4-4-4"/></svg>;
    case "user-c":    return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>;
    case "warning":   return <svg {...props}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>;
    case "sparkle":   return <svg {...props}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z"/></svg>;
    case "ms-logo":   return <svg width={size} height={size} viewBox="0 0 23 23" className={className} style={style} aria-hidden="true"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/></svg>;
    default: return null;
  }
};

window.Icon = Icon;
