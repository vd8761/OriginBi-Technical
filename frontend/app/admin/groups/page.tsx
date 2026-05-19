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
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { COUNTRY_CODES } from "@/lib/countryCodes";
import AdminGuard from "@/components/admin/AdminGuard";
import { useRegisterAdminPage } from "@/components/admin/AdminPageContext";
import AddRegistrationForm from "@/components/admin/AddRegistrationForm";
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
  SegmentedToggle,
} from "@/components/admin/ui";
import {
  getAdminGroups,
  createAdminGroup,
  updateAdminGroup,
  deleteAdminGroup,
  getAdminAssessments,
} from "@/lib/api";

interface GroupMember {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "blocked" | "pending";
  lastSeenAt: string | null;
  mobileNumber?: string;
  designation?: string; countryCode?: string;
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
  "Coding Assessment",
  "Technical Aptitude Assessment",
  "Communication Skills Assessment",
  "Role Fit Assessment",
  "MNC Readiness Assessment",
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
  // Handle both SQL query shape (groupMetadata) and TypeORM entity shape (metadata)
  const meta = bg.groupMetadata || bg.metadata || {};
  
  // Handle both legacy objects and raw string arrays of assessments
  const rawAssessments = Array.isArray(bg.assessments)
    ? bg.assessments
    : Array.isArray(meta.assessments)
    ? meta.assessments
    : [];
  const assessments = rawAssessments.map((a: any) => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object" && a.name) return a.name;
    return String(a);
  });

  const isFree = meta.isFree === true;

  return {
    id: String(bg.id),
    code: bg.code || "",
    name: bg.name || "",
    description: meta.description || "",
    status: meta.status || (bg.isActive ? "active" : "draft"),
    createdAt: bg.createdAt || bg.created_at || new Date().toISOString(),
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
  
  // Custom navigation views
  const [view, setView] = useState<"list" | "detail" | "add-candidate">("list");
  const [membersRefreshTrigger, setMembersRefreshTrigger] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const limit = 10;
  const studentLimit = 10;

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
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

  // Drawer Tabs State (unused now, kept for backward compatibility if reference is needed)
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
          const assessmentsRes = await getAdminAssessments();
          if (assessmentsRes && Array.isArray(assessmentsRes.data) && assessmentsRes.data.length > 0) {
            const names = assessmentsRes.data.map((a: any) => a.assessment_name).filter(Boolean);
            setAvailableAssessments(names.length > 0 ? names : DEFAULT_ASSESSMENTS);
          } else {
            setAvailableAssessments(DEFAULT_ASSESSMENTS);
          }
        } catch (assessmentsErr) {
          console.error("Failed to load tech assessments, falling back to defaults:", assessmentsErr);
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
          const res = await fetch(`/api/admin/groups/${groupId}/members`);
          if (res.ok) {
            const data = await res.json();
            setGroupMembers(data.map((m: any) => ({
              id: String(m.id),
              fullName: m.fullName || m.email.split("@")[0],
              email: m.email,
              status: m.status === "registered" ? "active" : (m.status || "active"),
              lastSeenAt: m.createdAt || null,
              mobileNumber: m.mobileNumber || "—", countryCode: m.countryCode || "+91",
              designation: m.designation || "—",
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
  }, [selectedGroup, membersRefreshTrigger]);

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

  // Reset pagination when search or filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

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

  // Paginated Groups
  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return filteredGroups.slice(startIndex, startIndex + limit);
  }, [filteredGroups, currentPage]);

  // Handles adding new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const codeWord = newGroupName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      const body = {
        code: codeWord || "AUTO",
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

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handles saving group changes to the database
  const handleSaveSettings = async () => {
    if (!selectedGroup) return;
    if (!selectedGroup.name.trim()) {
      alert("Group name cannot be empty.");
      return;
    }
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const body = {
        name: selectedGroup.name.trim(),
        pricing: {
          isFree: selectedGroup.pricing?.isFree || false,
        },
        proctoring: selectedGroup.proctoring,
        assessments: selectedGroup.assessments,
      };

      const updated = await updateAdminGroup(selectedGroup.id, body);
      await loadLatestGroups();
      setSelectedGroup(mapBackendGroup(updated));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save cohort settings:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handles deleting/archiving group entirely
  const handleDeleteGroup = async (groupId: string) => {
    if (!selectedGroup) return;
    setIsDeletingGroup(true);
    try {
      await deleteAdminGroup(groupId);
      await loadLatestGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setView("list");
      }
      setIsDeleteConfirmOpen(false);
    } catch (err) {
      console.error("Failed to delete group:", err);
    } finally {
      setIsDeletingGroup(false);
    }
  };

  const tabs = useMemo(
    () => [
      { value: "all" as const, label: "All Groups", count: tabCounts.all },
      { value: "active" as const, label: "Active", count: tabCounts.active },
      { value: "draft" as const, label: "Drafts", count: tabCounts.draft },
      { value: "archived" as const, label: "Archived", count: tabCounts.archived },
    ],
    [tabCounts]
  );

  // ── ADD CANDIDATE VIEW RENDERING ──────────────────────────────────────────────
  if (view === "add-candidate" && selectedGroup) {
    return (
      <div className="admin-page">
        <AddRegistrationForm
          initialGroupCode={selectedGroup.name}
          onCancel={() => setView("detail")}
          onRegister={async () => {
            setView("detail");
            await loadLatestGroups();
            setMembersRefreshTrigger((prev) => prev + 1);
          }}
        />
      </div>
    );
  }

  // ── DETAILED VIEW RENDERING ───────────────────────────────────────────────────
  if (view === "detail" && selectedGroup) {
    const originalGroup = groups.find((g) => g.id === selectedGroup.id) || null;

    const hasChanges = (() => {
      if (!originalGroup) return false;
      if (selectedGroup.name !== originalGroup.name) return true;
      const selectedIsFree = selectedGroup.pricing?.isFree ?? false;
      const originalIsFree = originalGroup.pricing?.isFree ?? false;
      if (selectedIsFree !== originalIsFree) return true;
      if (
        selectedGroup.proctoring.fullScreenLock !== originalGroup.proctoring.fullScreenLock ||
        selectedGroup.proctoring.tabSwitchLimit !== originalGroup.proctoring.tabSwitchLimit ||
        selectedGroup.proctoring.webcamProctoring !== originalGroup.proctoring.webcamProctoring
      ) {
        return true;
      }
      const selectedAss = [...selectedGroup.assessments].sort();
      const originalAss = [...originalGroup.assessments].sort();
      if (
        selectedAss.length !== originalAss.length ||
        selectedAss.some((a, idx) => a !== originalAss[idx])
      ) {
        return true;
      }
      return false;
    })();

    const displayedMembers = groupMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
    );

    const paginatedMembers = displayedMembers.slice(
      (studentPage - 1) * studentLimit,
      studentPage * studentLimit
    );

    return (
      <div className="admin-page">
        {/* Back navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setView("list");
                setSelectedGroup(null);
              }}
              className="flex items-center justify-center p-2 rounded-lg bg-white dark:bg-[#FFFFFF0F] border border-gray-200 dark:border-[#FFFFFF0F] hover:bg-gray-50 dark:hover:bg-white/20 transition-all text-black dark:text-white cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-black dark:text-white">
                  {selectedGroup.name}
                </h1>
                <span className="font-mono text-xs text-brand-green font-bold bg-brand-green/10 px-2 py-0.5 rounded-md">
                  {selectedGroup.code}
                </span>
              </div>
              <p className="text-xs text-black dark:text-white mt-1">
                Created {new Date(selectedGroup.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Settings Button */}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving || !hasChanges}
              className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-md ${
                saveSuccess
                  ? "bg-emerald-600 shadow-emerald-500/20"
                  : !hasChanges
                  ? "bg-gray-400 dark:bg-white/10 text-black dark:text-white cursor-not-allowed opacity-50 shadow-none"
                  : "bg-brand-green hover:bg-brand-green/90 disabled:opacity-50 shadow-brand-green/20"
              }`}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={13} />
              ) : saveSuccess ? (
                <Check size={13} />
              ) : (
                <Save size={13} />
              )}
              <span>{saveSuccess ? "Settings Saved!" : isSaving ? "Saving..." : "Save Settings"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDeleteConfirmOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Group</span>
            </button>
          </div>
        </div>

        {/* Top Configuration Row (3-Columns Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Card 1: Cohort settings & pricing toggle */}
          <Card>
            <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-4 border-b border-black/5 dark:border-white/5 pb-2">
              Group Configuration
            </h3>
            
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Group Name</span>
                <input
                  value={selectedGroup.name}
                  onChange={(e) => {
                    setSelectedGroup({
                      ...selectedGroup,
                      name: e.target.value,
                    });
                  }}
                  className="admin-field text-xs text-black dark:text-white px-3 py-2"
                  placeholder="Group Name"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">Pricing Policy</span>
                <div className="w-fit">
                  <SegmentedToggle
                    value={selectedGroup.pricing?.isFree ? "free" : "pay"}
                    onChange={(val) => {
                      setSelectedGroup({
                        ...selectedGroup,
                        pricing: {
                          ...selectedGroup.pricing,
                          isFree: val === "free",
                        },
                      });
                    }}
                    options={[
                      { value: "free", label: "Free" },
                      { value: "pay", label: "Pay" },
                    ]}
                  />
                </div>
                <p className="text-[10px] text-black dark:text-white mt-0.5">
                  {selectedGroup.pricing?.isFree
                    ? "Candidates bypass checkout payment gate completely"
                    : "Candidates must complete payment before accessing assessments"}
                </p>
              </div>
            </div>
          </Card>

          {/* Card 2: Security & Proctoring */}
          <Card>
            <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-4 border-b border-black/5 dark:border-white/5 pb-2">
              Security & Proctoring
            </h3>
            
            <div className="flex flex-col gap-5">
              <ToggleSwitch
                checked={selectedGroup.proctoring.fullScreenLock}
                onChange={(val) => {
                  setSelectedGroup({
                    ...selectedGroup,
                    proctoring: {
                      ...selectedGroup.proctoring,
                      fullScreenLock: val,
                    },
                  });
                }}
                label="Enforce Full Screen Lock"
                hint="Requires students to remain in full-screen during exams"
              />

              {selectedGroup.proctoring.fullScreenLock && (
                <label className="flex flex-col gap-1.5 pl-2 border-l-2 border-rose-500/30">
                  <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Tab Switch Lockout Limit
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={selectedGroup.proctoring.tabSwitchLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSelectedGroup({
                        ...selectedGroup,
                        proctoring: {
                          ...selectedGroup.proctoring,
                          tabSwitchLimit: val,
                        },
                      });
                    }}
                    className="admin-field text-xs text-black dark:text-white px-3 py-2 max-w-[120px]"
                  />
                  <p className="text-[10px] text-black dark:text-white">
                    Attempts will be force-submitted after this number of switch violations. Set to 0 to disable lockout.
                  </p>
                </label>
              )}

              <ToggleSwitch
                checked={selectedGroup.proctoring.webcamProctoring}
                onChange={(val) => {
                  setSelectedGroup({
                    ...selectedGroup,
                    proctoring: {
                      ...selectedGroup.proctoring,
                      webcamProctoring: val,
                    },
                  });
                }}
                label="Enable Webcam Verification"
                hint="Captures continuous proctor snapshots of students"
              />
            </div>
          </Card>

          {/* Card 3: Assigned Packages */}
          <Card>
            <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-4 border-b border-black/5 dark:border-white/5 pb-2">
              Assigned Packages ({selectedGroup.assessments.length})
            </h3>
            
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {availableAssessments.map((a) => {
                const checked = selectedGroup.assessments.includes(a);
                return (
                  <label
                    key={a}
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-black dark:text-white font-semibold"
                  >
                    <span className="truncate max-w-[85%]">{a}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const current = selectedGroup.assessments;
                        const next = current.includes(a)
                          ? current.filter((item) => item !== a)
                          : [...current, a];
                        setSelectedGroup({
                          ...selectedGroup,
                          assessments: next,
                        });
                      }}
                      className="accent-brand-green h-4 w-4 rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </Card>

        </div>

        {/* Student List & Members (Full Width) */}
        <div className="w-full flex flex-col gap-6">
          
          {/* Student Table Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  Group Candidates
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <label className="admin-search w-full sm:w-64">
                  <Search size={14} />
                  <input
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setStudentPage(1);
                    }}
                    placeholder="Search candidate name, email..."
                    style={{ outline: "none", boxShadow: "none" }}
                  />
                </label>

                {/* Add Candidate Button */}
                <button
                  type="button"
                  onClick={() => setView("add-candidate")}
                  className="flex items-center justify-center gap-1.5 py-2 px-4 bg-brand-green hover:bg-brand-green/90 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shrink-0 h-9 shadow-md shadow-brand-green/20"
                >
                  <UserPlus size={14} />
                  <span>Add Candidate</span>
                </button>
              </div>
            </div>

            {/* Student Table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email ID</th>
                    <th>Phone Number</th>
                    <th>Designation</th>
                    <th>Joined Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                        No candidates assigned or matching the filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="admin-row" style={{ gap: 12 }}>
                            <Avatar name={m.fullName} email={m.email} />
                            <span style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{m.fullName}</span>
                          </div>
                        </td>
                        <td style={{ color: "var(--admin-fg)" }}>{m.email}</td>
                        <td>
                          <div className="flex items-center gap-2 admin-mono" style={{ color: "var(--admin-fg)" }}>
                            {m.mobileNumber && m.mobileNumber !== "—" ? (
                              <>
                                <ReactCountryFlag
                                  countryCode={COUNTRY_CODES.find(c => c.dial_code === (m.countryCode || "+91"))?.code || "IN"}
                                  svg
                                  style={{
                                    width: "1.4em",
                                    height: "1.4em",
                                    borderRadius: "2px",
                                  }}
                                />
                                <span style={{ color: "var(--admin-muted-fg)" }}>{m.countryCode || "+91"}</span>
                                <span>{m.mobileNumber}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </div>
                        </td>
                        <td style={{ color: "var(--admin-fg)" }}>{m.designation || "—"}</td>
                        <td style={{ color: "var(--admin-fg)" }}>
                          {m.lastSeenAt ? new Date(m.lastSeenAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "2-digit",
                            year: "numeric"
                          }) : "—"}
                        </td>
                        <td>
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
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Student List Pagination */}
            {displayedMembers.length > studentLimit && (
              <div className="admin-pagination-row mt-4">
                <div className="admin-pagination-info">
                  Showing <strong>{Math.min((studentPage - 1) * studentLimit + 1, displayedMembers.length)}</strong> to{" "}
                  <strong>{Math.min(studentPage * studentLimit, displayedMembers.length)}</strong> of{" "}
                  <strong>{displayedMembers.length.toLocaleString()}</strong> candidates
                </div>
                <div className="admin-pagination-actions">
                  <button
                    className="admin-pagination-btn"
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="admin-pagination-pages">
                    {Array.from({ length: Math.ceil(displayedMembers.length / studentLimit) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          className={`admin-pagination-page ${studentPage === pageNum ? "active" : ""}`}
                          onClick={() => setStudentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="admin-pagination-btn"
                    disabled={studentPage >= Math.ceil(displayedMembers.length / studentLimit)}
                    onClick={() => setStudentPage((p) => p + 1)}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </Card>

        </div>

        <Modal
          narrow
          open={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          title="Delete Group"
          eyebrow="Workspace Management"
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-sm text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedGroup) {
                    handleDeleteGroup(selectedGroup.id);
                  }
                }}
                disabled={isDeletingGroup}
                className="px-5 py-2 bg-rose-600 rounded-lg text-sm text-white hover:bg-rose-700 transition-all font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingGroup && <Loader2 size={12} className="animate-spin" />}
                Delete Group
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-black dark:text-white leading-relaxed">
              Are you sure you want to delete the group <strong className="text-rose-500 font-bold">&quot;{selectedGroup?.name}&quot;</strong>?
            </p>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold leading-normal">
                Warning: This action is permanent. All candidates and records associated with this group will be deleted from this cohort.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // ── DEFAULT LIST VIEW RENDERING ────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* KPI Section */}
      <section className="admin-grid-4">
        <StatCard
          label="Total Groups"
          value={stats.totalGroups.toLocaleString()}
          sub="Configured Groups"
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

        {/* Group Table */}
        <div className="admin-table-wrap mt-4">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Assigned Packages</th>
                <th>Candidates</th>
                <th>Pricing Policy</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && groups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                    Loading groups…
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--admin-fg)" }}>
                    No groups found.
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => {
                      setSelectedGroup(g);
                      setView("detail");
                    }}
                    style={{ cursor: "pointer" }}
                    className="hover:bg-brand-green/[0.02]"
                  >
                    <td>
                      <span style={{ fontWeight: 700, color: "var(--admin-fg)" }}>{g.name}</span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {g.assessments.length === 0 ? (
                          <span className="text-[10px] text-black/50 dark:text-white/50">No assessments</span>
                        ) : (
                          g.assessments.map((a) => (
                            <span
                              key={a}
                              className="text-[9.5px] bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-1.5 py-0.5 rounded text-black/70 dark:text-white/70"
                            >
                              {a}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-black/80 dark:text-white/80 font-bold">
                        {g.members.length}
                      </span>
                    </td>
                    <td>
                      <Badge tone={g.pricing?.isFree ? "green" : "blue"}>
                        {g.pricing?.isFree ? "Free" : "Pay"}
                      </Badge>
                    </td>
                    <td>
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
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup(g);
                            setView("detail");
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Group Table Pagination */}
        {filteredGroups.length > limit && (
          <div className="admin-pagination-row">
            <div className="admin-pagination-info">
              Showing <strong>{Math.min((currentPage - 1) * limit + 1, filteredGroups.length)}</strong> to{" "}
              <strong>{Math.min(currentPage * limit, filteredGroups.length)}</strong> of{" "}
              <strong>{filteredGroups.length.toLocaleString()}</strong> groups
            </div>
            <div className="admin-pagination-actions">
              <button
                className="admin-pagination-btn"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="admin-pagination-pages">
                {Array.from({ length: Math.ceil(filteredGroups.length / limit) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      className={`admin-pagination-page ${currentPage === pageNum ? "active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="admin-pagination-btn"
                disabled={currentPage >= Math.ceil(filteredGroups.length / limit) || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Group"
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
                onChange={(e) => {
                  const val = e.target.value;
                  setNewGroupName(val);
                  const cleanWord = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                  setNewGroupCode(cleanWord);
                }}
                placeholder="e.g. B.Tech CSE Batch 2026"
                className="admin-field text-black dark:text-white placeholder:text-xs placeholder:opacity-50"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold text-black dark:text-white tracking-wider">
                Group Code <span className="text-[10px] text-brand-green font-normal lowercase">(Auto-generated)</span>
              </span>
              <input
                value={newGroupCode || "Awaiting name..."}
                readOnly
                disabled
                className="admin-field font-mono text-black/70 dark:text-white/70 bg-black/[0.03] dark:bg-white/[0.03] cursor-not-allowed opacity-75"
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
              Group Pricing Configuration
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

      <Modal
        narrow
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Group"
        eyebrow="Workspace Management"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-sm text-black dark:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedGroup) {
                  handleDeleteGroup(selectedGroup.id);
                }
              }}
              disabled={isDeletingGroup}
              className="px-5 py-2 bg-rose-600 rounded-lg text-sm text-white hover:bg-rose-700 transition-all font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isDeletingGroup && <Loader2 size={12} className="animate-spin" />}
              Delete Group
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-black dark:text-white leading-relaxed">
            Are you sure you want to delete the group <strong className="text-rose-500 font-bold">&quot;{selectedGroup?.name}&quot;</strong>?
          </p>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <p className="text-xs text-rose-500 dark:text-rose-400 font-semibold leading-normal">
              Warning: This action is permanent. All candidates and records associated with this group will be deleted from this cohort.
            </p>
          </div>
        </div>
      </Modal>
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
