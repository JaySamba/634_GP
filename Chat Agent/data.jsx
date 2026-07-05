/* Mock data for the Musashi One HR chat */

const USER = {
  firstName: "Aiden",
  fullName: "Aiden Tanaka",
  email: "aiden.tanaka@musashi-auto.com",
  title: "Senior Process Engineer",
  department: "Manufacturing Engineering",
  tenant: "MUSASHI AUTO PARTS CANADA",
  initials: "AT",
  status: "online", // online | away
};

const AGENT = {
  name: "Americas — HR Policies",
  shortName: "Americas HR",
  scope: "Local",
  region: "Americas",
  stack: ["RAG", "Pinecone", "Supabase", "Claude"],
};

// Chat history (grouped by date)
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

// Templates / suggestions
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

// Slash commands
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

// Citation documents (referenced by id)
const DOCS = {
  "hs-pp-49a": {
    id: "hs-pp-49a",
    code: "HS-PP-49A",
    title: "Harassment Policy Statement",
    version: "2025 Revision",
    section: "Reporting Procedure",
    page: 4,
    updated: "Mar 12, 2025",
    owner: "HR — Americas",
    excerpt: "Any employee who believes they have been subjected to harassment must report the incident to their direct supervisor, the HR department, or any member of management within fourteen (14) calendar days of the most recent incident. Reports may be made verbally or in writing, and Musashi will treat all such reports with the highest level of confidentiality permissible by law.",
    fullText: [
      { type: "h", text: "1. Purpose" },
      { type: "p", text: "Musashi Auto Parts Canada is committed to providing a workplace free from harassment and discrimination of any kind. This policy establishes the process for reporting, investigating, and resolving harassment complaints." },
      { type: "h", text: "2. Definitions" },
      { type: "p", text: "**Harassment** means engaging in a course of vexatious comment or conduct against an employee in the workplace that is known or ought reasonably to be known to be unwelcome." },
      { type: "h", text: "3. Reporting Procedure" },
      { type: "p", text: "Any employee who believes they have been subjected to harassment must report the incident to their direct supervisor, the HR department, or any member of management within **fourteen (14) calendar days** of the most recent incident." },
      { type: "p", text: "Reports may be made **verbally or in writing**, and Musashi will treat all such reports with the highest level of confidentiality permissible by law." },
      { type: "h", text: "4. Investigation" },
      { type: "p", text: "The HR department will commence an investigation within five (5) business days of receiving a report. The investigation will be conducted by a neutral party and may include interviews with the complainant, respondent, and any witnesses." },
    ],
  },
  "ps-cust-priv": {
    id: "ps-cust-priv",
    code: "PS-CUST-PRIV",
    title: "PS Customer Privacy Statement",
    version: "v3.1",
    section: "Data Collection",
    page: 2,
    updated: "Jan 22, 2025",
    owner: "Legal & Compliance",
    excerpt: "We collect information directly from you when you submit a customer inquiry, place an order, or interact with our representatives. This may include your name, contact details, employer information, and any specifications relevant to your inquiry.",
    fullText: [
      { type: "h", text: "WE COLLECT INFORMATION FROM" },
      { type: "p", text: "We collect information directly from you when you submit a customer inquiry, place an order, or interact with our representatives." },
      { type: "h", text: "HOW WE USE INFORMATION ABOUT YOU" },
      { type: "p", text: "Information collected is used to fulfill orders, respond to inquiries, and improve service quality. We do not sell personal information to third parties." },
    ],
  },
  "hr-pp-45": {
    id: "hr-pp-45",
    code: "HR-PP-45",
    title: "Monthly Managers Meetings",
    version: "2024 Edition",
    section: "Procedure",
    page: 3,
    updated: "Sep 4, 2024",
    owner: "HR — Operations",
    excerpt: "All department managers are required to attend the monthly managers meeting held on the second Thursday of each month at 09:00 EST. Agendas are circulated three (3) business days in advance via Outlook calendar invitation.",
    fullText: [
      { type: "h", text: "PROCEDURE" },
      { type: "p", text: "All department managers are required to attend the monthly managers meeting held on the **second Thursday** of each month at 09:00 EST." },
      { type: "p", text: "Agendas are circulated three (3) business days in advance via Outlook calendar invitation. Standing agenda items include: safety report, headcount changes, training updates, and open HR matters." },
    ],
  },
  "hr-vac-2025": {
    id: "hr-vac-2025",
    code: "HR-VAC-2025",
    title: "Vacation Entitlement & Carryover Policy",
    version: "2025",
    section: "Carryover Provisions",
    page: 5,
    updated: "Nov 1, 2024",
    owner: "HR — Americas",
    excerpt: "Employees may carry forward a maximum of five (5) unused vacation days into the next calendar year, provided the carryover is approved by the employee's direct manager before December 15. Days carried over must be used by March 31 of the following year, or they are forfeited.",
    fullText: [
      { type: "h", text: "Entitlement by Tenure" },
      { type: "p", text: "Vacation entitlement is calculated based on continuous service as of January 1 of the vacation year:" },
      { type: "p", text: "• 0–1 years: 2 weeks (10 days)\n• 1–5 years: 3 weeks (15 days)\n• 5–10 years: 4 weeks (20 days)\n• 10+ years: 5 weeks (25 days)" },
      { type: "h", text: "Carryover Provisions" },
      { type: "p", text: "Employees may carry forward a **maximum of five (5) unused vacation days** into the next calendar year, provided the carryover is approved by the employee's direct manager **before December 15**." },
      { type: "p", text: "Days carried over must be used by **March 31** of the following year, or they are forfeited. Carryover requests are submitted through Workday → Time Off → Carryover Request." },
    ],
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
    excerpt: "Full-time employees are entitled to up to five (5) consecutive working days of paid bereavement leave upon the death of an immediate family member. Up to two (2) additional unpaid days may be granted for travel when the funeral is outside the country of employment.",
    fullText: [
      { type: "h", text: "Eligibility" },
      { type: "p", text: "Full-time employees are entitled to up to **five (5) consecutive working days** of paid bereavement leave upon the death of an immediate family member." },
      { type: "p", text: "Up to **two (2) additional unpaid days** may be granted for travel when the funeral is outside the country of employment." },
    ],
  },
};

// The seeded conversation (chat c3 — Vacation carryover into 2026)
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
