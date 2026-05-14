/* Question Bank landing — module cards + question list per module */

const { useState: useStateQ, useMemo: useMemoQ } = React;

function DifficultyPill({ difficulty }) {
  const map = {
    easy: { color: "var(--green)", label: "Easy" },
    medium: { color: "#FFB703", label: "Medium" },
    hard: { color: "#ff5a5f", label: "Hard" },
  };
  const s = map[difficulty];
  return (
    <span style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: s.color,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>{s.label}</span>
  );
}

function QuestionBanksLanding({ onPickModule }) {
  return (
    <div className="col gap-6 animate-fade">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {MODULES.map(m => {
          const IconComp = I[m.icon];
          return (
            <div key={m.key} className="card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, transition: "all 200ms ease", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = m.color + "55"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              {/* Header */}
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{
                  width: 48, height: 48,
                  borderRadius: 12,
                  background: m.color + "22",
                  color: m.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconComp size={22} />
                </div>
                {m.isNew && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em",
                    color: m.color, background: m.color + "22",
                    padding: "3px 8px", borderRadius: 6,
                  }}>NEW MODULE</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{m.label}</div>
                <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 6, lineHeight: 1.5 }}>{m.desc}</div>
              </div>

              {/* Counts */}
              <div className="row" style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 10,
                border: "1px solid var(--border)",
                gap: 20,
              }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "var(--fg-4)", textTransform: "uppercase" }}>Trial</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{m.trial}<span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}> Qs</span></div>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "var(--fg-4)", textTransform: "uppercase" }}>Main</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{m.main}<span style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600 }}> Qs</span></div>
                </div>
              </div>

              {/* Tags */}
              <div className="row gap-1" style={{ flexWrap: "wrap" }}>
                {m.categories.slice(0, 4).map((c, i) => (
                  <span key={i} className="badge badge-neutral">{c}</span>
                ))}
                {m.categories.length > 4 && (
                  <span className="badge badge-neutral">+{m.categories.length - 4}</span>
                )}
              </div>

              {/* Actions */}
              <div className="row gap-2" style={{ marginTop: "auto", paddingTop: 4 }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: "10px 12px" }}>
                  <I.Settings size={14} /> Settings
                </button>
                <button
                  onClick={() => onPickModule(m.key)}
                  className="btn"
                  style={{ flex: 2, background: m.color, color: "#0a1410", padding: "10px 12px", fontWeight: 700 }}
                >
                  Manage Questions <I.ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="card" style={{ padding: 20, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "var(--green-soft)", color: "var(--green)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <I.Zap size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Bulk import via JSON or CSV</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>Migrate from a legacy bank or upload a spreadsheet of MCQs — supports up to 5,000 rows per file.</div>
        </div>
        <button className="btn btn-secondary"><I.Upload size={14} /> Bulk Import</button>
        <button className="btn btn-secondary"><I.FileText size={14} /> View Schema</button>
      </div>
    </div>
  );
}

// ---------- MCQ Question list (for aptitude, mnc, role) ----------

