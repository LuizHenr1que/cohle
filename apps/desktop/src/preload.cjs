const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cohle", {
  platform: process.platform,
  arch: process.arch,
  getUpdate: () => ipcRenderer.invoke("update:get"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdate: (cb) => { const h = (_e, s) => cb(s); ipcRenderer.on("update:state", h); return () => ipcRenderer.removeListener("update:state", h); },
  openExternal: (url) => ipcRenderer.invoke("open:external", url),
  overlayState: (state) => ipcRenderer.send("overlay:state", state),
  openScreenSettings: () => ipcRenderer.invoke("screen:openSettings"),
  listSources: () => ipcRenderer.invoke("sources:list"),
  selectSource: (id, audio) => ipcRenderer.invoke("sources:select", id, audio),
});
