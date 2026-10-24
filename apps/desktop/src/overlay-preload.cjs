const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("overlayApi", {
  onState: (cb) => ipcRenderer.on("overlay:state", (_e, s) => cb(s)),
  size: (h) => ipcRenderer.send("overlay:size", h),
  close: () => ipcRenderer.send("overlay:close"),
  interactive: (on) => ipcRenderer.send("overlay:interactive", !!on),
  focusApp: () => ipcRenderer.send("overlay:focus-app"),
});
