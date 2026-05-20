/* Mock data for the Musashi One HR chat */

// USER is derived from the MS auth result set by musashi-one/app.jsx,
// falling back to a guest placeholder when no auth has occurred.
const USER = (function () {
  const mu = window.__musashi_user;
  if (mu && !mu.isGuest) {
    const names = (mu.displayName || mu.name || "").trim().split(/\s+/);
    return {
      firstName: names[0] || "User",
      fullName: mu.displayName || mu.name || "User",
      email: mu.email || "",
      title: mu.jobTitle || "Employee",
      department: mu.department || "Musashi Auto Parts",
      tenant: "MUSASHI AUTO PARTS CANADA",
      initials: names.filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U",
      status: "online",
      isGuest: false,
    };
  }
  return {
    firstName: "Guest",
    fullName: "Guest User",
    email: "",
    title: "Employee",
    department: "Musashi Auto Parts",
    tenant: "MUSASHI AUTO PARTS CANADA",
    initials: "GU",
    status: "online",
    isGuest: true,
  };
})();

const AGENT = {
  name: "Americas — HR Policies",
  shortName: "Americas HR",
  scope: "Local",
  region: "Americas",
  stack: ["RAG", "Pinecone", "Supabase", "Claude"],
};

// Chat history (grouped by date) — placeholder until real DB history loads
const CHAT_HISTORY = [
  {
    group: "pinned",
    items: [
      { id: "c1", title: "Bereavement leave — out-of-country travel", pinned: true, agent: "Americas HR", folder: "Leave & Time Off" },
      { id: "c2", title: "Harassment policy — reporting steps", pinned: true, agent: "Americas HR", folder: "Workplace Conduct" },
    ],
  },
  {
    group: "today",
    label: "Today",
    items: [
      { id: "c3", title: "Vacation carryover into 2026", agent: "Americas HR", folder: "Leave & Time Off", active: true },
      { id: "c4", title: "Monthly managers meeting — agenda template", agent: "Americas HR", folder: "Manager Resources" },
    ],
  },
  {
    group: "yesterday",
    label: "Yesterday",
    items: [
      { id: "c5", title: "Maternity leave top-up calculation", agent: "Americas HR" },
      { id: "c6", title: "Statutory holidays — Ontario vs Quebec", agent: "Americas HR" },
      { id: "c7", title: "Probation period for new hire — IT department", agent: "Americas HR" },
    ],
  },
  {
    group: "week",
    label: "Last 7 days",
    items: [
      { id: "c8", title: "Customer privacy statement — section on data retention", agent: "Americas HR" },
      { id: "c9", title: "Remote work eligibility for plant roles", agent: "Americas HR" },
      { id: "c10", title: "Tuition reimbursement application process", agent: "Americas HR" },
      { id: "c11", title: "Performance review cycle dates", agent: "Americas HR" },
    ],
  },
  {
    group: "older",
    label: "Older",
    items: [
      { id: "c12", title: "Workplace violence reporting form", agent: "Americas HR" },
      { id: "c13", title: "Benefits enrollment window 2025", agent: "Americas HR" },
      { id: "c14", title: "Travel expense reimbursement limits", agent: "Americas HR" },
    ],
  },
];

const FOLDERS = [
  { id: "f1", name: "Leave & Time Off", count: 8 },
  { id: "f2", name: "Workplace Conduct", count: 4 },
  { id: "f3", name: "Manager Resources", count: 6 },
  { id: "f4", name: "Benefits", count: 3 },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "americas", label: "Americas HR" },
  { id: "starred", label: "Starred" },
  { id: "shared", label: "Shared" },
];

const TEMPLATE_CATEGORIES = [
  { id: "vacation", label: "Leave & Vacation", icon: "calendar" },
  { id: "manager", label: "Manager Questions", icon: "users" },
  { id: "general", label: "General HR", icon: "help" },
  { id: "policy", label: "Policy Lookup", icon: "book" },
];

