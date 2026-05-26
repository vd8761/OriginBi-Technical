"use client";

// AssessmentPluginHost is the entry point an assessment engine (Aptitude,
// Adaptive Aptitude, Communication, MNC, Role) wraps around its render tree
// to opt into the plugin system. It does three things:
//
//   1. Fetches per-package plugin config from /v1/me/plugin-config?package=X
//      via the existing `fetchCandidatePluginConfig()` helper.
//   2. Mounts <PluginProvider /> so plugin event bus + runtimes are active
//      for everything rendered under this subtree.
//   3. Renders the standard candidate mount points (warning toast,
//      background) so any plugin that contributes a surface there is
//      visible without the engine having to know about it.
//
// The coding engine (CodingAssessment.tsx) has its own bespoke
// PluginProvider wiring with attemptId mirroring and custom mount points;
// it doesn't use this wrapper.
//
// Today the only candidate-side plugin running through this path is
// proctoring.tab-switch. As more proctoring rules (right-click, fullscreen,
// copy-paste, etc.) get converted to plugins, they'll plug in here
// automatically without engine changes.

import { useEffect, useState, type ReactNode } from "react";
import { fetchCandidatePluginConfig } from "@/plugins/discovery";
import { MountPoint } from "@/plugins/MountPoint";
import { PluginProvider } from "@/plugins/PluginProvider";
import type { EnabledPluginConfig } from "@/plugins/types";

interface AssessmentPluginHostProps {
    /** Assessment package slug as understood by the backend resolver:
     *  "aptitude" | "communication" | "mnc" | "role" | "coding". */
    packageSlug: string;
    /** Optional attempt id. Coding passes this; non-coding engines today
     *  don't, because their attempts live in NestJS, not in exam-engine. */
    attemptId?: string;
    tabSwitchLimit?: number;
    children: ReactNode;
}

export default function AssessmentPluginHost({
    packageSlug,
    attemptId,
    tabSwitchLimit,
    children,
}: AssessmentPluginHostProps) {
    const [enabled, setEnabled] = useState<EnabledPluginConfig[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const config = await fetchCandidatePluginConfig({
                attemptId,
                packageSlug,
            });
            if (!cancelled) {
                const mappedConfig = config.map((p) => {
                    if (p.id === "proctoring.tab-switch" && typeof tabSwitchLimit === "number") {
                        return {
                            ...p,
                            config: {
                                ...p.config,
                                threshold: tabSwitchLimit,
                            },
                        };
                    }
                    return p;
                });
                setEnabled(mappedConfig);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [packageSlug, attemptId, tabSwitchLimit]);

    return (
        <PluginProvider enabled={enabled} attemptId={attemptId ?? null}>
            {/* Plugin-contributed candidate UI lands here. Pinned to the top
                of the engine tree so toasts overlay the assessment surface. */}
            <MountPoint id="attempt.warning-toast" />
            <MountPoint id="attempt.background" />
            {children}
        </PluginProvider>
    );
}
