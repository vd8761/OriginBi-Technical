/* Coding Question Editor — full-page editor for coding problems
   Tabs: Problem, Test Cases, Languages & Starter Code, Constraints, Settings */

const { useState: useStateC } = React;

const LANGS = [
  { id: "python", label: "Python 3.11", color: "#3776AB", short: "Py" },
  { id: "javascript", label: "JavaScript (Node 20)", color: "#F7DF1E", short: "JS" },
  { id: "java", label: "Java 17", color: "#ED8B00", short: "Java" },
  { id: "cpp", label: "C++ 20", color: "#00599C", short: "C++" },
  { id: "go", label: "Go 1.22", color: "#00ADD8", short: "Go" },
  { id: "ruby", label: "Ruby 3.3", color: "#CC342D", short: "Rb" },
  { id: "rust", label: "Rust 1.79", color: "#dea584", short: "Rs" },
  { id: "csharp", label: "C# 12", color: "#178600", short: "C#" },
];

const STARTER_CODE = {
  python: `class Solution:
    def two_sum(self, nums: list[int], target: int) -> list[int]:
        # Write your code here
        pass`,
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your code here
};`,
  java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}`,
  cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        return {};
    }
};`,
};

function CodingTab({ active, label, icon, onClick, badge }) {
  const IconComp = I[icon];
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "11px 16px",
      borderBottom: `2px solid ${active ? "var(--amber)" : "transparent"}`,
      color: active ? "var(--fg)" : "var(--fg-3)",
      fontSize: 13, fontWeight: 700,
      background: active ? "rgba(255,183,3,0.05)" : "transparent",
      transition: "all 150ms ease",
    }}>
      <IconComp size={15} />
      {label}
      {badge != null && (
        <span style={{
          fontSize: 10, fontWeight: 800,
          padding: "1px 6px", borderRadius: 4,
          background: active ? "var(--amber-soft)" : "var(--card)",
          color: active ? "var(--amber)" : "var(--fg-3)",
        }}>{badge}</span>
      )}
    </button>
  );
}

// ===== Problem statement tab =====

function ProblemTab({ q, setQ }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      <div className="col gap-4">
        <div>
          <label className="input-label">Problem Title</label>
          <input
            className="input"
            value={q.title}
            onChange={e => setQ({ ...q, title: e.target.value })}
            style={{ fontSize: 16, fontWeight: 700, padding: "12px 14px" }}
          />
        </div>

        <div>
          <label className="input-label">Statement <span style={{ color: "var(--fg-4)", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>— Markdown supported</span></label>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <div className="row gap-1" style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
              <button className="btn-icon" style={{ padding: 5, fontSize: 11, fontWeight: 800 }}>B</button>
              <button className="btn-icon" style={{ padding: 5, fontSize: 11, fontStyle: "italic" }}>I</button>
              <button className="btn-icon" style={{ padding: 5 }}><I.Code size={13} /></button>
              <button className="btn-icon" style={{ padding: 5 }}><I.Image size={13} /></button>
              <button className="btn-icon" style={{ padding: 5 }}><I.Hash size={13} /></button>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 10.5, color: "var(--fg-4)", marginRight: 6 }}>Preview</span>
              <span className="switch on" style={{ transform: "scale(0.85)" }} />
            </div>
            <textarea
              value={q.description}
              onChange={e => setQ({ ...q, description: e.target.value })}
              style={{
                width: "100%",
                minHeight: 220,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--fg)",
                padding: 14,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12.5,
                lineHeight: 1.65,
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div>
          <label className="input-label">Input Format</label>
          <textarea className="input" rows={3} placeholder="Describe input format, e.g. line 1: n, line 2: n space-separated integers..." style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
        </div>

        <div>
          <label className="input-label">Output Format</label>
          <textarea className="input" rows={2} placeholder="Describe the expected output format..." style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
        </div>

        <div>
          <label className="input-label">Constraints</label>
          <textarea
            className="input"
            rows={4}
            defaultValue={"• 2 ≤ nums.length ≤ 10⁴\n• -10⁹ ≤ nums[i] ≤ 10⁹\n• -10⁹ ≤ target ≤ 10⁹\n• Only one valid answer exists."}
            style={{ resize: "vertical", fontFamily: "JetBrains Mono, monospace", fontSize: 12 }}
          />
        </div>

        {/* Sample I/O */}
        <div>
          <label className="input-label">Sample Examples (visible to candidate)</label>
          <div className="col gap-2">
            {[
              { in: "nums = [2,7,11,15]\ntarget = 9", out: "[0,1]", expl: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
              { in: "nums = [3,2,4]\ntarget = 6", out: "[1,2]", expl: "" },
            ].map((s, i) => (
              <div key={i} style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                overflow: "hidden",
              }}>
                <div className="row" style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid var(--border)",
                  background: "rgba(0,0,0,0.15)",
                  justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "var(--amber)", textTransform: "uppercase" }}>Example {i + 1}</span>
                  <button className="btn-icon"><I.Trash size={13} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--border)" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>Input</div>
                    <pre className="code" style={{ margin: 0, color: "var(--fg-2)" }}>{s.in}</pre>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.06em", marginBottom: 6, textTransform: "uppercase" }}>Output</div>
                    <pre className="code" style={{ margin: 0, color: "var(--green)" }}>{s.out}</pre>
                  </div>
                </div>
                {s.expl && (
                  <div style={{ padding: 10, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.5, borderTop: "1px solid var(--border)" }}>
                    <b style={{ color: "var(--fg-2)" }}>Explanation:</b> {s.expl}
                  </div>
                )}
              </div>
            ))}
            <button style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px dashed var(--border-strong)",
              color: "var(--fg-3)",
              fontSize: 12, fontWeight: 600,
              background: "transparent",
            }}>
              <I.Plus size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Add sample example
            </button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="col gap-3">
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 12 }}>Classification</div>
          <label className="input-label">Topic</label>
          <select className="input" value={q.category} onChange={e => setQ({ ...q, category: e.target.value })}>
            {["Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming", "Greedy", "Math", "Hash Table", "Stack", "Queue"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="input-label" style={{ marginTop: 12 }}>Difficulty</label>
          <div className="row" style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 3, border: "1px solid var(--border-strong)" }}>
            {["easy", "medium", "hard"].map(d => (
              <button key={d} onClick={() => setQ({ ...q, difficulty: d, marks: { easy: 10, medium: 25, hard: 50 }[d] })} style={{
                flex: 1, padding: "7px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                textTransform: "capitalize",
                color: q.difficulty === d ? "#0a1410" : "var(--fg-2)",
                background: q.difficulty === d ? (d === "easy" ? "var(--green)" : d === "medium" ? "var(--amber)" : "#ff5a5f") : "transparent",
              }}>{d}</button>
            ))}
          </div>

          <label className="input-label" style={{ marginTop: 12 }}>Marks</label>
          <input className="input" value={q.marks} onChange={e => setQ({ ...q, marks: Number(e.target.value) })} type="number" />

          <label className="input-label" style={{ marginTop: 12 }}>Tags</label>
          <div className="row gap-1" style={{ flexWrap: "wrap" }}>
            {q.tags.map((t, i) => (
              <span key={i} className="badge badge-neutral">{t} <I.X size={9} style={{ marginLeft: 4, cursor: "pointer" }} /></span>
            ))}
            <button style={{ fontSize: 10.5, color: "var(--fg-3)", border: "1px dashed var(--border-strong)", padding: "3px 8px", borderRadius: 5, fontWeight: 700 }}>+ Add tag</button>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 10 }}>Reference Image / Diagram</div>
          <label style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "16px",
            border: "1px dashed var(--border-strong)",
            borderRadius: 10,
            background: "rgba(255,255,255,0.01)",
            cursor: "pointer",
            color: "var(--fg-3)",
            textAlign: "center",
          }}>
            <I.Image size={18} />
            <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 8 }}>Upload diagram</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>tree, graph, flowchart...</div>
          </label>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase" }}>Stats (last 30 days)</div>
          </div>
          <div className="col gap-2">
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--fg-3)" }}>Acceptance</span>
              <span style={{ fontWeight: 700, color: "var(--green)" }}>{q.acceptance}%</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--fg-3)" }}>Submissions</span>
              <span style={{ fontWeight: 700 }}>{q.submissions.toLocaleString()}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--fg-3)" }}>Avg time</span>
              <span style={{ fontWeight: 700 }}>14m 23s</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--fg-3)" }}>Most common lang</span>
              <span style={{ fontWeight: 700, color: "#3776AB" }}>Python</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Test Cases tab =====

function TestCasesTab() {
  const [cases, setCases] = useStateC(TEST_CASES);
  const [selected, setSelected] = useStateC(0);

  const totalWeight = cases.reduce((s, c) => s + c.weight, 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      {/* Cases list */}
      <div className="col gap-3">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Test Cases <span style={{ color: "var(--amber)" }}>({cases.length})</span></div>
            <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>Total weight: <b style={{ color: "var(--fg-2)" }}>{totalWeight}</b></div>
          </div>
          <button className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 12, background: "var(--amber)", color: "#1a1410" }}>
            <I.Plus size={14} /> Add Case
          </button>
        </div>

        <div className="col" style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(255,255,255,0.02)",
          maxHeight: 480,
          overflowY: "auto",
        }}>
          {cases.map((c, i) => {
            const isSel = selected === i;
            return (
              <button key={c.id} onClick={() => setSelected(i)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px",
                borderBottom: i < cases.length - 1 ? "1px solid var(--border)" : "none",
                background: isSel ? "rgba(255,183,3,0.08)" : "transparent",
                borderLeft: `3px solid ${isSel ? "var(--amber)" : "transparent"}`,
                textAlign: "left",
                transition: "background 150ms ease",
              }}>
                <I.GripVertical size={13} color="var(--fg-4)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row gap-2">
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: isSel ? "var(--amber)" : "var(--fg-3)", fontWeight: 700 }}>#{i + 1}</span>
                    {c.visible ? (
                      <span style={{ fontSize: 9, fontWeight: 800, color: "var(--green)", letterSpacing: "0.06em" }}>SAMPLE</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.06em" }}>HIDDEN</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 11, color: "var(--fg-3)",
                    marginTop: 4,
                    fontFamily: "JetBrains Mono, monospace",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{c.input.split("\n")[0]}</div>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--fg-3)" }}>w:{c.weight}</div>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 10 }}>Bulk Tools</div>
          <div className="col gap-2">
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              <I.Upload size={13} /> Upload .txt / .zip
            </button>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              <I.Cpu size={13} /> Generate from generator script
            </button>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: 12 }}>
              <I.Beaker size={13} /> Run all against reference solution
            </button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="col gap-3">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row gap-3">
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Case <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--amber)" }}>#{selected + 1}</span>
            </div>
            <div className="row gap-2">
              <span className="row gap-2" style={{
                padding: "5px 10px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 6, border: "1px solid var(--border-strong)",
                fontSize: 11, fontWeight: 600,
              }}>
                <span className={`switch${cases[selected].visible ? " on" : ""}`} style={{ transform: "scale(0.75)", margin: "-4px 0" }}
                  onClick={() => {
                    const next = [...cases];
                    next[selected] = { ...next[selected], visible: !next[selected].visible };
                    setCases(next);
                  }}
                />
                Visible to candidate
              </span>
              <span className="row gap-2" style={{
                padding: "5px 10px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 6, border: "1px solid var(--border-strong)",
                fontSize: 11, fontWeight: 600,
              }}>
                Weight
                <input type="number" value={cases[selected].weight} onChange={e => {
                  const next = [...cases];
                  next[selected] = { ...next[selected], weight: Number(e.target.value) };
                  setCases(next);
                }} style={{
                  width: 44, background: "transparent", border: "none", color: "var(--fg)",
                  outline: "none", fontWeight: 700, fontSize: 12, textAlign: "right",
                }} />
              </span>
            </div>
          </div>
          <div className="row gap-1">
            <button className="btn-icon"><I.Copy size={14} /></button>
            <button className="btn-icon" style={{ color: "var(--red)" }}><I.Trash size={14} /></button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="input-label">Input (stdin)</label>
            <textarea
              value={cases[selected].input}
              onChange={e => {
                const next = [...cases];
                next[selected] = { ...next[selected], input: e.target.value };
                setCases(next);
              }}
              className="input"
              style={{
                minHeight: 240,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12.5, lineHeight: 1.6,
                background: "#0a0e0c",
                resize: "vertical",
              }}
            />
          </div>
          <div>
            <label className="input-label">Expected Output</label>
            <textarea
              value={cases[selected].expected}
              onChange={e => {
                const next = [...cases];
                next[selected] = { ...next[selected], expected: e.target.value };
                setCases(next);
              }}
              className="input"
              style={{
                minHeight: 240,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12.5, lineHeight: 1.6,
                background: "#0a0e0c",
                color: "#9fdbb6",
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="row gap-2">
              <I.Activity size={15} color="var(--green)" />
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>Last Judge Run</span>
            </div>
            <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 11.5, background: "var(--amber)", color: "#1a1410" }}>
              <I.Play size={12} /> Run reference solution
            </button>
          </div>
          <div className="row gap-4" style={{ fontSize: 12 }}>
            <div className="row gap-2">
              <I.CheckCircle size={14} color="var(--green)" />
              <span style={{ color: "var(--fg-2)" }}>Passed in <b style={{ color: "var(--green)" }}>{cases[selected].timeMs}ms</b></span>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <span style={{ color: "var(--fg-3)" }}>Memory: <b style={{ color: "var(--fg-2)" }}>14.2 MB</b></span>
            <div style={{ width: 1, height: 16, background: "var(--border)" }} />
            <span style={{ color: "var(--fg-3)" }}>Python 3.11 · 2 min ago</span>
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase" }}>Advanced</span>
          </div>
          <div className="col gap-2">
            {[
              { label: "Strict whitespace match", on: false },
              { label: "Allow extra trailing newline", on: true },
              { label: "Compare as JSON", on: false },
              { label: "Use custom checker script", on: false },
            ].map((o, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                <span>{o.label}</span>
                <span className={`switch${o.on ? " on" : ""}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Languages & starter code tab =====

