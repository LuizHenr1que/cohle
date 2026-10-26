import { useEffect, useState } from "react";
import { handleProblem, HANDLE_HELP, type HandleProblem } from "@cohle/shared";
import { api } from "../api";

export type HandleCheck = { state: "idle" | "checking" | "ok" | "bad"; msg: string };

/** Live check of a @username while it is typed: the rules run locally, only "is it taken?" asks the server (after a short pause).
 *  `unchanged` = the person's current handle, which needs no check. */
export function useHandleCheck(handle: string, enabled = true, unchanged?: string): HandleCheck {
  const [r, setR] = useState<HandleCheck>({ state: "idle", msg: "" });
  useEffect(() => {
    if (!enabled || !handle || handle === unchanged) { setR({ state: "idle", msg: "" }); return; }
    const bad = handleProblem(handle);
    if (bad) { setR({ state: "bad", msg: HANDLE_HELP[bad] }); return; }
    setR({ state: "checking", msg: "Verificando..." });
    let dead = false;
    const t = setTimeout(() => {
      api.usernameAvailable(handle)
        .then((c) => { if (!dead) setR(c.available ? { state: "ok", msg: `@${handle} está disponível.` } : { state: "bad", msg: c.reason === "taken" ? "Esse @usuário já está em uso." : HANDLE_HELP[c.reason as HandleProblem] }); })
        .catch(() => { if (!dead) setR({ state: "idle", msg: "" }); });
    }, 400);
    return () => { dead = true; clearTimeout(t); };
  }, [handle, enabled, unchanged]);
  return r;
}
