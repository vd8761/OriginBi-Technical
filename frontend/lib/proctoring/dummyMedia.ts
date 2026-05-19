"use client";

// Dummy camera + microphone permission for proctored exams.
//
// Calls getUserMedia once per session so the browser shows its normal
// permission prompt and the candidate sees a "Camera Active" indicator.
// The MediaStream is held client-side only — never recorded, never uploaded,
// never wired into a MediaRecorder. The goal is purely UX: make the
// candidate aware they're being "watched" without standing up any of the
// upload pipeline.
//
// The stream is cached on `window.__obi_dummy_stream` so re-mounting the
// host (e.g. React fast-refresh, in-component remounts) doesn't trigger a
// second permission prompt.

interface DummyMediaState {
    stream: MediaStream | null;
    error: string | null;
    requested: boolean;
}

declare global {
    interface Window {
        __obi_dummy_stream?: MediaStream | null;
        __obi_dummy_state?: DummyMediaState;
    }
}

export async function requestDummyMedia(): Promise<DummyMediaState> {
    if (typeof window === "undefined") {
        return { stream: null, error: "no window", requested: false };
    }
    if (window.__obi_dummy_state?.requested) {
        return window.__obi_dummy_state;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
        const state: DummyMediaState = {
            stream: null,
            error: "Camera and microphone APIs are not available in this browser.",
            requested: true,
        };
        window.__obi_dummy_state = state;
        return state;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        const state: DummyMediaState = { stream, error: null, requested: true };
        window.__obi_dummy_stream = stream;
        window.__obi_dummy_state = state;
        return state;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const state: DummyMediaState = { stream: null, error: message, requested: true };
        window.__obi_dummy_state = state;
        return state;
    }
}

export function releaseDummyMedia() {
    if (typeof window === "undefined") return;
    const stream = window.__obi_dummy_stream;
    if (stream) {
        stream.getTracks().forEach((t) => t.stop());
    }
    window.__obi_dummy_stream = null;
    window.__obi_dummy_state = undefined;
}
