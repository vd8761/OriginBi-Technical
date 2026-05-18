"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Layers,
  Users,
  Settings,
  ShieldAlert,
  Camera,
  Laptop,
  CheckCircle,
  Eye,
  Trash2,
  X,
  Mail,
  UserPlus,
  ArrowRight,
  FolderOpen,
  Calendar,
  AlertTriangle,
  Lock,
} from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import {
  Avatar,
  Badge,
  Card,
  Drawer,
  PillTabs,
  StatCard,
  StatusDot,
  ToggleSwitch,
  Modal,
} from "@/components/admin/ui";
import {
  getAdminGroups,
  createAdminGroup,
  updateAdminGroup,
  deleteAdminGroup,
  getAdminPrograms,
} from "@/lib/api";

interface GroupMember {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "blocked" | "pending";
  lastSeenAt: string | null;
}

interface Group {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "draft" | "archived";
  createdAt: string;
  proctoring: {
    fullScreenLock: boolean;
    tabSwitchLimit: number;
    webcamProctoring: boolean;
  };
  assessments: string[];
  members: GroupMember[];
  pricing?: {
    isFree: boolean;
  };
}

const DEFAULT_ASSESSMENTS = [
  "Technical Coding Challenge",
  "Aptitude & Logical Reasoning",
  "SQL & Database Design",
  "MNC Career Prep Assessment",
];

const INITIAL_GROUPS: Group[] = [
  {
    id: "group-1",
    code: "MCA-2026",
    name: "MCA Batch 2026",
    description: "Master of Computer Applications - Year 2 Technical Cohort",
    status: "active",
    createdAt: "2026-05-12T10:00:00Z",
    proctoring: {
      fullScreenLock: true,
      tabSwitchLimit: 3,
      webcamProctoring: true,
    },
    assessments: ["Technical Coding Challenge", "Aptitude & Logical Reasoning"],
    members: [
      { id: "m1", fullName: "Aarav Sharma", email: "aarav.sharma@mca2026.edu", status: "active", lastSeenAt: "2026-05-18T10:15:00Z" },
      { id: "m2", fullName: "Ananya Iyer", email: "ananya.iyer@mca2026.edu", status: "active", lastSeenAt: "2026-05-18T09:42:00Z" },
      { id: "m3", fullName: "Rahul Verma", email: "rahul.verma@mca2026.edu", status: "pending", lastSeenAt: null },
      { id: "m4", fullName: "Priya Nair", email: "priya.nair@mca2026.edu", status: "active", lastSeenAt: "2026-05-17T15:30:00Z" },
      { id: "m5", fullName: "Karan Johar", email: "karan.johar@mca2026.edu", status: "blocked", lastSeenAt: "2026-05-10T12:00:00Z" },
    ],
  },
  {
    id: "group-2",
    code: "CSE-A-2027",
    name: "B.Tech CSE A",
    description: "B.Tech Computer Science & Engineering - Section A",
    status: "active",
    createdAt: "2026-05-10T09:30:00Z",
    proctoring: {
      fullScreenLock: true,
      tabSwitchLimit: 5,
      webcamProctoring: false,
    },
    assessments: ["Technical Coding Challenge"],
    members: [
      { id: "m6", fullName: "Vihaan Gupta", email: "vihaan.csea@college.edu", status: "active", lastSeenAt: "2026-05-18T08:00:00Z" },
      { id: "m7", fullName: "Sneha Reddy", email: "sneha.csea@college.edu", status: "active", lastSeenAt: "2026-05-18T05:22:00Z" },
      { id: "m8", fullName: "Aditya Das", email: "aditya.csea@college.edu", status: "active", lastSeenAt: "2026-05-16T11:45:00Z" },
    ],
  },
  {
    id: "group-3",
    code: "QA-INTERN-2026",
    name: "QA Engineering Interns",
    description: "Quality Assurance Engineering Internship Program Batch",
    status: "active",
    createdAt: "2026-05-08T14:15:00Z",
    proctoring: {
      fullScreenLock: false,
      tabSwitchLimit: 0,
      webcamProctoring: false,
    },
    assessments: ["Technical Coding Challenge", "SQL & Database Design"],
    members: [
      { id: "m9", fullName: "Rohan Mehra", email: "rohan@company.com", status: "active", lastSeenAt: "2026-05-17T18:22:00Z" },
      { id: "m10", fullName: "Tara Sutaria", email: "tara@company.com", status: "active", lastSeenAt: "2026-05-18T10:00:00Z" },
    ],
  },
  {
    id: "group-4",
    code: "PD-2026",
    name: "Product Design Group",
    description: "Product Design and UI/UX Cohort",
    status: "draft",
    createdAt: "2026-05-15T11:00:00Z",
    proctoring: {
      fullScreenLock: false,
      tabSwitchLimit: 0,
      webcamProctoring: false,
    },
    assessments: ["Aptitude & Logical Reasoning"],
    members: [
      { id: "m11", fullName: "Kabir Roy", email: "kabir.design@academy.org", status: "pending", lastSeenAt: null },
    ],
  },
];

