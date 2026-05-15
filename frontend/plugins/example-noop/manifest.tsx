import type { FrontendPlugin } from "../types";

/**
 * Lighthouse plugin used by Phase C verification. It mounts a single
 * `data-testid` div on `topbar.actions` so a smoke test can confirm the
 * mount-point pipeline (manifest → registry → provider → MountPoint) works
 * end-to-end. Delete or disable in production.
 */
const exampleNoop: FrontendPlugin = {
  id: "example.noop",
  priority: 100,
  surfaces: [
    {
      mount: "topbar.actions",
      label: "noop-mount",
      Component: () => (
        <div
          data-testid="noop-mount"
          style={{
            padding: "4px 8px",
            border: "1px dashed var(--admin-border-strong)",
            borderRadius: 999,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--admin-fg-3)",
          }}
          title="frontend/plugins/example-noop — Phase C smoke test"
        >
          hello
        </div>
      ),
    },
  ],
};

export default exampleNoop;
