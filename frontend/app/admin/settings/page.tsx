"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  Award,
  Bell,
  Camera,
  Cpu,
  Eye,
  Globe,
  HelpCircle,
  Lock,
  Mic,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, PillTabs, ToggleSwitch } from "@/components/admin/ui";
import { MountPoint } from "@/plugins";
import { IntervalSlider, ProctorRow } from "@/plugins/proctoringControls";

type Tab = "proctoring" | "general" | "scoring" | "notifications" | "integrations";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <div style={{ marginBottom: 14 }}>
        <h3 className="admin-card-title">{title}</h3>
        {subtitle && <p className="admin-card-subtitle">{subtitle}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </Card>
  );
}

function ProctoringTab() {
  const [autoTerminate, setAutoTerminate] = useState(false);
  const [warningBeforeAction, setWarningBeforeAction] = useState(10);
  const [recordSession, setRecordSession] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  const activeLayers = [
    { icon: <Camera size={13} />, label: "Webcam" },
    { icon: <Mic size={13} />, label: "Microphone" },
    { icon: <Lock size={13} />, label: "Fullscreen" },
    { icon: <Sparkles size={13} />, label: "AI monitoring" },
    { icon: <ShieldCheck size={13} />, label: "Identity" },
    { icon: <Globe size={13} />, label: "Network" },
  ];

  return (
    <div className="split-1-aside">
      <div className="admin-proctor-stack">
        <MountPoint id="settings.proctoring" />
      </div>

      <aside className="sticky-rail">
        <Card>
          <div className="admin-control-row">
            <div>
              <h3 className="admin-card-title" style={{ fontSize: 14 }}>Candidate view preview</h3>
              <p className="admin-card-subtitle">How protections appear to the candidate.</p>
            </div>
            <Badge tone="red" dot>LIVE</Badge>
          </div>
          <div className="admin-proctor-preview">
            <span className="admin-proctor-preview-q admin-mono">Q12 / 30</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <p className="admin-stat-label" style={{ marginBottom: 8 }}>Active layers</p>
            {activeLayers.map((row) => (
              <div
                key={row.label}
                className="admin-row"
                style={{
                  padding: "6px 0",
                  color: "var(--admin-fg-2)",
                  fontSize: 12,
                }}
              >
                {row.icon}
                <span style={{ flex: 1 }}>{row.label}</span>
                <span
                  className="admin-dot"
                  style={{
                    width: 8,
                    height: 8,
                    background: "var(--admin-green)",
                    boxShadow: "0 0 8px var(--admin-green-glow)",
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="admin-card-title" style={{ fontSize: 14 }}>Auto-Actions</h3>
          <p className="admin-card-subtitle">What the engine does automatically when limits are exceeded.</p>
          <div className="admin-proctor-card-body" style={{ marginTop: 12 }}>
            <ProctorRow
              label="Auto-terminate on critical flag"
              control={<ToggleSwitch checked={autoTerminate} onChange={setAutoTerminate} />}
            />
            <ProctorRow
              label="Warning before action"
              hint="Seconds the candidate sees a warning before auto-action."
              control={
                <IntervalSlider
                  value={warningBeforeAction}
                  onChange={setWarningBeforeAction}
                  min={0}
                  max={60}
                />
              }
            />
            <ProctorRow
              label="Record session"
              control={<ToggleSwitch checked={recordSession} onChange={setRecordSession} />}
            />
            <ProctorRow
              label="Retention (days)"
              control={
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={retentionDays}
                  onChange={(event) => setRetentionDays(Number(event.target.value))}
                  className="admin-field admin-proctor-num"
                />
              }
            />
          </div>
        </Card>
      </aside>
    </div>
  );
}

type DurationUnit = "minutes" | "hours";

const ACCENT_SWATCHES: { key: string; color: string; label: string }[] = [
  { key: "green", color: "#1ed36a", label: "Origin Green" },
  { key: "purple", color: "#8b6df0", label: "Violet" },
  { key: "cyan", color: "#06b6d4", label: "Cyan" },
  { key: "amber", color: "#ffb703", label: "Amber" },
  { key: "pink", color: "#d84c74", label: "Pink" },
];

function GeneralTab() {
  // Session Defaults
  const [duration, setDuration] = useState(60);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("minutes");
  const [questions, setQuestions] = useState(30);
  const [attempts, setAttempts] = useState(1);
  const [timePerQuestionOn, setTimePerQuestionOn] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(60);

  // Behaviour (7 toggles)
  const [shuffle, setShuffle] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [allowReview, setAllowReview] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [adaptive, setAdaptive] = useState(false);
  const [showProgress, setShowProgress] = useState(true);

  // Branding & Customization
  const [titlePrefix, setTitlePrefix] = useState("OriginBI · ");
  const [accent, setAccent] = useState<string>("green");
  const [welcome, setWelcome] = useState(
    "Welcome — read each question carefully and submit when you're confident. Good luck!",
  );

  return (
    <div className="admin-settings-stack">
      <div className="admin-grid-2">
        <Section
          title="Session Defaults"
          subtitle="Applied to every assessment unless overridden in the package."
        >
          <label className="admin-form-label">
            Default duration
            <div className="admin-row" style={{ gap: 8 }}>
              <input
                type="number"
                value={duration}
                min={1}
                onChange={(event) => setDuration(Number(event.target.value))}
                className="admin-field"
                style={{ height: 38, flex: 1 }}
              />
              <select
                className="admin-select"
                value={durationUnit}
                onChange={(event) => setDurationUnit(event.target.value as DurationUnit)}
                style={{ width: 120, height: 38 }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </label>

          <label className="admin-form-label">
            Default # of questions
            <input
              type="number"
              value={questions}
              min={1}
              onChange={(event) => setQuestions(Number(event.target.value))}
              className="admin-field"
              style={{ height: 38 }}
            />
          </label>

          <label className="admin-form-label">
            Allowed attempts
            <input
              type="number"
              value={attempts}
              min={1}
              max={10}
              onChange={(event) => setAttempts(Number(event.target.value))}
              className="admin-field"
              style={{ height: 38 }}
            />
          </label>

          <div className="admin-form-label">
            <div className="admin-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span>Time per question · optional</span>
              <ToggleSwitch checked={timePerQuestionOn} onChange={setTimePerQuestionOn} />
            </div>
            <input
              type="number"
              value={timePerQuestion}
              min={5}
              disabled={!timePerQuestionOn}
              onChange={(event) => setTimePerQuestion(Number(event.target.value))}
              className="admin-field"
              style={{ height: 38, opacity: timePerQuestionOn ? 1 : 0.55 }}
            />
          </div>
        </Section>

        <Section
          title="Behaviour"
          subtitle="Defaults that affect the candidate experience."
        >
          <ToggleSwitch
            checked={shuffle}
            onChange={setShuffle}
            label="Shuffle questions"
            hint="Randomise question order per attempt."
          />
          <ToggleSwitch
            checked={shuffleOptions}
            onChange={setShuffleOptions}
            label="Shuffle answer options"
            hint="Randomise MCQ option order to deter answer sharing."
          />
          <ToggleSwitch
            checked={allowReview}
            onChange={setAllowReview}
            label="Allow review"
            hint="Candidates can revisit and change answers."
          />
          <ToggleSwitch
            checked={showTimer}
            onChange={setShowTimer}
            label="Show timer"
            hint="Visible countdown vs. internal-only timer."
          />
          <ToggleSwitch
            checked={showProgress}
            onChange={setShowProgress}
            label="Show progress indicator"
            hint="Question X of N pill in the candidate header."
          />
          <ToggleSwitch
            checked={autoSubmit}
            onChange={setAutoSubmit}
            label="Auto-submit on timeout"
            hint="Submit attempt automatically when the timer hits zero."
          />
          <ToggleSwitch
            checked={adaptive}
            onChange={setAdaptive}
            label="Adaptive difficulty"
            hint="Tune the next question to the candidate's performance."
          />
        </Section>
      </div>

      <Section
        title="Branding & Customization"
        subtitle="How the exam looks and reads to the candidate."
      >
        <div className="admin-grid-2">
          <label className="admin-form-label">
            Exam title prefix
            <input
              type="text"
              value={titlePrefix}
              onChange={(event) => setTitlePrefix(event.target.value)}
              className="admin-field"
              style={{ height: 38 }}
              placeholder="e.g. OriginBI · "
            />
          </label>

          <div className="admin-form-label">
            <span>Accent color</span>
            <div className="admin-accent-swatches">
              {ACCENT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.key}
                  type="button"
                  aria-label={swatch.label}
                  aria-pressed={accent === swatch.key}
                  onClick={() => setAccent(swatch.key)}
                  className={`admin-accent-swatch${accent === swatch.key ? " is-active" : ""}`}
                  style={{ background: swatch.color }}
                />
              ))}
            </div>
          </div>
        </div>

        <label className="admin-form-label">
          Welcome message
          <textarea
            value={welcome}
            onChange={(event) => setWelcome(event.target.value)}
            className="admin-field"
            rows={3}
            style={{ minHeight: 88 }}
          />
        </label>
      </Section>
    </div>
  );
}

type Difficulty = "easy" | "medium" | "hard";

interface MarksRow {
  marks: number;
  negative: number;
}

function ScoringTab() {
  const [marks, setMarks] = useState<Record<Difficulty, MarksRow>>({
    easy: { marks: 1, negative: 0 },
    medium: { marks: 2, negative: 0.25 },
    hard: { marks: 3, negative: 0.5 },
  });
  const [pass, setPass] = useState(60);
  const [negativeEnabled, setNegativeEnabled] = useState(true);
  const [issueCert, setIssueCert] = useState(true);
  const [shareEmployers, setShareEmployers] = useState(false);
  const [showScoreToCandidate, setShowScoreToCandidate] = useState(true);

  const updateMarks = (d: Difficulty, key: keyof MarksRow, value: number) =>
    setMarks((prev) => ({ ...prev, [d]: { ...prev[d], [key]: value } }));

  return (
    <div className="admin-grid-2">
      <Section
        title="Marks schema"
        subtitle="Per-difficulty default marks. Override per-question in the editor."
      >
        <div className="admin-marks-table">
          <div className="admin-marks-head">
            <span>Difficulty</span>
            <span>Marks</span>
            <span>Negative</span>
          </div>
          {(["easy", "medium", "hard"] as const).map((d) => {
            const tone = d === "easy" ? "var(--admin-green)" : d === "medium" ? "var(--admin-amber)" : "var(--admin-red)";
            const label = d === "easy" ? "Easy" : d === "medium" ? "Medium" : "Hard";
            return (
              <div key={d} className="admin-marks-row">
                <span className="admin-marks-difficulty">
                  <span className="admin-dot" style={{ background: tone }} />
                  {label}
                </span>
                <input
                  type="number"
                  step={0.5}
                  value={marks[d].marks}
                  onChange={(event) => updateMarks(d, "marks", Number(event.target.value))}
                  className="admin-field admin-marks-input"
                />
                <input
                  type="number"
                  step={0.25}
                  value={marks[d].negative}
                  disabled={!negativeEnabled}
                  onChange={(event) => updateMarks(d, "negative", Number(event.target.value))}
                  className="admin-field admin-marks-input"
                  style={{ opacity: negativeEnabled ? 1 : 0.55 }}
                />
              </div>
            );
          })}
        </div>

        <ToggleSwitch
          checked={negativeEnabled}
          onChange={setNegativeEnabled}
          label="Enable negative marking"
          hint="Subtract the negative value for each incorrect answer."
        />
      </Section>

      <Section title="Pass criteria" subtitle="Used to gate certificates and downstream reports.">
        <label className="admin-form-label">
          Pass threshold (%)
          <input
            type="number"
            value={pass}
            min={0}
            max={100}
            onChange={(event) => setPass(Number(event.target.value))}
            className="admin-field"
            style={{ height: 38 }}
          />
        </label>
        <ToggleSwitch
          checked={showScoreToCandidate}
          onChange={setShowScoreToCandidate}
          label="Show score to candidate"
          hint="Reveal the final percentage at the end of the attempt."
        />
        <ToggleSwitch
          checked={issueCert}
          onChange={setIssueCert}
          label="Issue certificate on pass"
          hint="Auto-generate a signed PDF certificate."
        />
        <ToggleSwitch
          checked={shareEmployers}
          onChange={setShareEmployers}
          label="Share with employer pool"
          hint="Push passing results to the recruiter feed."
        />
      </Section>
    </div>
  );
}

type Channel = "email" | "slack" | "webhook";

interface NotificationEvent {
  key: string;
  name: string;
  hint: string;
  email: boolean;
  slack: boolean;
  webhook: boolean;
}

const DEFAULT_NOTIFICATION_EVENTS: NotificationEvent[] = [
  { key: "exam.published", name: "Exam published", hint: "A new exam is made available to candidates.", email: true, slack: false, webhook: true },
  { key: "candidate.registered", name: "Candidate registered", hint: "A new candidate signs up or is invited.", email: true, slack: false, webhook: false },
  { key: "session.flagged", name: "Session flagged", hint: "Proctoring layer flags an attempt for review.", email: true, slack: true, webhook: true },
  { key: "session.auto-paused", name: "Auto-pause triggered", hint: "Engine paused an attempt due to a critical signal.", email: false, slack: true, webhook: true },
  { key: "result.available", name: "Result available", hint: "Final score and certificate are ready.", email: true, slack: false, webhook: true },
  { key: "plugin.updated", name: "Plugin updated", hint: "A plugin version was installed or rolled back.", email: false, slack: true, webhook: false },
];

function NotificationsTab() {
  const [events, setEvents] = useState<NotificationEvent[]>(DEFAULT_NOTIFICATION_EVENTS);

  const toggle = (key: string, channel: Channel) => {
    setEvents((prev) =>
      prev.map((event) => (event.key === key ? { ...event, [channel]: !event[channel] } : event)),
    );
  };

  return (
    <div className="admin-settings-stack">
      <Card>
        <div className="admin-control-row" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 className="admin-card-title">Channel routing</h3>
            <p className="admin-card-subtitle">
              Pick which channels fire for each event. Channels need to be enabled under{" "}
              <em>Integrations</em> first.
            </p>
          </div>
          <div className="admin-row" style={{ gap: 8 }}>
            <Badge tone="green" dot>3 channels live</Badge>
          </div>
        </div>
      </Card>

      <Card pad={false}>
        <div className="admin-notifications-table">
          <div className="admin-notifications-row admin-notifications-head">
            <span>Event</span>
            <span>Email</span>
            <span>Slack</span>
            <span>Webhook</span>
          </div>
          {events.map((row) => (
            <div key={row.key} className="admin-notifications-row">
              <div>
                <p className="admin-notifications-event-name">{row.name}</p>
                <p className="admin-notifications-event-hint">{row.hint}</p>
              </div>
              <ToggleSwitch checked={row.email} onChange={() => toggle(row.key, "email")} />
              <ToggleSwitch checked={row.slack} onChange={() => toggle(row.key, "slack")} />
              <ToggleSwitch checked={row.webhook} onChange={() => toggle(row.key, "webhook")} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type IntegrationStatus = "connected" | "available";

interface IntegrationTile {
  name: string;
  desc: string;
  meta: string;
  icon: ReactNode;
  status: IntegrationStatus;
  color: string;
  bg: string;
}

const INTEGRATION_TILES: IntegrationTile[] = [
  {
    name: "Judge0",
    desc: "Code execution sandbox for the coding plugin.",
    meta: "Languages · 14 · cluster ap-south-1",
    icon: <Cpu size={20} />,
    status: "connected",
    color: "var(--admin-amber)",
    bg: "var(--admin-amber-soft)",
  },
  {
    name: "MOSS",
    desc: "Stanford code similarity for plagiarism scoring.",
    meta: "Last sync · 3h ago",
    icon: <Eye size={20} />,
    status: "connected",
    color: "var(--admin-blue)",
    bg: "var(--admin-blue-soft)",
  },
  {
    name: "AWS Cognito",
    desc: "Candidate and admin identity provider.",
    meta: "User pool · originbi-prod",
    icon: <ShieldCheck size={20} />,
    status: "connected",
    color: "var(--admin-green)",
    bg: "var(--admin-green-soft)",
  },
  {
    name: "Cloudflare",
    desc: "WAF, bot protection, and edge routing.",
    meta: "Available · BYO account",
    icon: <Globe size={20} />,
    status: "available",
    color: "var(--admin-purple)",
    bg: "var(--admin-purple-soft)",
  },
  {
    name: "Slack",
    desc: "Operator notifications and proctor pings.",
    meta: "Available · OAuth required",
    icon: <Bell size={20} />,
    status: "available",
    color: "var(--admin-pink)",
    bg: "var(--admin-pink-soft)",
  },
  {
    name: "Webhook",
    desc: "Outbound HTTP events to your own services.",
    meta: "Signed with HMAC-SHA256",
    icon: <Webhook size={20} />,
    status: "connected",
    color: "var(--admin-fg-2)",
    bg: "rgba(255,255,255,0.06)",
  },
];

function IntegrationsTab() {
  return (
    <div className="admin-grid-3">
      {INTEGRATION_TILES.map((row) => {
        const connected = row.status === "connected";
        return (
          <Card key={row.name} className="admin-integration-tile">
            <div className="admin-control-row">
              <span
                className="admin-module-icon"
                style={{ background: row.bg, color: row.color }}
              >
                {row.icon}
              </span>
              <Badge tone={connected ? "green" : "neutral"} dot={connected}>
                {connected ? "Connected" : "Available"}
              </Badge>
            </div>
            <div style={{ marginTop: 12 }}>
              <h3 className="admin-card-title" style={{ fontSize: 15 }}>{row.name}</h3>
              <p className="admin-card-subtitle" style={{ marginTop: 6, lineHeight: 1.5 }}>
                {row.desc}
              </p>
              <p className="admin-stat-label" style={{ marginTop: 10 }}>{row.meta}</p>
            </div>
            <div className="admin-row" style={{ marginTop: 14, gap: 8 }}>
              <button
                type="button"
                className={`admin-btn ${connected ? "admin-btn-secondary" : "admin-btn-primary"}`}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {connected ? "Configure" : "Connect"}
              </button>
              {connected && (
                <button type="button" className="admin-btn admin-btn-ghost" aria-label="View docs">
                  <HelpCircle size={13} />
                </button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SettingsInner() {
  useRegisterAdminPage({
    eyebrow: "System / Settings",
    title: "Exam Settings",
    subtitle: "Defaults that apply to every assessment unless overridden.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Settings" },
    ],
  });

  const [tab, setTab] = useState<Tab>("proctoring");

  return (
    <div className="admin-page">
      <div className="admin-control-row">
        <PillTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "proctoring", label: "Proctoring", icon: <ShieldCheck size={13} /> },
            { value: "general", label: "General Exam", icon: <SettingsIcon size={13} /> },
            { value: "scoring", label: "Scoring & Pass", icon: <Award size={13} /> },
            { value: "notifications", label: "Notifications", icon: <Bell size={13} /> },
            { value: "integrations", label: "Integrations", icon: <Sparkles size={13} /> },
          ]}
        />
        <div className="admin-row">
          <button type="button" className="admin-btn admin-btn-ghost">
            <HelpCircle size={13} /> Docs
          </button>
          <button type="button" className="admin-btn admin-btn-primary">
            <Save size={13} /> Save changes
          </button>
        </div>
      </div>

      {tab === "proctoring" && <ProctoringTab />}
      {tab === "general" && <GeneralTab />}
      {tab === "scoring" && <ScoringTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "integrations" && <IntegrationsTab />}

      <p style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--admin-fg-4)", fontSize: 11 }}>
        <Activity size={11} /> Proctoring cards are plugin-mounted; changes persist to platform plugin config.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AdminGuard>
      <SettingsInner />
    </AdminGuard>
  );
}