function MCQListPage({ module, onAddNew, onEdit }) {
  const [mode, setMode] = useStateQ("main");
  const [filterCat, setFilterCat] = useStateQ("all");
  const [search, setSearch] = useStateQ("");

  const filtered = useMemoQ(() => APTITUDE_QUESTIONS.filter(q => {
    if (filterCat !== "all" && q.category !== filterCat) return false;
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [filterCat, search]);

  return (
    <div className="col gap-5 animate-fade">
      {/* Mode + filter row */}
      <div className="row gap-3" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row gap-3">
          <div className="row" style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setMode("trial")} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
              color: mode === "trial" ? "var(--bg)" : "var(--fg-2)",
              background: mode === "trial" ? "var(--green)" : "transparent",
            }}>Trial</button>
            <button onClick={() => setMode("main")} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
              color: mode === "main" ? "var(--bg)" : "var(--fg-2)",
              background: mode === "main" ? "var(--green)" : "transparent",
            }}>Main</button>
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{
            background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10,
            padding: "9px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)", outline: "none", minWidth: 180,
          }}>
            <option value="all">All categories ({APTITUDE_QUESTIONS.length})</option>
            {module.categories.map(c => {
              const cnt = APTITUDE_QUESTIONS.filter(q => q.category === c).length;
              return <option key={c} value={c}>{c} ({cnt})</option>;
            })}
          </select>
          <div className="row gap-2" style={{
            background: "var(--card)", border: "1px solid var(--border-strong)",
            borderRadius: 10, padding: "8px 12px", minWidth: 260,
          }}>
            <I.Search size={14} color="var(--fg-3)" />
            <input
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13 }}
            />
          </div>
        </div>

        <div className="row gap-2">
          <button className="btn btn-secondary"><I.Download size={14} /> Export</button>
          <button className="btn btn-secondary"><I.Upload size={14} /> Bulk Import</button>
          <button className="btn btn-primary" onClick={onAddNew}><I.Plus size={15} /> Add Question</button>
        </div>
      </div>

      {/* Inventory header */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Inventory Overview <span style={{ color: module.color }}>({filtered.length})</span></div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4 }}>Sorted by usage · most-used first</div>
        </div>
        <div className="row gap-3" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
          <span><b style={{ color: "var(--green)" }}>●</b> Active: {APTITUDE_QUESTIONS.filter(q => q.status === "active").length}</span>
          <span><b style={{ color: "var(--fg-4)" }}>●</b> Inactive: {APTITUDE_QUESTIONS.filter(q => q.status === "inactive").length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 50 }}>ID</th>
              <th>Question</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th style={{ width: 70 }}>Marks</th>
              <th style={{ width: 90 }}>Usage</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ width: 90 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.id} style={{ cursor: "pointer" }} onClick={() => onEdit(q)}>
                <td><span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5, color: "var(--fg-4)" }}>#{q.id.replace("q", "")}</span></td>
                <td>
                  <div className="row gap-2" style={{ alignItems: "flex-start" }}>
                    {q.hasImage && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: "var(--card-2)", color: "var(--fg-3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <I.Image size={14} />
                      </div>
                    )}
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--fg)", maxWidth: 460 }}>
                      {q.text}
                    </div>
                  </div>
                  <div className="row gap-3" style={{ marginTop: 6, fontSize: 10.5, color: "var(--fg-4)" }}>
                    <span>{q.options.length} options</span>
                    <span>·</span>
                    <span>Correct: <span style={{ color: "var(--green)", fontWeight: 700 }}>{["A", "B", "C", "D", "E"][q.correct]}</span></span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 12.5, color: "var(--fg-2)", fontWeight: 600 }}>{q.category}</span>
                  {q.subcategory && <div style={{ fontSize: 10.5, color: "var(--fg-4)", marginTop: 2 }}>{q.subcategory}</div>}
                </td>
                <td><DifficultyPill difficulty={q.difficulty} /></td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>+{q.marks}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-4)" }}>-0.25</div>
                </td>
                <td>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{q.usage}</div>
                  <div style={{ fontSize: 10, color: "var(--fg-4)" }}>attempts</div>
                </td>
                <td>
                  <span className={`badge badge-${q.status === "active" ? "green" : "neutral"}`}>
                    <span className="dot" style={{ background: q.status === "active" ? "var(--green)" : "var(--fg-4)" }} />
                    {q.status}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="row gap-1">
                    <button className="btn-icon" onClick={() => onEdit(q)}><I.Edit size={14} /></button>
                    <button className="btn-icon"><I.Copy size={14} /></button>
                    <button className="btn-icon" style={{ color: "var(--red)" }}><I.Trash size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Coding question list ----------

