const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcher", {
  getState: () => ipcRenderer.invoke("launcher:get-state"),
  openFolder: (folderType) => ipcRenderer.invoke("launcher:open-folder", folderType),
  launchBase: () => ipcRenderer.invoke("launcher:launch", { type: "base" }),
  launchMod: (name) => ipcRenderer.invoke("launcher:launch", { type: "mod", name })
});
