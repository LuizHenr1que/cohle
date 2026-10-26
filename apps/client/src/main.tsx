import { applyTheme, getTheme } from "./lib/theme";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { API } from "./api";

const ua = navigator.userAgent;
if (ua.includes("Electron") && ua.includes("Macintosh")) document.documentElement.classList.add("electron-mac");

const root = document.documentElement;
const syncFocus = () => root.classList.toggle("blurred", !document.hasFocus());
window.addEventListener("focus", syncFocus);
window.addEventListener("blur", syncFocus);
syncFocus();

applyTheme(getTheme());
// Web only: one tiny request so a sleeping free-tier API starts waking up while the person is still typing the e-mail.
if (!window.cohle) fetch(API + "/health", { mode: "cors", cache: "no-store" }).catch(() => {});
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
