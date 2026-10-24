import { assetUrl } from "../api";

export function ServerIcon({ server, size = 48, className = "" }: { server: { name: string; iconUrl?: string | null }; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (server.iconUrl) return <img src={assetUrl(server.iconUrl)!} decoding="async" alt={server.name} style={style} className={`rounded-2xl object-cover shrink-0 ${className}`} />;
  return (
    <div style={style} className={`rounded-2xl grad grid place-items-center text-white font-bold shrink-0 ${className}`}>
      {server.name.trim()[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
