import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { FriendsDTO } from "@cohle/shared";
import { api } from "../api";

/** Friends + pending requests, refreshed live when the server says something changed. */
export function useFriends(getSocket: () => Socket | null | undefined) {
  const [data, setData] = useState<FriendsDTO>({ friends: [], incoming: [], outgoing: [] });
  const load = useCallback(() => api.friends().then(setData).catch(() => {}), []);
  useEffect(() => {
    load();
    let off = () => {};
    const t = setInterval(() => {                      // the socket is created right after the workspace mounts
      const s = getSocket(); if (!s) return; clearInterval(t);
      s.on("friends:update", load); s.on("connect", load);
      off = () => { s.off("friends:update", load); s.off("connect", load); };
    }, 200);
    return () => { clearInterval(t); off(); };
  }, []);
  return { data, load, pending: data.incoming.length };
}
