import type { FrontendPlugin } from "./types";
import exampleNoop from "./example-noop/manifest";
import proctoringAiMonitoring from "./proctoring-ai-monitoring/manifest";
import proctoringCameraVision from "./proctoring-camera-vision/manifest";
import proctoringIdentityVerification from "./proctoring-identity-verification/manifest";
import proctoringMicrophoneAudio from "./proctoring-microphone-audio/manifest";
import proctoringNetworkLocation from "./proctoring-network-location/manifest";
import proctoringScreenBrowser from "./proctoring-screen-browser/manifest";
import proctoringTabSwitch from "./proctoring-tab-switch/manifest";
import adaptiveQuestions from "./adaptive-questions/manifest";

/**
 * Static plugin registry. Every plugin shipped with the binary lists its
 * manifest here. The registry is build-time so the bundler can tree-shake;
 * runtime resolution (enable/disable per attempt) happens inside
 * `PluginProvider` based on the response from `/v1/me/plugin-config` or
 * `/v1/admin/plugins?context=admin`.
 *
 * Adding a plugin: drop a folder under `frontend/plugins/<name>/`, export a
 * `FrontendPlugin` from its manifest entry, then import it here.
 */
export const plugins: FrontendPlugin[] = [
  proctoringCameraVision,
  proctoringMicrophoneAudio,
  proctoringScreenBrowser,
  proctoringTabSwitch,
  proctoringAiMonitoring,
  proctoringIdentityVerification,
  proctoringNetworkLocation,
  adaptiveQuestions,
  exampleNoop,
];

export type { FrontendPlugin };
