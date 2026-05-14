"use client";

import { Bell, Lock, Settings, SlidersHorizontal } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";

const settings = [
  { icon: SlidersHorizontal, title: "Candidate Experience", desc: "Custom tests, paste policy, editor lock, and post-exam visibility.", on: true },
  { icon: Lock, title: "Plagiarism Controls", desc: "Similarity detection and AI-output heuristics for coding rounds.", on: true },
  { icon: Bell, title: "Notifications", desc: "Review queue alerts and package publication updates.", on: false },
];

function SettingsInner() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-page-eyebrow">System / Settings</p>
          <h2 className="admin-page-title">Exam Settings</h2>
          <p className="admin-page-copy">
            Central controls for assessment behavior and review workflows in the updated admin panel.
          </p>
        </div>
        <span className="admin-badge admin-badge-green">
          <span className="admin-dot" />
          Active
        </span>
      </div>

      <section className="admin-grid-3">
        {settings.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="admin-module-card">
              <div className="admin-control-row">
                <span className="admin-module-icon" style={{ background: "rgba(30,211,106,0.14)", color: "var(--admin-green)" }}>
                  <Icon size={20} />
                </span>
                <span className={`admin-badge ${item.on ? "admin-badge-green" : ""}`}>
                  <span className="admin-dot" />
                  {item.on ? "On" : "Off"}
                </span>
              </div>
              <div>
                <h3 className="admin-card-title">{item.title}</h3>
                <p className="admin-card-subtitle">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-card admin-card-pad">
        <div className="admin-row">
          <Settings size={18} color="var(--admin-green)" />
          <h3 className="admin-card-title">Backend-backed settings can be wired here as plugin schemas mature.</h3>
        </div>
      </div>
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