function CodingListPage({ module, onAddNew, onEdit }) {
  const [mode, setMode] = useStateQ("main");
  const [filterDiff, setFilterDiff] = useStateQ("all");
  const [filterCat, setFilterCat] = useStateQ("all");
  const [search, setSearch] = useStateQ("");

  const filtered = useMemoQ(() => CODING_QUESTIONS.filter(q => {
    if (filterDiff !== "all" && q.difficulty !== filterDiff) return false;
    if (filterCat !== "all" && q.category !== filterCat) return false;
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [filterDiff, filterCat, search]);

  const langLabels = { python: "Py", javascript: "JS", java: "Java", cpp: "C++", go: "Go", ruby: "Rb" };
  const langColors = {
    python: "#3776AB", javascript: "#F7DF1E", java: "#ED8B00", cpp: "#00599C", go: "#00ADD8", ruby: "#CC342D"
  };

  return (
    <div className="col gap-5 animate-fade">
      {/* Filters */}
      <div className="row gap-3" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <div className="row gap-3" style={{ flexWrap: "wrap" }}>
          <div className="row" style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setMode("trial")} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
              color: mode === "trial" ? "var(--bg)" : "var(--fg-2)",
              background: mode === "trial" ? module.color : "transparent",
            }}>Trial</button>
            <button onClick={() => setMode("main")} style={{
              padding: "8px 18px", borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
              color: mode === "main" ? "var(--bg)" : "var(--fg-2)",
              background: mode === "main" ? module.color : "transparent",
            }}>Main</button>
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{
            background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10,
            padding: "9px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--fg-2)", outline: "none",
          }}>
            <option value="all">All topics</option>
            {module.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="row" style={{ background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: 3 }}>
            {["all", "easy", "medium", "hard"].map(d => (
              <button key={d} onClick={() => setFilterDiff(d)} style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                color: filterDiff === d ? (d === "all" ? "var(--bg)" : "#0a1410") : "var(--fg-2)",
                background: filterDiff === d ? (d === "easy" ? "var(--green)" : d === "medium" ? "var(--amber)" : d === "hard" ? "#ff5a5f" : "var(--green)") : "transparent",
              }}>{d === "all" ? "Any" : d}</button>
            ))}
          </div>
          <div className="row gap-2" style={{
            background: "var(--card)", border: "1px solid var(--border-strong)",
            borderRadius: 10, padding: "8px 12px", minWidth: 220,
          }}>
            <I.Search size={14} color="var(--fg-3)" />
            <input
              placeholder="Search problems..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13 }}
            />
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn btn-secondary"><I.Download size={14} /> Export</button>
          <button className="btn btn-secondary"><I.Upload size={14} /> Import .zip</button>
          <button className="btn btn-primary" onClick={onAddNew} style={{ background: module.color }}><I.Plus size={15} /> New Problem</button>
        </div>
      </div>

      {/* Problem grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {filtered.map(q => (
          <div key={q.id} className="card" onClick={() => onEdit(q)} style={{
            padding: 20,
            cursor: "pointer",
            transition: "all 200ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = module.color + "55"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div className="row gap-2">
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: "var(--fg-4)" }}>{q.id}</span>
                {q.isDraft && <span className="badge badge-amber">DRAFT</span>}
                <span className={`badge badge-${q.status === "active" ? "green" : "neutral"}`}>
                  <span className="dot" style={{ background: q.status === "active" ? "var(--green)" : "var(--fg-4)" }} />
                  {q.status}
                </span>
              </div>
              <DifficultyPill difficulty={q.difficulty} />
            </div>

            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8 }}>{q.title}</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)", lineHeight: 1.55, marginBottom: 16,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{q.description.replace(/[`*]/g, "")}</div>

            {/* Stats */}
            <div className="row gap-4" style={{
              padding: "12px 14px",
              background: "rgba(255,255,255,0.02)",
              borderRadius: 10,
              border: "1px solid var(--border)",
              marginBottom: 14,
            }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Acceptance</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: q.acceptance > 60 ? "var(--green)" : q.acceptance > 30 ? "var(--amber)" : "#ff5a5f" }}>
                  {q.acceptance.toFixed(1)}%
                </div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Submissions</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{q.submissions.toLocaleString()}</div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Test Cases</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{q.testCases}</div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "var(--fg-4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Marks</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>+{q.marks}</div>
              </div>
            </div>

            {/* Languages */}
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row gap-1">
                {q.languages.map(l => (
                  <span key={l} style={{
                    fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700,
                    padding: "3px 7px", borderRadius: 5,
                    background: langColors[l] + "22", color: langColors[l],
                    border: `1px solid ${langColors[l]}44`,
                  }}>{langLabels[l]}</span>
                ))}
              </div>
              <div className="row gap-1">
                {q.tags.map(t => <span key={t} className="badge badge-neutral">{t}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 80, textAlign: "center" }}>
          <I.Code size={32} color="var(--fg-4)" />
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 14 }}>No problems found</div>
          <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 6 }}>Try adjusting the difficulty or category filter.</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { QuestionBanksLanding, MCQListPage, CodingListPage, DifficultyPill });
