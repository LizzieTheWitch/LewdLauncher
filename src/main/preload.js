const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcher", {
  getState: () => ipcRenderer.invoke("launcher:get-state"),
  openFolder: (folderType) => ipcRenderer.invoke("launcher:open-folder", folderType),
  launchBase: () => ipcRenderer.invoke("launcher:launch", { type: "base" }),
  launchMod: (name) => ipcRenderer.invoke("launcher:launch", { type: "mod", name }),
  listSaves: (versionId) => ipcRenderer.invoke("launcher:list-saves", versionId),
  renameSave: (versionId, oldName, newName) => ipcRenderer.invoke("launcher:rename-save", versionId, oldName, newName),
  deleteSave: (versionId, fileName) => ipcRenderer.invoke("launcher:delete-save", versionId, fileName),
  importSave: (versionId, sourceFilePath) => ipcRenderer.invoke("launcher:import-save", versionId, sourceFilePath),
  exportSave: (versionId, fileName) => ipcRenderer.invoke("launcher:export-save-file", versionId, fileName),
  openSaveFolder: (versionId) => ipcRenderer.invoke("launcher:open-save-folder", versionId),
  pickSaveFile: (versionId) => ipcRenderer.invoke("launcher:pick-save-file", versionId)
});
