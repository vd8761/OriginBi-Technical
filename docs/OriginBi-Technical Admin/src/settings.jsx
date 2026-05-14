/* Exam Settings + Proctoring page */

const { useState: useStateS } = React;

function ProctorRow({ icon, title, desc, control }) {
  const IconComp = icon ? I[icon] : null;
  return (
    <div className="row" style={{
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      gap: 14,
    }}>
      {IconComp && (
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: "rgba(30,211,106,0.1)",
          color: "var(--green)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <IconComp size={17} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

function Toggle({ on, onClick }) {
  return <span className={`switch${on ? " on" : ""}`} onClick={onClick} />;
}

function Pill({ active, onClick, children, accent = "var(--green)" }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      color: active ? "#0a1410" : "var(--fg-2)",
      background: active ? accent : "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? accent : "var(--border-strong)"}`,
      transition: "all 150ms ease",
    }}>{children}</button>
  );
}

function SettingsPage() {
  const [tab, setTab] = useStateS("proctoring");
  const [p, setP] = useStateS(DEFAULT_PROCTORING);

  const update = (path, value) => {
    const next = { ...p };
    const keys = path.split(".");
    let obj = next;
    for (let i = 0; i < keys.length - 1; i++) {
      obj[keys[i]] = { ...obj[keys[i]] };
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setP(next);
  };

  return (
    <div className="col gap-5 animate-fade">
      {/* Tab strip */}
      <div className="row gap-1" style={{
        background: "var(--card)",
        border: "1px solid var(--border-strong)",
        borderRadius: 12,
        padding: 4,
        alignSelf: "flex-start",
      }}>
        {[
          { k: "proctoring", label: "Proctoring", icon: "Shield" },
          { k: "general", label: "General Exam", icon: "Settings" },
          { k: "scoring", label: "Scoring & Pass", icon: "Award" },
          { k: "notifications", label: "Notifications", icon: "Bell" },
          { k: "integrations", label: "Integrations", icon: "Database" },
        ].map(t => {
          const IconComp = I[t.icon];
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 14px",
              borderRadius: 8,
              fontSize: 12.5, fontWeight: 700,
              color: active ? "#0a1410" : "var(--fg-2)",
              background: active ? "var(--green)" : "transparent",
              transition: "all 150ms ease",
            }}>
              <IconComp size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "proctoring" && <ProctoringTab p={p} update={update} />}
      {tab === "general" && <GeneralTab />}
      {tab === "scoring" && <ScoringTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "integrations" && <IntegrationsTab />}
    </div>
  );
}

function ProctoringTab({ p, update }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      <div className="col gap-4">
        {/* Camera */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(30,211,106,0.12)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Camera size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Camera & Vision</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Live photo capture, face detection, multi-face flags</div>
              </div>
            </div>
            <Toggle on={p.camera.enabled} onClick={() => update("camera.enabled", !p.camera.enabled)} />
          </div>
          <ProctorRow icon="Camera" title="Capture mode" desc="When to snapshot the candidate's webcam"
            control={
              <div className="row gap-2">
                <Pill active={p.camera.capture === "interval"} onClick={() => update("camera.capture", "interval")}>Interval</Pill>
                <Pill active={p.camera.capture === "random"} onClick={() => update("camera.capture", "random")}>Random</Pill>
                <Pill active={p.camera.capture === "event"} onClick={() => update("camera.capture", "event")}>On Event</Pill>
              </div>
            } />
          <ProctorRow icon="Clock" title="Interval" desc="Seconds between captures (only used in Interval mode)"
            control={
              <div className="row gap-2">
                <input type="range" min="10" max="120" step="5" value={p.camera.intervalSec}
                  onChange={e => update("camera.intervalSec", Number(e.target.value))}
                  style={{ width: 140, accentColor: "var(--green)" }} />
                <span style={{ minWidth: 50, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", color: "var(--green)", textAlign: "right" }}>{p.camera.intervalSec}s</span>
              </div>
            } />
          <ProctorRow icon="Eye" title="Face Detection" desc="Verify a single face is present in each capture"
            control={<Toggle on={p.camera.faceDetection} onClick={() => update("camera.faceDetection", !p.camera.faceDetection)} />} />
          <ProctorRow icon="AlertTriangle" title="Multi-face response" desc="What to do when more than one face is detected"
            control={
              <div className="row gap-2">
                <Pill active={p.camera.multiFace === "flag"} onClick={() => update("camera.multiFace", "flag")}>Flag</Pill>
                <Pill active={p.camera.multiFace === "warn"} onClick={() => update("camera.multiFace", "warn")} accent="var(--amber)">Warn</Pill>
                <Pill active={p.camera.multiFace === "terminate"} onClick={() => update("camera.multiFace", "terminate")} accent="#ff5a5f">Terminate</Pill>
              </div>
            } />
        </div>

        {/* Microphone */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(74,198,234,0.15)", color: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Mic size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Microphone & Audio</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Ambient noise monitoring and voice activity flags</div>
              </div>
            </div>
            <Toggle on={p.microphone.enabled} onClick={() => update("microphone.enabled", !p.microphone.enabled)} />
          </div>
          <ProctorRow icon="Activity" title="Background noise alert" desc="Flag when sustained voices or sounds are detected"
            control={<Toggle on={p.microphone.noiseAlert} onClick={() => update("microphone.noiseAlert", !p.microphone.noiseAlert)} />} />
        </div>

        {/* Screen */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(139,109,240,0.18)", color: "#8b6df0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Monitor size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Screen & Browser</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Fullscreen lock, tab switching, screen sharing</div>
              </div>
            </div>
            <span className="badge badge-green"><span className="dot" /> Always on</span>
          </div>
          <ProctorRow icon="Maximize" title="Fullscreen lock" desc="Force fullscreen mode; auto-pause on exit"
            control={<Toggle on={p.screen.fullscreenLock} onClick={() => update("screen.fullscreenLock", !p.screen.fullscreenLock)} />} />
          <ProctorRow icon="AlertTriangle" title="Allowed fullscreen exits" desc="Max number of times candidate can leave fullscreen before auto-submit"
            control={
              <div className="row gap-1">
                {[0, 1, 2, 3, 5].map(n => (
                  <Pill key={n} active={p.screen.allowExit === n} onClick={() => update("screen.allowExit", n)}>{n}</Pill>
                ))}
              </div>
            } />
          <ProctorRow icon="ExternalLink" title="Tab switch limit" desc="Maximum tab/window changes per session"
            control={
              <div className="row gap-2">
                <input type="number" min="0" max="20" value={p.screen.tabSwitchLimit}
                  onChange={e => update("screen.tabSwitchLimit", Number(e.target.value))}
                  className="input" style={{ width: 70, textAlign: "center", padding: "6px" }} />
                <span style={{ fontSize: 11, color: "var(--fg-3)" }}>switches</span>
              </div>
            } />
          <ProctorRow icon="Monitor" title="Screen sharing required" desc="Candidate must share full screen via WebRTC"
            control={<Toggle on={p.screen.screenshare} onClick={() => update("screen.screenshare", !p.screen.screenshare)} />} />
        </div>

        {/* AI vision */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,183,3,0.18)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Brain size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>AI Monitoring</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Behavioural ML signals — gaze tracking, posture, plagiarism</div>
              </div>
            </div>
            <span className="badge" style={{ color: "var(--amber)", background: "var(--amber-soft)", borderColor: "rgba(255,183,3,0.3)" }}>BETA</span>
          </div>
          <ProctorRow icon="Eye" title="Eye / gaze tracking" desc="Detect prolonged looking away from screen"
            control={<Toggle on={p.ai.eyeTracking} onClick={() => update("ai.eyeTracking", !p.ai.eyeTracking)} />} />
          <ProctorRow icon="Brain" title="Suspicious activity AI" desc="Classifier flags head turns, phone reflections, etc."
            control={<Toggle on={p.ai.suspiciousActivityAI} onClick={() => update("ai.suspiciousActivityAI", !p.ai.suspiciousActivityAI)} />} />
          <ProctorRow icon="Mic" title="Lip-sync verification" desc="Match speech audio to mouth movement during speaking tests"
            control={<Toggle on={p.ai.lipSync} onClick={() => update("ai.lipSync", !p.ai.lipSync)} />} />
          <ProctorRow icon="Code" title="Plagiarism / similarity detection" desc="MOSS + AI-generated content heuristics for written answers"
            control={<Toggle on={p.ai.plagiarismDetection} onClick={() => update("ai.plagiarismDetection", !p.ai.plagiarismDetection)} />} />
        </div>

        {/* Identity */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(216,76,116,0.18)", color: "#D84C74", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Lock size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Identity Verification</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Pre-exam ID checks and liveness</div>
              </div>
            </div>
          </div>
          <ProctorRow icon="FileText" title="Government ID upload" desc="Aadhaar / Passport / Driver's license scan"
            control={<Toggle on={p.identity.idVerification} onClick={() => update("identity.idVerification", !p.identity.idVerification)} />} />
          <ProctorRow icon="Eye" title="Liveness check" desc="Blink + head turn to confirm real person"
            control={<Toggle on={p.identity.livenessCheck} onClick={() => update("identity.livenessCheck", !p.identity.livenessCheck)} />} />
          <ProctorRow icon="Camera" title="Photo at exam start" desc="Match against uploaded ID photo"
            control={<Toggle on={p.identity.photoAtStart} onClick={() => update("identity.photoAtStart", !p.identity.photoAtStart)} />} />
        </div>

        {/* Network */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 20px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
            <div className="row gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(74,198,234,0.15)", color: "#06b6d4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I.Wifi size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Network & Location</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>IP, VPN, and geofence policies</div>
              </div>
            </div>
          </div>
          <ProctorRow icon="Globe" title="IP address logging" desc="Record candidate IP at each milestone"
            control={<Toggle on={p.network.ipLogging} onClick={() => update("network.ipLogging", !p.network.ipLogging)} />} />
          <ProctorRow icon="Shield" title="Block VPN / proxy" desc="Detect and prevent connection via known VPN ranges"
            control={<Toggle on={p.network.vpnBlock} onClick={() => update("network.vpnBlock", !p.network.vpnBlock)} />} />
          <ProctorRow icon="Target" title="Geofence" desc="Restrict access to a list of approved regions / countries"
            control={
              <div className="row gap-2">
                <Pill active={p.network.geoFence === "off"} onClick={() => update("network.geoFence", "off")}>Off</Pill>
                <Pill active={p.network.geoFence === "country"} onClick={() => update("network.geoFence", "country")}>Country</Pill>
                <Pill active={p.network.geoFence === "city"} onClick={() => update("network.geoFence", "city")}>City</Pill>
              </div>
            } />
        </div>
      </div>

      {/* Right rail */}
      <div className="col gap-3" style={{ position: "sticky", top: 88, alignSelf: "flex-start" }}>
        {/* Live preview */}
        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase" }}>Candidate View Preview</span>
            <I.Eye size={13} color="var(--fg-3)" />
          </div>
          <div style={{
            aspectRatio: "16/10",
            background: "linear-gradient(135deg, #0a0e0c 0%, #19211C 100%)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            padding: 10,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 10, right: 10,
              width: 60, height: 44,
              background: "#1a1f1c",
              borderRadius: 6,
              border: `1px solid ${p.camera.enabled ? "var(--green)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {p.camera.enabled ? (
                <div className="col" style={{ alignItems: "center", gap: 2 }}>
                  <I.Camera size={14} color="var(--green)" />
                  <span style={{ fontSize: 7, fontWeight: 800, color: "var(--green)" }}>LIVE</span>
                </div>
              ) : (
                <I.EyeOff size={14} color="var(--fg-4)" />
              )}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--fg-3)", letterSpacing: "0.06em", marginBottom: 8 }}>Q 12 / 30</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>If A + B = 12...</div>
            <div className="col gap-1" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              <div>○ 6</div><div>○ 8</div><div>● 10</div><div>○ 12</div>
            </div>
            <div style={{
              position: "absolute", bottom: 8, left: 10, right: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 9, color: "var(--fg-4)",
            }}>
              <span>⏱ 28:14</span>
              {p.screen.fullscreenLock && <span style={{ color: "var(--green)" }}>● Fullscreen</span>}
            </div>
          </div>
        </div>

        {/* Active layers */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 10 }}>Active Layers</div>
          <div className="col gap-2">
            {[
              { name: "Camera", on: p.camera.enabled },
              { name: "Microphone", on: p.microphone.enabled },
              { name: "Fullscreen lock", on: p.screen.fullscreenLock },
              { name: "Screen sharing", on: p.screen.screenshare },
              { name: "Eye tracking", on: p.ai.eyeTracking },
              { name: "ID verification", on: p.identity.idVerification },
              { name: "VPN block", on: p.network.vpnBlock },
            ].map((l, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: l.on ? "var(--fg)" : "var(--fg-4)" }}>{l.name}</span>
                <span className="dot" style={{ background: l.on ? "var(--green)" : "var(--fg-4)", boxShadow: l.on ? "0 0 6px var(--green-glow)" : "none" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Auto-actions */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 10 }}>Auto-Actions</div>
          <div className="col gap-3">
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span>Auto-terminate on violations</span>
              <Toggle on={p.actions.autoTerminate} onClick={() => update("actions.autoTerminate", !p.actions.autoTerminate)} />
            </div>
            <div>
              <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>Warning before auto-action</span>
                <span style={{ fontWeight: 700, color: "var(--amber)" }}>{p.actions.warningCount}</span>
              </div>
              <input type="range" min="1" max="10" value={p.actions.warningCount}
                onChange={e => update("actions.warningCount", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--amber)" }} />
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span>Record session</span>
              <Toggle on={p.actions.recordSession} onClick={() => update("actions.recordSession", !p.actions.recordSession)} />
            </div>
            <div>
              <label className="input-label">Retention (days)</label>
              <input className="input" type="number" value={p.actions.retentionDays}
                onChange={e => update("actions.retentionDays", Number(e.target.value))} />
            </div>
          </div>
        </div>

        <button className="btn btn-primary" style={{ justifyContent: "center", padding: "12px" }}>
          <I.Save size={14} /> Save Proctoring Profile
        </button>
        <button className="btn btn-secondary" style={{ justifyContent: "center", padding: "10px", fontSize: 12 }}>
          <I.RefreshCw size={13} /> Reset to defaults
        </button>
      </div>
    </div>
  );
}

function GeneralTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Session Defaults</div>
        <div className="col gap-3">
          <div>
            <label className="input-label">Default duration</label>
            <div className="row gap-2">
              <input className="input" defaultValue="60" type="number" style={{ flex: 1 }} />
              <select className="input" style={{ width: 110 }}>
                <option>Minutes</option><option>Hours</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Default # of questions</label>
            <input className="input" defaultValue="30" type="number" />
          </div>
          <div>
            <label className="input-label">Allowed attempts</label>
            <input className="input" defaultValue="1" type="number" />
          </div>
          <div>
            <label className="input-label">Time per question (sec, optional)</label>
            <input className="input" defaultValue="" placeholder="leave blank for un-paced" type="number" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Behaviour</div>
        <div className="col gap-3">
          {[
            { label: "Shuffle questions per candidate", on: true },
            { label: "Shuffle answer options", on: true },
            { label: "Allow review before submit", on: true },
            { label: "Allow flagging questions for review", on: true },
            { label: "Show progress bar", on: true },
            { label: "Show timer", on: true },
            { label: "Adaptive difficulty", on: false },
          ].map((o, i) => (
            <div key={i} className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{o.label}</span>
              <span className={`switch${o.on ? " on" : ""}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22, gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Branding & Customization</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div>
            <label className="input-label">Exam title prefix</label>
            <input className="input" defaultValue="Origin BI · " />
          </div>
          <div>
            <label className="input-label">Accent color</label>
            <div className="row gap-2">
              {["#1ED36A", "#06b6d4", "#8b6df0", "#FFB703", "#D84C74"].map(c => (
                <div key={c} style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: c,
                  border: c === "#1ED36A" ? "2px solid var(--fg)" : "1px solid var(--border-strong)",
                  cursor: "pointer",
                }} />
              ))}
            </div>
          </div>
          <div>
            <label className="input-label">Welcome message</label>
            <input className="input" defaultValue="Best of luck — read each question carefully." />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoringTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Marks Schema (per difficulty)</div>
        <div className="col gap-3">
          {[
            { d: "Easy", c: "var(--green)", marks: 1 },
            { d: "Medium", c: "var(--amber)", marks: 2 },
            { d: "Hard", c: "#ff5a5f", marks: 5 },
          ].map(r => (
            <div key={r.d} className="row" style={{ padding: 14, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", gap: 14 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 700, color: r.c }}>{r.d}</span>
              <div className="row gap-2" style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "var(--fg-3)" }}>+</label>
                <input className="input" defaultValue={r.marks} type="number" style={{ width: 80, textAlign: "center" }} />
                <label style={{ fontSize: 11, color: "var(--fg-3)" }}>marks</label>
                <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 6px" }} />
                <label style={{ fontSize: 11, color: "var(--fg-3)" }}>-</label>
                <input className="input" defaultValue="0.25" type="number" step="0.25" style={{ width: 80, textAlign: "center" }} />
                <label style={{ fontSize: 11, color: "var(--fg-3)" }}>negative</label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Pass Criteria</div>
        <div className="col gap-3">
          <div>
            <label className="input-label">Pass threshold (%)</label>
            <div className="row gap-3">
              <input type="range" min="0" max="100" defaultValue="60" style={{ flex: 1, accentColor: "var(--green)" }} />
              <span style={{ fontWeight: 800, color: "var(--green)", minWidth: 50, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>60%</span>
            </div>
          </div>
          <div>
            <label className="input-label">Minimum per category</label>
            <div className="row gap-3">
              <input type="range" min="0" max="100" defaultValue="40" style={{ flex: 1, accentColor: "var(--green)" }} />
              <span style={{ fontWeight: 800, color: "var(--green)", minWidth: 50, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>40%</span>
            </div>
          </div>
          <div className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5 }}>Show score immediately</span>
            <span className="switch on" />
          </div>
          <div className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5 }}>Issue certificate on pass</span>
            <span className="switch on" />
          </div>
          <div className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12.5 }}>Share results with employers</span>
            <span className="switch on" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 16 }}>Email & Webhook triggers</div>
      <div className="col gap-2">
        {[
          { event: "Candidate registered", email: true, slack: false, webhook: false },
          { event: "Assessment started", email: true, slack: false, webhook: true },
          { event: "Assessment completed", email: true, slack: true, webhook: true },
          { event: "Proctor flag raised", email: true, slack: true, webhook: true },
          { event: "Auto-terminated session", email: true, slack: true, webhook: true },
          { event: "Daily summary digest", email: true, slack: true, webhook: false },
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{r.event}</div>
            <div className="row gap-6">
              <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                <I.Mail size={13} color={r.email ? "var(--green)" : "var(--fg-4)"} />
                Email
                <span className={`switch${r.email ? " on" : ""}`} style={{ transform: "scale(0.8)", margin: "-3px 0" }} />
              </div>
              <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                <I.MessageSquare size={13} color={r.slack ? "var(--green)" : "var(--fg-4)"} />
                Slack
                <span className={`switch${r.slack ? " on" : ""}`} style={{ transform: "scale(0.8)", margin: "-3px 0" }} />
              </div>
              <div className="row gap-2" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                <I.Database size={13} color={r.webhook ? "var(--green)" : "var(--fg-4)"} />
                Webhook
                <span className={`switch${r.webhook ? " on" : ""}`} style={{ transform: "scale(0.8)", margin: "-3px 0" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "Judge0", desc: "Code execution sandbox", status: "connected", color: "#00BCD4", icon: "Terminal" },
    { name: "MOSS", desc: "Code plagiarism detection", status: "connected", color: "#8b6df0", icon: "Code" },
    { name: "AWS Cognito", desc: "Auth and SSO", status: "connected", color: "#FF9900", icon: "Lock" },
    { name: "Cloudflare R2", desc: "Asset storage", status: "connected", color: "#F38020", icon: "Database" },
    { name: "Slack", desc: "Notifications", status: "connected", color: "#4A154B", icon: "MessageSquare" },
    { name: "Workday ATS", desc: "Candidate sync to ATS", status: "disconnected", color: "#005CB9", icon: "Briefcase" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {integrations.map(it => {
        const IconComp = I[it.icon];
        return (
          <div key={it.name} className="card" style={{ padding: 18 }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: it.color + "22", color: it.color,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconComp size={20} />
              </div>
              <span className={`badge badge-${it.status === "connected" ? "green" : "neutral"}`}>
                <span className="dot" style={{ background: it.status === "connected" ? "var(--green)" : "var(--fg-4)" }} />
                {it.status}
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{it.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 16, minHeight: 32 }}>{it.desc}</div>
            <button className={`btn ${it.status === "connected" ? "btn-secondary" : "btn-primary"}`} style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              {it.status === "connected" ? <><I.Settings size={13} /> Configure</> : <><I.Plus size={13} /> Connect</>}
            </button>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { SettingsPage });
