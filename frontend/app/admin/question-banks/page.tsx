"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Banknote,
  Brain,
  Code2,
  Download,
  FileJson,
  MessageSquare,
  Settings as SettingsIcon,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import type { ComponentType } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import { Badge, Card } from "@/components/admin/ui";
import { listAdminQuestions } from "@/lib/api";

interface ModuleTile {
  slug: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  accentClass: string;
  trial: number;
  main: number | null;
  categories: string[];
  manageHref: string;
  settingsHref: string;
  isNew?: boolean;
}

const baseTiles: Omit<ModuleTile, "main">[] = [
  {
    slug: "aptitude",
    title: "Aptitude Assessment",
    description: "Quantitative, logical, verbal and abstract reasoning packs.",
    icon: Brain,
    accentClass: "admin-acc-aptitude",
    trial: 18,
    categories: ["Quant", "Logic", "Verbal", "Abstract"],
    manageHref: "/admin/questions?pool=aptitude",
    settingsHref: "/admin/settings?tab=scoring",
  },
  {
    slug: "mnc",
    title: "MNC Career Prep",
    description: "Company-style problem packs, case studies, and HR rounds.",
    icon: Banknote,
    accentClass: "admin-acc-mnc",
    trial: 12,
    categories: ["Aptitude", "Coding", "HR", "Comm"],
    manageHref: "/admin/questions?pool=mnc",
    settingsHref: "/admin/settings?tab=scoring",
  },
  {
    slug: "comm",
    title: "Communication Skills",
    description: "Email writing, reading comprehension and speaking prompts.",
    icon: MessageSquare,
    accentClass: "admin-acc-comm",
    trial: 8,
    categories: ["Reading", "Writing", "Speaking"],
    manageHref: "/admin/questions?pool=comm",
    settingsHref: "/admin/settings?tab=scoring",
  },
  {
    slug: "role",
    title: "Role-Based Technical",
    description: "Curated bundles per job role, level, and stack.",
    icon: Target,
    accentClass: "admin-acc-role",
    trial: 14,
    categories: ["Frontend", "Backend", "Data", "DevOps"],
    manageHref: "/admin/questions?pool=role",
    settingsHref: "/admin/settings?tab=scoring",
  },
  {
    slug: "coding",
    title: "Coding Challenges",
    description: "Problems, test cases, languages, Judge0 limits.",
    icon: Code2,
    accentClass: "admin-acc-coding",
    trial: 12,
    categories: ["Arrays", "Graphs", "DP", "Strings"],
    manageHref: "/admin/coding",
    settingsHref: "/admin/settings?tab=scoring",
    isNew: true,
  },
];

interface ModuleTileCardProps {
  tile: ModuleTile;
}

function ModuleTileCard({ tile }: ModuleTileCardProps) {
  const Icon = tile.icon;
  const mainLabel = tile.main === null ? "—" : tile.main.toLocaleString();
  return (
    <article className={`admin-module-card admin-qb-tile ${tile.accentClass}`}>
      <div className="admin-control-row">
        <span
          className="admin-module-icon admin-qb-icon"
          style={{ background: "var(--admin-acc-bg)", color: "var(--admin-acc)" }}
        >
          <Icon size={22} strokeWidth={2.1} />
        </span>
        {tile.isNew && (
          <span className="admin-qb-new-badge">
            <Sparkles size={11} strokeWidth={2.4} />
            NEW MODULE
          </span>
        )}
      </div>

      <div>
        <h3 className="admin-card-title" style={{ fontSize: 16 }}>
          {tile.title}
        </h3>
        <p className="admin-card-subtitle" style={{ lineHeight: 1.5, marginTop: 6 }}>
          {tile.description}
        </p>
      </div>

      <div className="admin-qb-stats">
        <div className="admin-qb-stat">
          <p className="admin-stat-label">Trial</p>
          <strong>{tile.trial.toLocaleString()}</strong>
        </div>
        <div className="admin-qb-stat">
          <p className="admin-stat-label">Main</p>
          <strong>{mainLabel}</strong>
        </div>
      </div>

      <div className="admin-row" style={{ flexWrap: "wrap", gap: 6 }}>
        {tile.categories.map((cat) => (
          <Badge key={cat} tone="neutral">
            {cat}
          </Badge>
        ))}
      </div>

      <div className="admin-control-row" style={{ marginTop: "auto" }}>
        <Link href={tile.settingsHref} className="admin-btn admin-btn-ghost">
          <SettingsIcon size={13} /> Settings
        </Link>
        <Link
          href={tile.manageHref}
          className="admin-btn admin-qb-manage-btn"
          style={{ background: "var(--admin-acc-bg)", color: "var(--admin-acc)", borderColor: "transparent" }}
        >
          Manage Questions
        </Link>
      </div>
    </article>
  );
}

function QuestionBanksInner() {
  useRegisterAdminPage({
    eyebrow: "Content",
    title: "Question Banks",
    subtitle: "Pick a module to manage its question pool, scoring rules, and import schemas.",
    breadcrumb: [
      { label: "Admin Hub", href: "/admin" },
      { label: "Question Banks" },
    ],
  });

  const [codingMain, setCodingMain] = useState<number | null>(null);

  useEffect(() => {
    listAdminQuestions({ pluginSlug: "assessment.coding" })
      .then((data) => setCodingMain(data.questions.length))
      .catch(() => setCodingMain(null));
  }, []);

  const tiles: ModuleTile[] = baseTiles.map((tile) => {
    if (tile.slug === "coding") {
      return { ...tile, main: codingMain };
    }
    const fallback: Record<string, number> = { aptitude: 132, mnc: 86, comm: 64, role: 96 };
    return { ...tile, main: fallback[tile.slug] ?? 0 };
  });

  return (
    <div className="admin-page">
      <section className="admin-qb-grid">
        {tiles.map((tile) => (
          <ModuleTileCard key={tile.slug} tile={tile} />
        ))}
      </section>

      <Card>
        <div className="admin-control-row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span
              className="admin-module-icon"
              style={{ background: "var(--admin-green-soft)", color: "var(--admin-green)" }}
            >
              <Upload size={20} />
            </span>
            <div>
              <h3 className="admin-card-title">Bulk import via JSON or CSV</h3>
              <p className="admin-card-subtitle" style={{ marginTop: 6, maxWidth: 560 }}>
                Upload many questions at once using our schema. Drafts land in the selected
                module and are versioned the same way as questions authored in the UI.
              </p>
            </div>
          </div>
          <div className="admin-row" style={{ gap: 10 }}>
            <Link href="/admin/coding/bulk-import" className="admin-btn admin-btn-primary">
              <Upload size={14} /> Bulk Import
            </Link>
            <a
              href="/api/schemas/question-bank-import.json"
              className="admin-btn admin-btn-secondary"
              target="_blank"
              rel="noopener"
            >
              <FileJson size={14} /> View Schema
            </a>
            <a
              href="/api/schemas/question-bank-template.csv"
              className="admin-btn admin-btn-ghost"
              target="_blank"
              rel="noopener"
            >
              <Download size={14} /> CSV Template
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function QuestionBanksPage() {
  return (
    <AdminGuard>
      <QuestionBanksInner />
    </AdminGuard>
  );
}
