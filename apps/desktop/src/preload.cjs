const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cohle", {
  platform: process.platform,
  listSources: () => ipcRenderer.invoke("sources:list"),
  selectSource: (id, audio) => ipcRenderer.invoke("sources:select", id, audio),
});