type FilterType = "all" | "active" | "draft" | "archived";

function formatRelativeFromIso(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Never";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "Just now";
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

// ── Mapper function ─────────────────────────────────────────────────────────
function mapBackendGroup(bg: any): Group {
  const meta = bg.groupMetadata || {};
  const assessments = Array.isArray(bg.assessments)
    ? bg.assessments.map((a: any) => a.name)
    : [];
  const isFree = Array.isArray(bg.assessments)
    ? bg.assessments.some((a: any) => a.isFree === true)
    : false;

  return {
    id: String(bg.id),
    code: bg.code || "",
    name: bg.name || "",
    description: meta.description || "",
    status: meta.status || (bg.isActive ? "active" : "draft"),
    createdAt: bg.createdAt || new Date().toISOString(),
    proctoring: meta.proctoring || {
      fullScreenLock: true,
      tabSwitchLimit: 3,
      webcamProctoring: true,
    },
    assessments,
    members: Array.from({ length: bg.candidateCount || 0 }).map((_, i) => ({
      id: `m-${i}`,
      fullName: `Candidate #${i + 1}`,
      email: `candidate${i + 1}@cohort.com`,
      status: "active",
      lastSeenAt: null,
    })),
    pricing: {
      isFree,
    },
  };
}

function GroupsInner() {
  const router = useRouter();
  useRegisterAdminPage({
    title: "Groups Management",
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [availableAssessments, setAvailableAssessments] = useState<string[]>(DEFAULT_ASSESSMENTS);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCode, setNewGroupCode] = useState("");
  const [newGroupAssessments, setNewGroupAssessments] = useState<string[]>([]);
  const [newGroupProctoring, setNewGroupProctoring] = useState({
    fullScreenLock: true,
    tabSwitchLimit: 3,
    webcamProctoring: true,
  });
  const [newGroupPricing, setNewGroupPricing] = useState({
    isFree: false,
  });

  // Drawer Tabs State
  const [drawerTab, setDrawerTab] = useState<"members" | "settings">("members");

  // Drawer Member Inputs State
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // Load groups and programs on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        try {
          const backendGroups = await getAdminGroups();
          setGroups(backendGroups.map(mapBackendGroup));
        } catch (groupsErr) {
          console.error("Failed to load cohort groups:", groupsErr);
        }

        try {
          const programsRes = await getAdminPrograms();
          if (programsRes && Array.isArray(programsRes.data)) {
            setAvailableAssessments(programsRes.data.map((p: any) => p.name));
          } else {
            setAvailableAssessments(DEFAULT_ASSESSMENTS);
          }
        } catch (programsErr) {
          console.error("Failed to load dynamic programs, falling back to defaults:", programsErr);
          setAvailableAssessments(DEFAULT_ASSESSMENTS);
        }
      } catch (err) {
        console.error("Failed in loadData:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch real group members when selected group changes
  useEffect(() => {
    if (selectedGroup) {
      const groupId = selectedGroup.id;
      async function loadMembers() {
        try {
          const res = await fetch(`/admin-api/admin/groups/${groupId}/members`);
          if (res.ok) {
            const data = await res.json();
            setGroupMembers(data.map((m: any) => ({
              id: String(m.id),
              fullName: m.fullName || m.email.split("@")[0],
              email: m.email,
              status: m.status || "active",
              lastSeenAt: m.createdAt || null,
            })));
          }
        } catch (err) {
          console.error("Failed to load group members:", err);
        }
      }
      loadMembers();
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroup]);

  // Load latest helper
  const loadLatestGroups = async () => {
    try {
      const backendGroups = await getAdminGroups();
      setGroups(backendGroups.map(mapBackendGroup));
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchesFilter = filter === "all" || g.status === filter;
      const matchesSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.code.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [groups, filter, search]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: groups.length,
      active: groups.filter((g) => g.status === "active").length,
      draft: groups.filter((g) => g.status === "draft").length,
      archived: groups.filter((g) => g.status === "archived").length,
    };
  }, [groups]);

  // Stats at top
  const stats = useMemo(() => {
    const totalMembers = groups.reduce((acc, curr) => acc + curr.members.length, 0);
    const activeAssessments = new Set(groups.flatMap((g) => g.assessments)).size;
    const avgMembers = groups.length > 0 ? Math.round(totalMembers / groups.length) : 0;
    return {
      totalGroups: groups.length,
      totalMembers,
      activeAssessments,
      avgMembers,
    };
  }, [groups]);

  // Handles adding new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupCode.trim()) return;

    const codeExists = groups.some(
      (g) => g.code.toLowerCase() === newGroupCode.trim().toLowerCase()
    );
    if (codeExists) {
      alert("Group code already exists! Please use a unique code.");
      return;
    }

    try {
      const body = {
        code: newGroupCode.trim().toUpperCase(),
        name: newGroupName.trim(),
        description: "",
        status: "active" as const,
        proctoring: newGroupProctoring,
        assessments: newGroupAssessments,
        pricing: newGroupPricing,
      };

      await createAdminGroup(body);
      await loadLatestGroups();

      // Reset inputs
      setNewGroupName("");
      setNewGroupCode("");
      setNewGroupAssessments([]);
      setNewGroupProctoring({
        fullScreenLock: true,
        tabSwitchLimit: 3,
        webcamProctoring: true,
      });
      setNewGroupPricing({
        isFree: false,
      });
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group in database");
    }
  };

  // Drawer Member Actions (Database groups mapped via registrations)
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Candidates must be added via individual registration or bulk CSV uploads.");
  };

  const handleRemoveMember = (memberId: string) => {
    alert("Candidate profiles must be managed from the main Users dashboard.");
  };

  const handleToggleMemberBlock = (memberId: string) => {
    alert("Candidate blocking/unblocking must be performed from the main Users dashboard.");
  };

  // Handles updating proctoring configuration
  const handleUpdateProctoring = async (key: keyof Group["proctoring"], value: any) => {
    if (!selectedGroup) return;
    try {
      const nextProctoring = {
        ...selectedGroup.proctoring,
        [key]: value,
      };
      const body = {
        proctoring: nextProctoring,
      };
      const updated = await updateAdminGroup(selectedGroup.id, body);
      await loadLatestGroups();
      setSelectedGroup(mapBackendGroup(updated));
    } catch (err) {
      console.error("Failed to update proctoring:", err);
    }
  };

  // Handles updating pricing override configuration
  const handleUpdatePricing = async (key: "isFree", value: any) => {
    if (!selectedGroup) return;
    try {
      const body = {
        pricing: {
          isFree: value,
        },
        assessments: selectedGroup.assessments,
      };
      const updated = await updateAdminGroup(selectedGroup.id, body);
      await loadLatestGroups();
      setSelectedGroup(mapBackendGroup(updated));
    } catch (err) {
      console.error("Failed to update pricing:", err);
    }
  };

  // Handles updating group status in drawer
  const handleUpdateGroupStatus = async (status: Group["status"]) => {
    if (!selectedGroup) return;
    try {
      const body = {
        status,
      };
      const updated = await updateAdminGroup(selectedGroup.id, body);
      await loadLatestGroups();
      setSelectedGroup(mapBackendGroup(updated));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Handles deleting/archiving group entirely
  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteAdminGroup(groupId);
      await loadLatestGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  // Toggles assessments inside drawer
  const handleToggleAssessment = async (assessment: string) => {
    if (!selectedGroup) return;
    const current = selectedGroup.assessments;
    const next = current.includes(assessment)
      ? current.filter((a) => a !== assessment)
      : [...current, assessment];

    try {
      const body = {
        assessments: next,
        pricing: selectedGroup.pricing,
      };
      const updated = await updateAdminGroup(selectedGroup.id, body);
      await loadLatestGroups();
      setSelectedGroup(mapBackendGroup(updated));
    } catch (err) {
      console.error("Failed to update assessments:", err);
    }
  };

  // Filters members for display in drawer
  const displayedMembers = useMemo(() => {
    return groupMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [groupMembers, memberSearch]);

  const tabs = useMemo(
    () => [
      { value: "all" as const, label: "All Groups", count: tabCounts.all },
      { value: "active" as const, label: "Active", count: tabCounts.active },
      { value: "draft" as const, label: "Drafts", count: tabCounts.draft },
      { value: "archived" as const, label: "Archived", count: tabCounts.archived },
    ],
    [tabCounts]
  );

  return (
    <div className="admin-page">
      {/* KPI Section */}
      <section className="admin-grid-4">
        <StatCard
          label="Total Groups"
          value={stats.totalGroups.toLocaleString()}
          sub="Configured Cohorts"
          icon={<Layers size={18} />}
          iconBg="rgba(139,109,240,0.18)"
          iconColor="var(--admin-purple)"
        />
        <StatCard
          label="Total Candidates"
          value={stats.totalMembers.toLocaleString()}
          sub="Across all batches"
          icon={<Users size={18} />}
          iconBg="rgba(30,211,106,0.16)"
          iconColor="var(--admin-green)"
        />
        <StatCard
          label="Active Assessments"
          value={stats.activeAssessments.toLocaleString()}
          sub="Assigned packages"
          icon={<FolderOpen size={18} />}
          iconBg="rgba(74,198,234,0.16)"
          iconColor="var(--admin-blue)"
        />
        <StatCard
          label="Avg Batch Size"
          value={stats.avgMembers.toLocaleString()}
          sub="Candidates per group"
          icon={<CheckCircle size={18} />}
          iconBg="rgba(255,183,3,0.18)"
          iconColor="var(--admin-amber)"
        />
      </section>

      {/* Control Card */}
      <Card>
        <div className="admin-control-row" style={{ marginBottom: 20 }}>
          <div className="admin-row" style={{ flexWrap: "wrap", gap: 12 }}>
            <label className="admin-search" style={{ width: 280 }}>
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search group code, name..."
                style={{ outline: "none", boxShadow: "none" }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-green border border-transparent rounded-lg text-sm font-medium text-white hover:bg-brand-green/90 transition-all cursor-pointer shadow-sm"
          >
            <Plus size={16} className="text-white" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-4">
          {filteredGroups.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              <Layers size={48} className="mx-auto text-gray-400/50 mb-3" />
              <p className="text-base font-semibold">No groups found</p>
              <p className="text-sm mt-1 text-gray-400">Create a new group or check your filter criteria.</p>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => {
                  setSelectedGroup(g);
                  setDrawerTab("members");
                }}
                className="group relative border border-gray-100 dark:border-white/10 hover:border-brand-green dark:hover:border-brand-green/60 rounded-2xl p-5 bg-white dark:bg-[#1a201c] hover:bg-brand-green/[0.01] dark:hover:bg-brand-green/[0.01] transition-all cursor-pointer flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs text-brand-green font-bold bg-brand-green/10 px-2 py-0.5 rounded-md">
                        {g.code}
                      </span>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white mt-2 group-hover:text-brand-green transition-colors">
                        {g.name}
                      </h4>
                    </div>
                    <Badge
                      tone={
                        g.status === "active"
                          ? "green"
                          : g.status === "draft"
                          ? "amber"
                          : "neutral"
                      }
                    >
                      {g.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {g.assessments.length === 0 ? (
                      <span className="text-[10px] text-gray-400 font-medium">No assessments assigned</span>
                    ) : (
                      g.assessments.map((a) => (
                        <span
                          key={a}
                          className="text-[10px] bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 font-medium"
                        >
                          {a}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 dark:border-white/5 pt-4 mt-5">
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Users size={12} className="text-gray-400" />
                      <strong>{g.members.length}</strong> candidates
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(g.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {g.proctoring.fullScreenLock && (
                      <span title="Full-screen lock enabled" className="p-1 rounded-md bg-rose-500/10 text-rose-500">
                        <Laptop size={12} />
                      </span>
                    )}
                    {g.proctoring.webcamProctoring && (
                      <span title="Webcam verification required" className="p-1 rounded-md bg-amber-500/10 text-amber-500">
                        <Camera size={12} />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
                      className="p-1 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors ml-2"
                      title="Archive Group"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Cohort Group"
        eyebrow="Workspace Management"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-sm text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-group-form"
              className="px-5 py-2 bg-brand-green rounded-lg text-sm text-white hover:bg-brand-green/90 transition-all font-semibold cursor-pointer"
            >
              Create
            </button>
          </div>
        }
      >
        <form id="create-group-form" onSubmit={handleCreateGroup} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-black dark:text-white tracking-wider">Group Name</span>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. B.Tech CSE Batch 2026"
                className="admin-field text-black dark:text-white"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-black dark:text-white tracking-wider">Group Code</span>
              <input
                value={newGroupCode}
                onChange={(e) => setNewGroupCode(e.target.value)}
                placeholder="e.g. CSE-2026"
                className="admin-field font-mono text-black dark:text-white"
                required
              />
            </label>
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 pt-4 mt-2">
            <h4 className="text-xs font-bold text-black dark:text-white tracking-wider mb-3">
              Assign Assessments
            </h4>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {availableAssessments.map((a) => {
                const checked = newGroupAssessments.includes(a);
                return (
                  <label
                    key={a}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-lg text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-black dark:text-white font-medium"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setNewGroupAssessments(newGroupAssessments.filter((x) => x !== a));
                        } else {
                          setNewGroupAssessments([...newGroupAssessments, a]);
                        }
                      }}
                      className="accent-brand-green h-4 w-4 rounded"
                    />
                    {a}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 pt-4 mt-2">
            <h4 className="text-xs font-bold text-black dark:text-white tracking-wider mb-3">
              Cohort Pricing Configuration
            </h4>
            <div className="flex flex-col gap-3">
              <ToggleSwitch
                checked={newGroupPricing.isFree}
                onChange={(val) =>
                  setNewGroupPricing({ ...newGroupPricing, isFree: val })
                }
                label="Make Assessments Free"
                hint="Assigned candidates will bypass checkout payment gate completely"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        open={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        title={selectedGroup ? selectedGroup.name : undefined}
        subtitle={selectedGroup ? `Group Code: ${selectedGroup.code} · Created ${new Date(selectedGroup.createdAt).toLocaleDateString()}` : undefined}
      >
        {selectedGroup && (
          <div className="flex flex-col h-full gap-5">
            {/* Tab switchers in Drawer */}
            <div className="flex border-b border-gray-100 dark:border-white/10 gap-4 mt-2">
              <button
                type="button"
                onClick={() => setDrawerTab("members")}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  drawerTab === "members"
                    ? "text-brand-green font-extrabold"
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                }`}
              >
                Members ({selectedGroup.members.length})
                {drawerTab === "members" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("settings")}
                className={`pb-2.5 text-xs font-bold transition-all relative ${
                  drawerTab === "settings"
                    ? "text-brand-green font-extrabold"
                    : "text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                }`}
              >
                Packages
                {drawerTab === "settings" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green rounded-full" />
                )}
              </button>
            </div>

            {/* TAB CONTENT: MEMBERS */}
            {drawerTab === "members" && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Add Member inline form */}
                <form
                  onSubmit={handleAddMember}
                  className="flex flex-col gap-2 p-3.5 bg-brand-green/5 border border-brand-green/10 rounded-xl"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-green">
                    Add new candidate manually
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    <input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Full Name"
                      className="admin-field py-1.5 px-3 text-xs text-black dark:text-white"
                      required
                    />
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="admin-field py-1.5 px-3 text-xs text-black dark:text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-4 bg-brand-green hover:bg-brand-green/90 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer mt-1"
                  >
                    <UserPlus size={13} />
                    <span>Add Candidate</span>
                  </button>
                </form>

                {/* Member search filter */}
                <div className="flex items-center justify-between mt-2 gap-3">
                  <label className="admin-search flex-1 py-1.5 px-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
                    <Search size={12} className="text-black dark:text-white" />
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search member email, name..."
                      style={{ outline: "none", boxShadow: "none", fontSize: 12 }}
                      className="text-black dark:text-white"
                    />
                  </label>
                </div>

                {/* Members list */}
                <div className="flex-1 flex flex-col gap-2 mt-1">
                  {displayedMembers.length === 0 ? (
                    <div className="text-center py-10 text-black dark:text-white text-xs">
                      No members in this group match the search.
                    </div>
                  ) : (
                    displayedMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 border border-gray-50 dark:border-white/[0.04] bg-white dark:bg-[#1f2621] rounded-xl hover:border-gray-200 dark:hover:border-white/10 transition-all gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={m.fullName} email={m.email} size={32} />
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-black dark:text-white truncate">
                              {m.fullName}
                            </h5>
                            <p className="text-[10.5px] text-black dark:text-white truncate mt-0.5">{m.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <span className="text-[9.5px] text-black dark:text-white block">Seen</span>
                            <span className="text-[10px] text-black dark:text-white font-medium">
                              {formatRelativeFromIso(m.lastSeenAt)}
                            </span>
                          </div>

                          <Badge
                            tone={
                              m.status === "active"
                                ? "green"
                                : m.status === "pending"
                                ? "amber"
                                : "red"
                            }
                          >
                            {m.status}
                          </Badge>

                          <div className="flex items-center gap-1 border-l border-gray-100 dark:border-white/10 pl-2 ml-1">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberBlock(m.id)}
                              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-xs font-bold ${
                                m.status === "blocked" ? "text-brand-green" : "text-rose-500"
                              }`}
                              title={m.status === "blocked" ? "Unblock candidate" : "Block candidate"}
                            >
                              <Lock size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-1 rounded hover:bg-red-500/10 text-black dark:text-white hover:text-red-500 transition-all"
                              title="Remove Candidate"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SETTINGS & PROCTORING */}
            {drawerTab === "settings" && (
              <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
                {/* Assigned Assessments Section */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10.5px] font-extrabold tracking-wider text-black dark:text-white">
                    Assigned Assessments
                  </h4>
                  <p className="text-[11px] text-black dark:text-white leading-normal">
                    Candidates who register under this group will be automatically granted free-tier trial access to the selected packages.
                  </p>
                  <div className="flex flex-col gap-2">
                    {availableAssessments.map((a) => {
                      const checked = selectedGroup.assessments.includes(a);
                      return (
                        <label
                          key={a}
                          className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-black dark:text-white font-semibold"
                        >
                          <span>{a}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleAssessment(a)}
                            className="accent-brand-green h-4 w-4 rounded"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Cohort Pricing Override Settings */}
                <div className="flex flex-col gap-3 mt-2 border-t border-gray-100 dark:border-white/10 pt-4">
                  <h4 className="text-[10.5px] font-extrabold tracking-wider text-black dark:text-white">
                    Cohort Pricing Override
                  </h4>
                  <p className="text-[11px] text-black dark:text-white leading-normal">
                    Manage pricing options for this specific cohort. Bypasses standard program cost configuration.
                  </p>
                  <div className="flex flex-col gap-3">
                    <ToggleSwitch
                      checked={selectedGroup.pricing?.isFree || false}
                      onChange={(val) => handleUpdatePricing("isFree", val)}
                      label="Mark Assessments as Free"
                      hint="Bypass payments for all students assigned to this group"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default function GroupsPage() {
  return (
    <AdminGuard>
      <GroupsInner />
    </AdminGuard>
  );
}
