/* MCQ Editor — modal for adding/editing MCQ-style questions
   Used for: aptitude, mnc, role (and communication mcq-tasks)
*/

const { useState: useStateM } = React;

function MCQEditor({ question, module, onSave, onClose }) {
  const isNew = !question;
  const [text, setText] = useStateM(question?.text || "");
  const [options, setOptions] = useStateM(question?.options || ["", "", "", ""]);
  const [correct, setCorrect] = useStateM(question?.correct ?? 0);
  const [category, setCategory] = useStateM(question?.category || module.categories[0]);
  const [subcategory, setSubcategory] = useStateM(question?.subcategory || "");
  const [difficulty, setDifficulty] = useStateM(question?.difficulty || "medium");
  const [status, setStatus] = useStateM(question?.status || "active");
  const [explanation, setExplanation] = useStateM(question?.explanation || "");
  const [hasImage, setHasImage] = useStateM(question?.hasImage || false);

  const marksMap = { easy: 1, medium: 2, hard: 5 };
  const LABELS = ["A", "B", "C", "D", "E", "F"];

  const addOption = () => options.length < 6 && setOptions([...options, ""]);
  const removeOption = (i) => {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    if (correct === i) setCorrect(0);
    else if (correct > i) setCorrect(correct - 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(10,15,12,0.7)",
      backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "fadeIn 200ms ease",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 720, maxHeight: "92vh",
        background: "var(--bg)",
        border: "1px solid var(--border-strong)",
        borderRadius: 18,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "popIn 320ms cubic-bezier(0.18,0.89,0.32,1.28)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{isNew ? "Add Question" : "Edit Question"}</div>
            <div className="row gap-2" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: module.color, textTransform: "uppercase" }}>
                {module.label}
              </span>
              {!isNew && (
                <>
                  <span style={{ color: "var(--fg-4)", fontSize: 10 }}>•</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--fg-4)" }}>#{question.id}</span>
                </>
              )}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><I.X size={18} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Core config */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 14 }}>Core Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="input-label">Difficulty</label>
                <div className="row" style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 3, border: "1px solid var(--border-strong)" }}>
                  {["easy", "medium", "hard"].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{
                      flex: 1, padding: "7px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                      textTransform: "capitalize",
                      color: difficulty === d ? "#0a1410" : "var(--fg-2)",
                      background: difficulty === d
                        ? (d === "easy" ? "var(--green)" : d === "medium" ? "var(--amber)" : "#ff5a5f")
                        : "transparent",
                    }}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Status</label>
                <div className="row" style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 3, border: "1px solid var(--border-strong)" }}>
                  {["active", "inactive"].map(d => (
                    <button key={d} onClick={() => setStatus(d)} style={{
                      flex: 1, padding: "7px", borderRadius: 6, fontSize: 11.5, fontWeight: 700,
                      textTransform: "capitalize",
                      color: status === d ? "var(--bg)" : "var(--fg-2)",
                      background: status === d ? "var(--green)" : "transparent",
                    }}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="input-label">Category</label>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)}>
                  {module.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Subcategory</label>
                <input className="input" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="optional, e.g. Percentages" />
              </div>
              <div>
                <label className="input-label">Marks (auto from difficulty)</label>
                <input className="input" value={marksMap[difficulty]} disabled style={{ opacity: 0.6 }} />
              </div>
              <div>
                <label className="input-label">Negative Marks</label>
                <input className="input" value="0.25" disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Question content */}
          <div style={{
            padding: 18, borderRadius: 14,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--green)", textTransform: "uppercase", marginBottom: 14 }}>Content Data</div>

            <label className="input-label">Question Text</label>
            <textarea
              className="input"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder="Type the question prompt..."
              style={{ resize: "vertical", fontWeight: 600, fontSize: 13.5 }}
            />

            <label className="input-label" style={{ marginTop: 14 }}>Reference Image (optional)</label>
            {hasImage ? (
              <div style={{
                position: "relative",
                aspectRatio: "16/9",
                background: "linear-gradient(135deg, #1a1f1c, #0f1411)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div className="col" style={{ alignItems: "center", gap: 6, color: "var(--fg-3)" }}>
                  <I.Image size={32} />
                  <div style={{ fontSize: 11.5 }}>chart-q3-growth.png</div>
                </div>
                <button onClick={() => setHasImage(false)} className="btn-icon" style={{
                  position: "absolute", top: 8, right: 8,
                  background: "var(--red-soft)", color: "var(--red)",
                }}><I.Trash size={14} /></button>
              </div>
            ) : (
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "20px 16px",
                border: "1px dashed var(--border-strong)",
                borderRadius: 10,
                background: "rgba(255,255,255,0.01)",
                cursor: "pointer",
                color: "var(--fg-3)",
                transition: "all 150ms ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--green)"; e.currentTarget.style.color = "var(--green)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--fg-3)"; }}
              >
                <I.Upload size={20} />
                <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>Click to upload image</div>
                <div style={{ fontSize: 10.5, marginTop: 4 }}>PNG, JPG, WebP — max 2MB</div>
                <input type="file" style={{ display: "none" }} onChange={() => setHasImage(true)} />
              </label>
            )}

            {/* Options */}
            <div className="row" style={{ justifyContent: "space-between", marginTop: 16, marginBottom: 10 }}>
              <label className="input-label" style={{ margin: 0 }}>Answer Options ({options.length}/6)</label>
              {options.length < 6 && (
                <button onClick={addOption} style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase",
                  color: "var(--green)", background: "var(--green-soft)",
                  padding: "4px 10px", borderRadius: 5,
                }}>+ Add option</button>
              )}
            </div>
            <div className="col gap-2">
              {options.map((opt, i) => {
                const isCorrect = correct === i;
                return (
                  <div key={i} className="row gap-3">
                    <button onClick={() => setCorrect(i)} style={{
                      width: 40, height: 40, borderRadius: 10,
                      flexShrink: 0,
                      background: isCorrect ? "var(--green)" : "rgba(255,255,255,0.03)",
                      border: `2px solid ${isCorrect ? "var(--green)" : "var(--border-strong)"}`,
                      color: isCorrect ? "#0a1410" : "var(--fg-3)",
                      fontWeight: 800, fontSize: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 160ms ease",
                    }} title="Set as correct">
                      {isCorrect ? <I.Check size={16} strokeWidth={3} /> : LABELS[i]}
                    </button>
                    <input
                      className="input"
                      value={opt}
                      onChange={e => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${LABELS[i]}...`}
                    />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} className="btn-icon" style={{ color: "var(--fg-4)" }}>
                        <I.Trash size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <label className="input-label" style={{ marginTop: 16 }}>Explanation <span style={{ color: "var(--fg-4)", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>— Internal, shown to admin only</span></label>
            <textarea
              className="input"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              placeholder="Why this answer is correct..."
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Tags */}
          <div className="row gap-2">
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }}>
              <I.Tag size={13} /> Add to assessment
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5 }}>
              <I.Copy size={13} /> Duplicate
            </button>
            <button className="btn btn-secondary" style={{ fontSize: 11.5, color: "#ff5a5f", borderColor: "rgba(237,47,52,0.3)" }}>
              <I.Trash size={13} /> Delete
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          background: "rgba(255,255,255,0.02)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
            <span style={{ color: "var(--green)" }}>●</span> Auto-saved · last edit just now
          </div>
          <div className="row gap-2">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onSave}>
              <I.Save size={14} />
              {isNew ? "Create Question" : "Update Question"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MCQEditor });
