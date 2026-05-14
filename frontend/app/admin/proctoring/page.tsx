"use client";

import { AlertTriangle, Camera, ShieldCheck } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";

function ProctoringInner() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">System / Proctoring</p>
          <h2 className="admin-page-title">Proctoring Review</h2>
          <p className="admin-page-copy">
            Review candidate session signals, incident flags, and integrity settings from the redesigned admin console.
          </p>
        </div>
        <span className="admin-badge admin-badge-amber">
          <span className="admin-dot" />
          Review queue
        </span>
      </div>

      <section className="admin-grid-3">
        {[
          { icon: ShieldCheck, title: "Identity Checks", value: "92", color: "var(--admin-green)", bg: "rgba(30,211,106,0.14)" },
          { icon: Camera, title: "Camera Flags", value: "11", color: "var(--admin-amber)", bg: "rgba(255,183,3,0.14)" },
          { icon: AlertTriangle, title: "High Risk", value: "3", color: "var(--admin-red)", bg: "rgba(241,112,116,0.14)" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="admin-card admin-stat">
              <div className="admin-stat-top">
                <span className="admin-stat-icon" style={{ background: item.bg, color: item.color }}>
                  <Icon size={18} />
                </span>
              </div>
              <p className="admin-stat-label">{item.title}</p>
              <p className="admin-stat-value">{item.value}</p>
              <p className="admin-stat-sub">Last 24 hours</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default function ProctoringPage() {
  return (
    <AdminGuard>
      <ProctoringInner />
    </AdminGuard>
  );
}
