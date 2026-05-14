/* Main App — routes between pages */

const { useState: useStateApp } = React;

function App() {
  const [route, setRoute] = useStateApp({ page: "dashboard" });
  const [editorState, setEditorState] = useStateApp(null);
  // editorState: { kind: "mcq" | "coding", module, question }

  const navTo = (page, extras = {}) => {
    setRoute({ page, ...extras });
    setEditorState(null);
  };

  // ----- Question banks routing -----
  if (route.page === "banks") {
    if (!route.module) {
      return (
        <AdminShell
          active="banks" onNav={navTo}
          title="Question Banks"
          subtitle="Manage assessment-question libraries across all modules"
          breadcrumb={["Admin Hub", "Question Banks"]}
        >
          <QuestionBanksLanding onPickModule={(mk) => setRoute({ page: "banks", module: mk })} />
        </AdminShell>
      );
    }

    const module = MODULES.find(m => m.key === route.module);

    // Coding editor
    if (editorState?.kind === "coding") {
      return (
        <AdminShell
          active="banks" onNav={navTo}
          title={editorState.question ? "Edit Problem" : "New Coding Problem"}
          subtitle="Live judge · multi-language · hidden test cases"
          breadcrumb={["Admin Hub", "Question Banks", module.label, editorState.question ? editorState.question.title : "New Problem"]}
        >
          <CodingEditorPage
            question={editorState.question}
            module={module}
            onBack={() => setEditorState(null)}
          />
        </AdminShell>
      );
    }

    // List page
    return (
      <AdminShell
        active="banks" onNav={navTo}
        title={module.label}
        subtitle={module.desc}
        breadcrumb={["Admin Hub", "Question Banks", module.label]}
        actions={
          <button className="btn btn-secondary" onClick={() => setRoute({ page: "banks" })}>
            <I.ArrowLeft size={14} /> All modules
          </button>
        }
      >
        {module.type === "coding" ? (
          <CodingListPage
            module={module}
            onAddNew={() => setEditorState({ kind: "coding", module, question: null })}
            onEdit={(q) => setEditorState({ kind: "coding", module, question: q })}
          />
        ) : (
          <MCQListPage
            module={module}
            onAddNew={() => setEditorState({ kind: "mcq", module, question: null })}
            onEdit={(q) => setEditorState({ kind: "mcq", module, question: q })}
          />
        )}

        {/* MCQ Modal */}
        {editorState?.kind === "mcq" && (
          <MCQEditor
            question={editorState.question}
            module={module}
            onClose={() => setEditorState(null)}
            onSave={() => setEditorState(null)}
          />
        )}
      </AdminShell>
    );
  }

  // ----- Standard pages -----
  if (route.page === "dashboard") {
    return (
      <AdminShell
        active="dashboard" onNav={navTo}
        title="Welcome back, Priya"
        subtitle="Here's what's happening across all assessments today."
      >
        <DashboardPage onNav={navTo} />
      </AdminShell>
    );
  }

  if (route.page === "users") {
    return (
      <AdminShell
        active="users" onNav={navTo}
        title="User Management"
        subtitle="Students, admins, and proctors across all institutions."
        breadcrumb={["Admin Hub", "Users"]}
      >
        <UsersPage />
      </AdminShell>
    );
  }

  if (route.page === "assessments") {
    return (
      <AdminShell
        active="assessments" onNav={navTo}
        title="Assessments"
        subtitle="Live, scheduled, and draft exam configurations."
        breadcrumb={["Admin Hub", "Assessments"]}
      >
        <AssessmentsPage />
      </AdminShell>
    );
  }

  if (route.page === "proctoring") {
    return (
      <AdminShell
        active="proctoring" onNav={navTo}
        title="Proctoring Live Monitor"
        subtitle="Real-time candidate feed across all active sessions."
        breadcrumb={["Admin Hub", "Proctoring"]}
        actions={
          <span style={{
            padding: "5px 10px",
            background: "rgba(30,211,106,0.1)",
            border: "1px solid rgba(30,211,106,0.3)",
            borderRadius: 999,
            fontSize: 11, fontWeight: 800, color: "var(--green)",
            letterSpacing: "0.06em", textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span className="dot dot-green" style={{ animation: "pulse 1.6s infinite" }} />
            92 LIVE
          </span>
        }
      >
        <ProctoringLivePage />
      </AdminShell>
    );
  }

  if (route.page === "settings") {
    return (
      <AdminShell
        active="settings" onNav={navTo}
        title="Exam Settings"
        subtitle="Defaults that apply to every assessment unless overridden."
        breadcrumb={["Admin Hub", "Exam Settings"]}
      >
        <SettingsPage />
      </AdminShell>
    );
  }

  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
