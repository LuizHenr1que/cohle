// The person's effect preferences. Applied at once from localStorage, mirrored on the server so other devices follow.
import { useSyncExternalStore } from "react";
import { DEFAULT_PREFS, type PrefsDTO } from "@cohle/shared";
import { api } from "../api";

const KEY = "cohle:prefs";
let prefs: PrefsDTO = (() => { try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return { ...DEFAULT_PREFS }; } })();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ } };

export const getPrefs = () => prefs;
export function setPrefs(p: Partial<PrefsDTO>) { prefs = { ...prefs, ...p }; save(); emit(); api.putPrefs(p).catch(() => {}); }
/** The server's copy won (another device changed it). */
export function mergeRemote(p: PrefsDTO) { prefs = { ...prefs, ...p }; save(); emit(); }
export const usePrefs = () => useSyncExternalStore(subscribe, getPrefs);

export const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
/** A weak machine: few cores or little memory. It gets "Modo leve" by itself unless the person chose otherwise. */
export const weakDevice = () => (navigator.hardwareConcurrency ?? 8) <= 4 || ((navigator as any).deviceMemory ?? 8) <= 4;
export const isMobile = () => { try { return matchMedia("(max-width: 640px)").matches; } catch { return false; } };

// "Effects are on" = not switched off, not Modo leve (class on <html>), no reduced-motion request, window visible. One shared store, so every effect obeys the same switch.
const fx = { on: true, subs: new Set<() => void>() };
const compute = () => !prefs.effectsOff && !document.documentElement.classList.contains("lite") && !reducedMotion();
function refresh() { const v = compute(); if (v !== fx.on) { fx.on = v; fx.subs.forEach((f) => f()); } }
let started = false;
function start() {
  if (started) return; started = true; fx.on = compute();
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  try { matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", refresh); } catch { /* old browser */ }
  subs.add(refresh);
}
export const useEffectsOn = () => { start(); return useSyncExternalStore((f) => { fx.subs.add(f); return () => { fx.subs.delete(f); }; }, () => fx.on); };
