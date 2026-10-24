/// <reference types="vite/client" />

interface ScreenSource { id: string; name: string; type: "screen" | "window"; thumbnail: string; appIcon: string | null; }
interface Window {
  cohle?: {
    platform: string;
    listSources: () => Promise<{ screenAccess: string; sources: ScreenSource[] }>;
    selectSource: (id: string, audio: boolean) => Promise<void>;
  };
}
