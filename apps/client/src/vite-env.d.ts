/// <reference types="vite/client" />

interface ScreenSource { id: string; name: string; type: "screen" | "window"; thumbnail: string; appIcon: string | null; }
interface UpdateState { status: "unsupported" | "idle" | "downloading" | "ready" | "error"; version: string | null; percent: number; }
interface Window {
  cohle?: {
    platform: string;
    getUpdate: () => Promise<UpdateState>;
    installUpdate: () => Promise<void>;
    onUpdate: (cb: (s: UpdateState) => void) => () => void;
    arch: string;
    openExternal: (url: string) => Promise<void>;
    overlayState: (s: { inCall: boolean; channel: string; speakers: { id: string; name: string; avatar: string | null }[] }) => void;
    openScreenSettings: () => Promise<void>;
    listSources: () => Promise<{ screenAccess: string; sources: ScreenSource[] }>;
    selectSource: (id: string, audio: boolean) => Promise<void>;
  };
}