const TEMPLATES = {
  vacation: [
    { title: "How many vacation days do I get?", desc: "Look up your entitlement based on tenure and location.", prompt: "How many vacation days am I entitled to as a salaried employee with 4 years of tenure in Canada?" },
    { title: "Carryover rules for unused days", desc: "Maximum days you can roll into next year.", prompt: "What are the rules for carrying over unused vacation days into the next calendar year?" },
    { title: "Booking time off — process", desc: "Step-by-step for submitting a vacation request.", prompt: "Walk me through the process of booking vacation time, including approval timelines." },
    { title: "Bereavement & compassionate leave", desc: "Eligibility, days, and required documentation.", prompt: "What is the bereavement leave policy, including days off and required documentation?" },
  ],
  manager: [
    { title: "Hiring a new direct report", desc: "Approvals, posting, and onboarding checklist.", prompt: "I'm hiring a new direct report — what's the end-to-end process from approval to first day?" },
    { title: "Conducting a performance review", desc: "Templates, cadence, and required forms.", prompt: "Walk me through the performance review process for one of my direct reports, including the required forms." },
    { title: "Handling a complaint from a team member", desc: "Initial steps and escalation path.", prompt: "An employee has come to me with a complaint about a coworker. What are my obligations and the next steps?" },
    { title: "Probation period decisions", desc: "Extending, ending, or confirming probation.", prompt: "What are my options at the end of a new hire's probation period, and what documentation do I need?" },
  ],
  general: [
    { title: "Summarize the employee handbook", desc: "Quick overview of key policies you should know.", prompt: "Give me a high-level summary of the most important policies in the employee handbook." },
    { title: "Workplace harassment — what counts?", desc: "Definitions, examples, and how to report.", prompt: "What does the company define as workplace harassment, and how do I report it?" },
    { title: "Benefits enrollment", desc: "When to enroll, what's covered, how to add dependents.", prompt: "When is the benefits enrollment window and what coverage options are available?" },
    { title: "Statutory holidays this year", desc: "Full list by province and observance rules.", prompt: "List the statutory holidays this year for Ontario, including observance rules when they fall on a weekend." },
  ],
  policy: [
    { title: "Find a policy by name", desc: "Search by document ID or topic.", prompt: "/policy " },
    { title: "Show all policies updated this quarter", desc: "Recent changes you should be aware of.", prompt: "Which HR policies have been updated or revised in the last 90 days?" },
    { title: "Compare two policies", desc: "Side-by-side differences.", prompt: "Compare the harassment policy with the workplace violence policy — what are the key differences?" },
    { title: "Policy I haven't acknowledged", desc: "List anything pending your sign-off.", prompt: "Which HR policies require my acknowledgment that I haven't signed off on yet?" },
  ],
};

const SLASH_COMMANDS = [
  { cmd: "/policy", desc: "Look up a specific policy document by ID or name", icon: "book" },
  { cmd: "/summarize", desc: "Summarize a policy or section in plain language", icon: "list" },
  { cmd: "/compare", desc: "Compare two policies or sections", icon: "compare" },
  { cmd: "/find", desc: "Find a specific clause across all HR documents", icon: "search" },
  { cmd: "/explain", desc: "Explain a clause in simple terms", icon: "lightbulb" },
  { cmd: "/checklist", desc: "Generate a step-by-step checklist for a process", icon: "check" },
  { cmd: "/contact", desc: "Find the right HR contact for a topic", icon: "phone" },
  { cmd: "/template", desc: "Insert a templated question", icon: "templates" },
];

// Citation documents — populated dynamically by the streaming handler as sources arrive.
// Pre-seeded with sample docs for the demo sidebar items.
const DOCS = {
  "hr-vac-2025": {
    id: "hr-vac-2025",
    code: "HR-VAC-2025",
    title: "Vacation Entitlement & Carryover Policy",
    version: "2025",
    section: "Carryover Provisions",
    page: 5,
    updated: "Nov 1, 2024",
    owner: "HR — Americas",
    excerpt: "Employees may carry forward a maximum of five (5) unused vacation days into the next calendar year, provided the carryover is approved by the employee's direct manager before December 15.",
    fullText: [],
  },
  "hr-bereave": {
    id: "hr-bereave",
    code: "HR-BEREAVE",
    title: "Bereavement Leave Policy",
    version: "2024",
    section: "Eligibility",
    page: 2,
    updated: "Jun 18, 2024",
    owner: "HR — Americas",
    excerpt: "Full-time employees are entitled to up to five (5) consecutive working days of paid bereavement leave upon the death of an immediate family member.",
    fullText: [],
  },
};

// Seeded demo conversation (shown when sidebar item c3 is selected)
const SEEDED_MESSAGES = [
  {
    role: "user",
    content: "Hey — I have 8 unused vacation days left for this year and I'm trying to figure out what happens to them. Can I roll all of them into 2026, or do I lose some?"
  },
  {
    role: "assistant",
    content: "Great question — here's what Musashi's current vacation policy says about carryover into the next calendar year.\n\n### Carryover cap\nYou can carry forward a **maximum of 5 unused vacation days** into 2026 [[1]]. Since you have 8 days remaining, that means **3 days would be at risk of being forfeited** unless you use them before December 31.\n\n### What you need to do\n\n1. **Submit a carryover request before December 15** — this is a hard deadline. Requests go through Workday → Time Off → Carryover Request [[1]].\n2. **Get approval from your direct manager** — carryover is not automatic, it must be explicitly approved.\n3. **Use the carried-over days by March 31, 2026** — anything not used by then is forfeited [[1]].\n\n### Your options for the remaining 3 days\n\n| Option | Outcome |\n|---|---|\n| Book them before year-end | Keep all 8 days |\n| Request carryover only (max 5) | Lose 3 days |\n| Check if a payout applies | Depends on your employment agreement — confirm with HR |\n\nIf you'd like, I can also pull up the bereavement or unpaid leave policies in case you're trying to bridge a longer absence [[2]]. Just let me know.",
    citations: ["hr-vac-2025", "hr-bereave"],
  },
];

Object.assign(window, { USER, AGENT, CHAT_HISTORY, FOLDERS, FILTERS, TEMPLATE_CATEGORIES, TEMPLATES, SLASH_COMMANDS, DOCS, SEEDED_MESSAGES });
