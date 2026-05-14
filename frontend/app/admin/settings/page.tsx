"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  Award,
  Bell,
  Brain,
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
  TimerReset,
  Webhook,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card, PillTabs, ToggleSwitch } from "@/components/admin/ui";

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
  const [camera, setCamera] = useState(true);
  const [faceDetect, setFaceDetect] = useState(true);
  const [noiseAlert, setNoiseAlert] = useState(true);
  const [fullscreenLock, setFullscreenLock] = useState(true);
  const [tabSwitch, setTabSwitch] = useState(true);
  const [eyeTracking, setEyeTracking] = useState(false);
  const [aiSuspicious, setAiSuspicious] = useState(true);
  const [idCheck, setIdCheck] = useState(true);
  const [livenessCheck, setLivenessCheck] = useState(true);
  const [vpnBlock, setVpnBlock] = useState(true);
  const [interval, setIntervalSec] = useState(8);
  const [allowExits, setAllowExits] = useState(2);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Section title="Camera & Vision" subtitle="Capture cadence and face detection thresholds.">
          <ToggleSwitch
            checked={camera}
            onChange={setCamera}
            label="Webcam capture"
            hint="Stream candidate webcam to the proctor view."
          />
          <label className="admin-form-label">
            Capture interval (seconds)
            <input
              type="number"
              value={interval}
              min={1}
              max={60}
              onChange={(event) => setIntervalSec(Number(event.target.value))}
              className="admin-field"
              style={{ height: 38 }}
            />
          </label>
          <ToggleSwitch
            checked={faceDetect}
            onChange={setFaceDetect}
            label="Face detection"
            hint="Pause exams when no face is detected for >10s."
          />
        </Section>

        <Section title="Microphone & Audio" subtitle="Background noise tolerance.">
          <ToggleSwitch
            checked={noiseAlert}
            onChange={setNoiseAlert}
            label="Background noise alert"
            hint="Flag continuous voices or external speech."
          />
        </Section>

        <Section title="Screen & Browser" subtitle="Browser hardening for in-progress exams.">
          <ToggleSwitch
            checked={fullscreenLock}
            onChange={setFullscreenLock}
            label="Fullscreen lock"
            hint="Force fullscreen and pause if exited."
          />
          <label className="admin-form-label">
            Allowed fullscreen exits
            <input
              type="number"
              value={allowExits}
              min={0}
              max={10}
              onChange={(event) => setAllowExits(Number(event.target.value))}
              className="admin-field"
              style={{ height: 38 }}
            />
          </label>
          <ToggleSwitch
            checked={tabSwitch}
            onChange={setTabSwitch}
            label="Tab switch detection"
            hint="Auto-flag and warn after 2 tab switches."
          />
        </Section>

        <Section title="AI Monitoring (BETA)" subtitle="Heuristic models for behavior anomalies.">
          <ToggleSwitch
            checked={eyeTracking}
            onChange={setEyeTracking}
            label="Eye tracking"
            hint="Track gaze direction across the exam window."
          />
          <ToggleSwitch
            checked={aiSuspicious}
            onChange={setAiSuspicious}
            label="Suspicious activity AI"
            hint="Detect off-screen consultation patterns."
          />
        </Section>

        <Section title="Identity Verification" subtitle="Pre-exam identity proofing.">
          <ToggleSwitch
            checked={idCheck}
            onChange={setIdCheck}
            label="Government ID upload"
            hint="Require photo ID at start of session."
          />
          <ToggleSwitch
            checked={livenessCheck}
            onChange={setLivenessCheck}
            label="Liveness check"
            hint="Force a 3-second blink/turn before entry."
          />
        </Section>

        <Section title="Network & Location" subtitle="Allowed networks and geofencing.">
          <ToggleSwitch
            checked={vpnBlock}
            onChange={setVpnBlock}
            label="Block VPN traffic"
            hint="Reject sessions from known VPN ranges."
          />
        </Section>
      </div>

      <Card style={{ position: "sticky", top: 88 }}>
        <h3 className="admin-card-title">Candidate view preview</h3>
        <p className="admin-card-subtitle">How protections appear to the candidate.</p>
        <div
          style={{
            marginTop: 14,
            aspectRatio: "16/10",
            borderRadius: "var(--admin-r-md)",
            border: "1px solid var(--admin-border)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(30,211,106,0.05))",
            display: "grid",
            placeItems: "center",
            color: "var(--admin-fg-3)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Question 12 / 30
        </div>

        <div style={{ marginTop: 14 }}>
          <p className="admin-stat-label" style={{ marginBottom: 8 }}>Active layers</p>
          {[
            { icon: <Camera size={13} />, label: "Webcam" },
            { icon: <Mic size={13} />, label: "Microphone" },
            { icon: <Lock size={13} />, label: "Fullscreen" },
            { icon: <Brain size={13} />, label: "Eye tracking", off: !eyeTracking },
            { icon: <ShieldCheck size={13} />, label: "Identity" },
          ].map((row) => (
            <div
              key={row.label}
              className="admin-row"
              style={{ padding: "6px 0", color: row.off ? "var(--admin-fg-4)" : "var(--admin-fg-2)", fontSize: 12 }}
            >
              {row.icon}
              <span style={{ flex: 1 }}>{row.label}</span>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: row.off ? "var(--admin-fg-4)" : "var(--admin-green)", boxShadow: row.off ? "none" : "0 0 8px var(--admin-green-glow)" }} />
            </div>
          ))}
        </div>

        <div className="admin-row" style={{ marginTop: 16, gap: 8 }}>
          <button type="button" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
            <Save size={13} /> Save defaults
          </button>
          <button type="button" className="admin-btn admin-btn-ghost">
            <TimerReset size={13} /> Reset
          </button>
        </div>
      </Card>
    </div>
  );
}

