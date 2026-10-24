const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cohle", {
  platform: process.platform,
  overlayState: (state) => ipcRenderer.send("overlay:state", state),
  openScreenSettings: () => ipcRenderer.invoke("screen:openSettings"),
  listSources: () => ipcRenderer.invoke("sources:list"),
  selectSource: (id, audio) => ipcRenderer.invoke("sources:select", id, audio),
});
