import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";

const ua = navigator.userAgent;
if (ua.includes("Electron") && ua.includes("Macintosh")) document.documentElement.classList.add("electron-mac");

const root = document.documentElement;
const syncFocus = () => root.classList.toggle("blurred", !document.hasFocus());
window.addEventListener("focus", syncFocus);
window.addEventListener("blur", syncFocus);
syncFocus();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