function GeneralTab() {
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState(30);
  const [attempts, setAttempts] = useState(1);
  const [shuffle, setShuffle] = useState(true);
  const [allowReview, setAllowReview] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [adaptive, setAdaptive] = useState(false);

  return (
    <div className="admin-grid-2">
      <Section title="Session defaults" subtitle="Applied to every assessment unless overridden.">
        <label className="admin-form-label">
          Default duration (minutes)
          <input
            type="number"
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="admin-field"
            style={{ height: 38 }}
          />
        </label>
        <label className="admin-form-label">
          Default # of questions
          <input
            type="number"
            value={questions}
            onChange={(event) => setQuestions(Number(event.target.value))}
            className="admin-field"
            style={{ height: 38 }}
          />
        </label>
        <label className="admin-form-label">
          Maximum attempts
          <input
            type="number"
            value={attempts}
            onChange={(event) => setAttempts(Number(event.target.value))}
            className="admin-field"
            style={{ height: 38 }}
          />
        </label>
      </Section>

      <Section title="Behaviour" subtitle="Defaults that affect the candidate experience.">
        <ToggleSwitch checked={shuffle} onChange={setShuffle} label="Shuffle questions" hint="Randomise order per attempt." />
        <ToggleSwitch checked={allowReview} onChange={setAllowReview} label="Allow review" hint="Candidates can revisit questions." />
        <ToggleSwitch checked={showTimer} onChange={setShowTimer} label="Show timer" hint="Visible countdown vs. internal-only timer." />
        <ToggleSwitch checked={adaptive} onChange={setAdaptive} label="Adaptive difficulty" hint="Tune next question to performance." />
      </Section>
    </div>
  );
}

