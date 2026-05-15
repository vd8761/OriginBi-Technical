/** @vitest-environment jsdom */
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Stub the network helper before importing the provider — the provider imports
// it transitively. Without this stub Vitest tries to evaluate the real api.ts
// which expects a browser fetch + Cognito token storage.
vi.mock("@/lib/api", () => ({
  sendAttemptEvents: vi.fn(async () => ({ accepted: 0 })),
}));

// Replace the registry with a controlled fixture so the test isn't coupled to
// whichever first-party plugins happen to be shipped.
vi.mock("./registry", () => {
  const exampleSurfaceFactory = (text: string) => {
    const Surface = ({ ctx }: { ctx: { pluginId: string } }) => (
      <span data-testid={`surface-${ctx.pluginId}`}>{text}</span>
    );
    Surface.displayName = `FixtureSurface(${text})`;
    return Surface;
  };

  const runtimeSpy = vi.fn();

  return {
    plugins: [
      {
        id: "fixture.alpha",
        surfaces: [
          {
            mount: "topbar.actions",
            label: "Alpha",
            Component: exampleSurfaceFactory("alpha"),
          },
        ],
        runtime: (ctx: { pluginId: string }) => {
          runtimeSpy(ctx.pluginId);
          return () => undefined;
        },
      },
      {
        id: "fixture.beta",
        surfaces: [
          {
            mount: "topbar.actions",
            label: "Beta",
            Component: exampleSurfaceFactory("beta"),
          },
        ],
      },
    ],
    __runtimeSpy: runtimeSpy,
  };
});

import { MountPoint } from "./MountPoint";
import { PluginProvider } from "./PluginProvider";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PluginProvider + MountPoint", () => {
  it("renders every surface contributed to a mount when no enabled filter is supplied", () => {
    render(
      <PluginProvider enabled={null}>
        <MountPoint id="topbar.actions" />
      </PluginProvider>,
    );

    expect(screen.getByTestId("surface-fixture.alpha")).toHaveTextContent("alpha");
    expect(screen.getByTestId("surface-fixture.beta")).toHaveTextContent("beta");
  });

  it("filters surfaces based on the enabled list", () => {
    render(
      <PluginProvider enabled={[{ id: "fixture.alpha", enabled: true, config: {} }]}>
        <MountPoint id="topbar.actions" />
      </PluginProvider>,
    );

    expect(screen.getByTestId("surface-fixture.alpha")).toBeInTheDocument();
    expect(screen.queryByTestId("surface-fixture.beta")).toBeNull();
  });

  it("renders the fallback when the mount has zero contributors", () => {
    render(
      <PluginProvider enabled={[]}>
        <MountPoint id="topbar.actions" fallback={<em>empty</em>} />
      </PluginProvider>,
    );

    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("invokes plugin runtime hooks once per enabled plugin", async () => {
    const registryModule = (await import("./registry")) as unknown as {
      __runtimeSpy: ReturnType<typeof vi.fn>;
    };
    await act(async () => {
      render(
        <PluginProvider enabled={null}>
          <MountPoint id="topbar.actions" />
        </PluginProvider>,
      );
    });
    expect(registryModule.__runtimeSpy).toHaveBeenCalledWith("fixture.alpha");
  });
});
