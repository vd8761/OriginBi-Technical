"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, UserSearch, Users } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";

function UsersLandingInner() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = userId.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("User ID must be a positive integer.");
      return;
    }
    router.push(`/admin/users/${trimmed}/entitlements`);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">Support / Users</p>
          <h2 className="admin-page-title">User Entitlements</h2>
          <p className="admin-page-copy">
            Look up language entitlements from purchases, organization grants, and free-tier access for support cases.
          </p>
        </div>
        <span className="admin-badge admin-badge-green">
          <span className="admin-dot" />
          Support tool
        </span>
      </div>

      <section className="admin-grid-3">
        <div className="admin-module-card">
          <span className="admin-module-icon" style={{ background: "rgba(30,211,106,0.14)", color: "var(--admin-green)" }}>
            <Users size={20} />
          </span>
          <div>
            <h3 className="admin-card-title">Candidate Access</h3>
            <p className="admin-card-subtitle">Review what languages and assessments a candidate can launch.</p>
          </div>
        </div>
        <div className="admin-module-card">
          <span className="admin-module-icon" style={{ background: "rgba(56,189,248,0.14)", color: "var(--admin-blue)" }}>
            <ShieldCheck size={20} />
          </span>
          <div>
            <h3 className="admin-card-title">Grant Sources</h3>
            <p className="admin-card-subtitle">Purchases, organization grants, and free-tier entries stay separated.</p>
          </div>
        </div>
        <div className="admin-module-card">
          <span className="admin-module-icon" style={{ background: "rgba(255,183,3,0.14)", color: "var(--admin-amber)" }}>
            <UserSearch size={20} />
          </span>
          <div>
            <h3 className="admin-card-title">Quick Lookup</h3>
            <p className="admin-card-subtitle">Enter the database user ID from a ticket or admin query.</p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="admin-card admin-card-pad admin-stack" style={{ maxWidth: 640 }}>
        <label className="admin-form-label">
          User ID
          <input
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. 1042"
            inputMode="numeric"
            className="admin-field admin-mono"
          />
        </label>
        <div>
          <button type="submit" className="admin-btn admin-btn-primary">
            View Entitlements <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {error && <div className="admin-error" style={{ maxWidth: 640 }}>{error}</div>}
    </div>
  );
}

export default function UsersLandingPage() {
  return (
    <AdminGuard>
      <UsersLandingInner />
    </AdminGuard>
  );
}