function ScoringTab() {
  const [pass, setPass] = useState(60);
  const [issueCert, setIssueCert] = useState(true);
  const [shareEmployers, setShareEmployers] = useState(false);

  return (
    <div className="admin-grid-2">
      <Section title="Marks schema" subtitle="Per-difficulty default marks.">
        {(["Easy", "Medium", "Hard"] as const).map((d) => (
          <div key={d} className="admin-grid-2" style={{ gap: 8 }}>
            <label className="admin-form-label">
              {d} · marks
              <input type="number" defaultValue={d === "Easy" ? 1 : d === "Medium" ? 2 : 3} className="admin-field" style={{ height: 38 }} />
            </label>
            <label className="admin-form-label">
              {d} · negative
              <input type="number" defaultValue={0.25} step={0.25} className="admin-field" style={{ height: 38 }} />
            </label>
          </div>
        ))}
      </Section>

      <Section title="Pass criteria" subtitle="Used to gate certificates and reports.">
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
        <ToggleSwitch checked={issueCert} onChange={setIssueCert} label="Issue certificate on pass" hint="Auto-generate signed PDF." />
        <ToggleSwitch checked={shareEmployers} onChange={setShareEmployers} label="Share with employer pool" hint="Push results to the recruiter feed." />
      </Section>
    </div>
  );
}

function NotificationsTab() {
  const events = [
    { name: "Exam published", email: true, slack: false, webhook: true },
    { name: "Candidate registered", email: true, slack: false, webhook: false },
    { name: "Session flagged", email: true, slack: true, webhook: true },
    { name: "Auto-pause triggered", email: false, slack: true, webhook: true },
    { name: "Result available", email: true, slack: false, webhook: true },
    { name: "Plugin update", email: false, slack: true, webhook: false },
  ];
  return (
    <Card pad={false}>
      <div className="admin-table-wrap" style={{ border: 0, borderRadius: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Email</th>
              <th>Slack</th>
              <th>Webhook</th>
            </tr>
          </thead>
          <tbody>
            {events.map((row) => (
              <tr key={row.name}>
                <td style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{row.name}</td>
                <td>
                  <ToggleSwitch checked={row.email} onChange={() => undefined} />
                </td>
                <td>
                  <ToggleSwitch checked={row.slack} onChange={() => undefined} />
                </td>
                <td>
                  <ToggleSwitch checked={row.webhook} onChange={() => undefined} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "Judge0", desc: "Code execution sandbox", icon: <Cpu size={20} />, status: "connected" as const, color: "var(--admin-amber)" },
    { name: "MOSS", desc: "Code similarity detection", icon: <Eye size={20} />, status: "connected" as const, color: "var(--admin-blue)" },
    { name: "AWS Cognito", desc: "Candidate identity provider", icon: <ShieldCheck size={20} />, status: "connected" as const, color: "var(--admin-green)" },
    { name: "Cloudflare", desc: "WAF + bot protection", icon: <Globe size={20} />, status: "available" as const, color: "var(--admin-purple)" },
    { name: "Slack", desc: "Operator notifications", icon: <Bell size={20} />, status: "available" as const, color: "var(--admin-pink)" },
    { name: "Webhook", desc: "Outbound HTTP events", icon: <Webhook size={20} />, status: "connected" as const, color: "var(--admin-fg-3)" },
  ];
  return (
    <div className="admin-grid-3">
      {integrations.map((row) => (
        <Card key={row.name}>
          <div className="admin-control-row">
            <span
              className="admin-module-icon"
              style={{ background: "rgba(255,255,255,0.04)", color: row.color }}
            >
              {row.icon}
            </span>
            <Badge tone={row.status === "connected" ? "green" : "neutral"} dot>
              {row.status}
            </Badge>
          </div>
          <div style={{ marginTop: 12 }}>
            <h3 className="admin-card-title">{row.name}</h3>
            <p className="admin-card-subtitle">{row.desc}</p>
          </div>
          <button type="button" className="admin-btn admin-btn-secondary" style={{ marginTop: 14 }}>
            {row.status === "connected" ? "Configure" : "Connect"}
          </button>
        </Card>
      ))}
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
        <Activity size={11} /> Toggles are local-only previews · backend persistence wires up as plugin schemas mature.
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