function LanguagesTab({ q, setQ }) {
  const [activeLang, setActiveLang] = useStateC("python");

  const toggleLang = (id) => {
    const next = q.languages.includes(id)
      ? q.languages.filter(l => l !== id)
      : [...q.languages, id];
    setQ({ ...q, languages: next });
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <div className="col gap-3">
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Enabled Languages</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>Candidates can pick from {q.languages.length} languages</div>
        </div>
        <div className="col gap-1">
          {LANGS.map(l => {
            const enabled = q.languages.includes(l.id);
            const isActive = activeLang === l.id;
            return (
              <div key={l.id} onClick={() => setActiveLang(l.id)} className="row gap-3" style={{
                padding: "11px 13px",
                borderRadius: 10,
                background: isActive ? "rgba(255,183,3,0.08)" : enabled ? "var(--card)" : "transparent",
                border: `1px solid ${isActive ? "rgba(255,183,3,0.3)" : enabled ? "var(--border)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: l.color + "22",
                  color: l.color,
                  fontWeight: 800, fontSize: 11,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{l.short}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{l.label}</div>
                  {enabled && (
                    <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>
                      {STARTER_CODE[l.id] ? "Starter code set" : "No starter code"}
                    </div>
                  )}
                </div>
                <span
                  className={`switch${enabled ? " on" : ""}`}
                  onClick={e => { e.stopPropagation(); toggleLang(l.id); }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="col gap-3">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row gap-2">
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: LANGS.find(l => l.id === activeLang)?.color + "22",
              color: LANGS.find(l => l.id === activeLang)?.color,
              fontWeight: 800, fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{LANGS.find(l => l.id === activeLang)?.short}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{LANGS.find(l => l.id === activeLang)?.label}</div>
              <div style={{ fontSize: 11, color: "var(--fg-3)" }}>Starter template and reference solution</div>
            </div>
          </div>
          <div className="row gap-2">
            <button className="btn btn-secondary" style={{ fontSize: 12 }}><I.Copy size={13} /> Copy from another lang</button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }}><I.Beaker size={13} /> Validate syntax</button>
          </div>
        </div>

        {/* Code editor mock */}
        <div style={{
          background: "#0a0e0c",
          border: "1px solid var(--border-strong)",
          borderRadius: 10,
          overflow: "hidden",
        }}>
          <div className="row" style={{
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,255,255,0.025)",
          }}>
            <div className="row gap-2">
              {["Starter Code", "Reference Solution", "Test Harness"].map((t, i) => (
                <button key={t} style={{
                  padding: "5px 11px",
                  borderRadius: 6,
                  fontSize: 11, fontWeight: 700,
                  color: i === 0 ? "var(--amber)" : "var(--fg-3)",
                  background: i === 0 ? "rgba(255,183,3,0.1)" : "transparent",
                }}>{t}</button>
              ))}
            </div>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--fg-4)", fontFamily: "JetBrains Mono, monospace" }}>UTF-8 · LF · {activeLang}</span>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{
              padding: "12px 8px",
              background: "rgba(0,0,0,0.3)",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11.5,
              color: "var(--fg-4)",
              textAlign: "right",
              lineHeight: 1.6,
              userSelect: "none",
            }}>
              {(STARTER_CODE[activeLang] || "").split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre style={{
              flex: 1,
              padding: "12px 14px",
              margin: 0,
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "#d8e1dc",
              overflowX: "auto",
            }}>
              <code dangerouslySetInnerHTML={{
                __html: (STARTER_CODE[activeLang] || "# No starter code defined for this language")
                  .replace(/\b(class|def|return|public|var|function|new|int|void|vector|pass)\b/g, '<span style="color:#c084fc;font-weight:600">$1</span>')
                  .replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color:#6c7a72;font-style:italic">$1</span>')
                  .replace(/(\bSolution\b|\btwoSum\b|\btwo_sum\b)/g, '<span style="color:#FFB703">$1</span>')
                  .replace(/(:\s*list|:\s*int|@param|@return)/g, '<span style="color:#5EEE9B">$1</span>')
              }} />
            </pre>
          </div>
        </div>

        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 10 }}>Compiler Flags</div>
          <input className="input" defaultValue="-O2 -std=c++20" placeholder="optional compile flags..." style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12 }} />
        </div>
      </div>
    </div>
  );
}

// ===== Coding editor page wrapper =====

function CodingEditorPage({ question, module, onBack }) {
  const [tab, setTab] = useStateC("problem");
  const [q, setQ] = useStateC(question || {
    title: "Untitled Problem",
    description: "Describe your problem here...",
    category: "Arrays",
    difficulty: "medium",
    marks: 25,
    status: "draft",
    languages: ["python", "javascript", "java", "cpp"],
    timeLimit: 1000, memoryLimit: 256,
    tags: [], acceptance: 0, submissions: 0,
  });

  return (
    <div className="col gap-4 animate-fade">
      {/* Editor toolbar */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row" style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(255,183,3,0.06), transparent 60%)",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
        }}>
          <div className="row gap-3">
            <button className="btn btn-secondary" onClick={onBack} style={{ padding: "8px 12px" }}>
              <I.ArrowLeft size={14} /> Back
            </button>
            <div style={{ width: 1, height: 24, background: "var(--border)" }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{q.title}</div>
              <div className="row gap-2" style={{ marginTop: 3 }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--fg-4)" }}>{q.id || "new-problem"}</span>
                <span style={{ color: "var(--fg-4)", fontSize: 10 }}>•</span>
                <DifficultyPill difficulty={q.difficulty} />
                <span style={{ color: "var(--fg-4)", fontSize: 10 }}>•</span>
                <span className={`badge badge-${q.status === "active" ? "green" : q.isDraft ? "amber" : "neutral"}`}>
                  <span className="dot" style={{ background: q.status === "active" ? "var(--green)" : q.isDraft ? "var(--amber)" : "var(--fg-4)" }} />
                  {q.isDraft ? "draft" : q.status}
                </span>
              </div>
            </div>
          </div>
          <div className="row gap-2">
            <button className="btn btn-secondary" style={{ fontSize: 12 }}>
              <I.Eye size={14} /> Preview as candidate
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12 }}>
              <I.Copy size={14} /> Duplicate
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 12, color: "#ff5a5f", borderColor: "rgba(237,47,52,0.3)" }}>
              <I.Trash size={14} /> Delete
            </button>
            <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
            <button className="btn btn-secondary" style={{ fontSize: 12 }}>
              <I.Save size={14} /> Save Draft
            </button>
            <button className="btn btn-primary" style={{ background: "var(--amber)", color: "#1a1410" }}>
              <I.Send size={14} /> Publish
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="row" style={{ borderBottom: "1px solid var(--border)", padding: "0 8px" }}>
          <CodingTab active={tab === "problem"} label="Problem Statement" icon="FileText" onClick={() => setTab("problem")} />
          <CodingTab active={tab === "testcases"} label="Test Cases" icon="Beaker" onClick={() => setTab("testcases")} badge={TEST_CASES.length} />
          <CodingTab active={tab === "languages"} label="Languages & Starter" icon="Code" onClick={() => setTab("languages")} badge={q.languages.length} />
          <CodingTab active={tab === "limits"} label="Limits & Judge" icon="Cpu" onClick={() => setTab("limits")} />
          <CodingTab active={tab === "settings"} label="Settings" icon="Settings" onClick={() => setTab("settings")} />
        </div>
      </div>

      {/* Tab content */}
      <div style={{ minHeight: 600 }}>
        {tab === "problem" && <ProblemTab q={q} setQ={setQ} />}
        {tab === "testcases" && <TestCasesTab />}
        {tab === "languages" && <LanguagesTab q={q} setQ={setQ} />}
        {tab === "limits" && <LimitsTab q={q} setQ={setQ} />}
        {tab === "settings" && <CodingSettingsTab q={q} setQ={setQ} />}
      </div>
    </div>
  );
}

function LimitsTab({ q, setQ }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 16 }}>Execution Limits</div>

        <div className="col gap-4">
          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <label className="input-label" style={{ margin: 0 }}>Time Limit per test case</label>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--amber)", fontFamily: "JetBrains Mono, monospace" }}>{q.timeLimit} ms</span>
            </div>
            <input type="range" min="100" max="10000" step="100" value={q.timeLimit}
              onChange={e => setQ({ ...q, timeLimit: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--amber)" }} />
            <div className="row" style={{ justifyContent: "space-between", fontSize: 10, color: "var(--fg-4)", marginTop: 4 }}>
              <span>100ms</span><span>10s</span>
            </div>
          </div>

          <div>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <label className="input-label" style={{ margin: 0 }}>Memory Limit per test case</label>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--amber)", fontFamily: "JetBrains Mono, monospace" }}>{q.memoryLimit} MB</span>
            </div>
            <input type="range" min="64" max="1024" step="64" value={q.memoryLimit}
              onChange={e => setQ({ ...q, memoryLimit: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--amber)" }} />
            <div className="row" style={{ justifyContent: "space-between", fontSize: 10, color: "var(--fg-4)", marginTop: 4 }}>
              <span>64 MB</span><span>1 GB</span>
            </div>
          </div>

          <div>
            <label className="input-label">Stack Size</label>
            <input className="input" defaultValue="256 MB" />
          </div>

          <div>
            <label className="input-label">Output Size Limit</label>
            <input className="input" defaultValue="16 MB" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 16 }}>Judge Configuration</div>

        <div className="col gap-3">
          {[
            { label: "Use Judge0 sandbox", desc: "Run user code in isolated container", on: true },
            { label: "Strict output match", desc: "Trailing whitespace counts", on: false },
            { label: "Show wrong-answer diff", desc: "Display expected vs actual diff to candidate", on: true },
            { label: "Partial credit", desc: "Award points proportional to passing test cases", on: true },
            { label: "Stop on first failure", desc: "Terminate evaluation early to save resources", on: false },
            { label: "Show test case hints", desc: "Reveal which type of input failed (e.g. 'edge case')", on: false },
          ].map((o, i) => (
            <div key={i} className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{o.desc}</div>
              </div>
              <span className={`switch${o.on ? " on" : ""}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 20, gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 16 }}>Hints (shown after N failed attempts)</div>
        <div className="col gap-2">
          {[
            { after: 2, text: "Consider iterating through the array once while keeping track of complements." },
            { after: 5, text: "A hash map can give you O(1) lookup for the complement." },
          ].map((h, i) => (
            <div key={i} className="row gap-3" style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--amber-soft)", color: "var(--amber)",
                fontWeight: 800, fontSize: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>H{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>After {h.after} failed attempts</div>
                <div style={{ fontSize: 12.5 }}>{h.text}</div>
              </div>
              <button className="btn-icon"><I.Edit size={14} /></button>
              <button className="btn-icon" style={{ color: "var(--red)" }}><I.Trash size={14} /></button>
            </div>
          ))}
          <button style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px dashed var(--border-strong)",
            color: "var(--fg-3)",
            fontSize: 12, fontWeight: 600,
            background: "transparent",
          }}>
            <I.Plus size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Add another hint
          </button>
        </div>
      </div>
    </div>
  );
}

function CodingSettingsTab({ q, setQ }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 18 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 16 }}>Candidate Experience</div>
        <div className="col gap-3">
          {[
            { label: "Allow custom test input", desc: "Candidate can type their own test case", on: true },
            { label: "Allow copy-paste in editor", desc: "Disable to prevent answer pasting", on: false },
            { label: "Show line numbers", desc: "Always recommended", on: true },
            { label: "Lock editor on submit", desc: "Read-only after submission", on: true },
            { label: "Show solution after exam", desc: "Reveal reference solution post-attempt", on: false },
          ].map((o, i) => (
            <div key={i} className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{o.desc}</div>
              </div>
              <span className={`switch${o.on ? " on" : ""}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--amber)", textTransform: "uppercase", marginBottom: 16 }}>Plagiarism & AI Detection</div>
        <div className="col gap-3">
          {[
            { label: "MOSS code similarity", desc: "Flag if > 80% similar to another submission", on: true },
            { label: "AI-generated code detection", desc: "Heuristic check for LLM output patterns", on: true },
            { label: "Keystroke biometrics", desc: "Detect bot-like input cadences", on: false },
            { label: "Disable browser autocomplete", desc: "Prevent autocomplete suggestions", on: true },
          ].map((o, i) => (
            <div key={i} className="row" style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.label}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>{o.desc}</div>
              </div>
              <span className={`switch${o.on ? " on" : ""}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CodingEditorPage });
