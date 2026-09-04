const baseStatus = document.getElementById("base-status");
const launchBaseButton = document.getElementById("launch-base");
const openBaseFolderButton = document.getElementById("open-base-folder");
const openModsFolderButton = document.getElementById("open-mods-folder");
const refreshModsButton = document.getElementById("refresh-mods");
const modList = document.getElementById("mod-list");

const savesContainer = document.getElementById("saves-container");
const openSavesHelpButton = document.getElementById("open-saves-help");

const pathRoot = document.getElementById("path-root");
const pathBase = document.getElementById("path-base");
const pathMods = document.getElementById("path-mods");

const toast = document.getElementById("toast");

let state = null;

function showToast(message, kind = "info") {
  toast.textContent = message;
  toast.className = `toast ${kind}`;

  window.setTimeout(() => {
    toast.className = "toast hidden";
  }, 2600);
}

function setBusy(button, busyText, isBusy) {
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function renderBasePanel() {
  if (!state) {
    return;
  }

  if (state.baseReady) {
    baseStatus.textContent = "Ready to launch.";
    baseStatus.className = "status ok";
    launchBaseButton.disabled = false;
  } else {
    baseStatus.textContent = "Extract the base game into the base-game folder.";
    baseStatus.className = "status warning";
    launchBaseButton.disabled = true;
  }
}

function renderMods() {
  modList.innerHTML = "";

  if (!state || state.mods.length === 0) {
    const empty = document.createElement("li");
    empty.className = "mod-empty";
    empty.textContent = "No mods found yet.";
    modList.appendChild(empty);
    return;
  }

  for (const mod of state.mods) {
    const item = document.createElement("li");
    item.className = "mod-item";

    const name = document.createElement("p");
    name.className = "mod-name";
    name.textContent = mod.name;

    const launchButton = document.createElement("button");
    launchButton.textContent = "Launch";
    launchButton.className = "secondary";
    launchButton.addEventListener("click", async () => {
      setBusy(launchButton, "Launching...", true);
      try {
        await window.launcher.launchMod(mod.name);
      } catch (error) {
        showToast(error.message || "Could not launch mod", "error");
      } finally {
        setBusy(launchButton, "", false);
      }
    });

    item.append(name, launchButton);
    modList.appendChild(item);
  }
}

function renderPaths() {
  if (!state) {
    return;
  }

  pathRoot.textContent = state.paths.root;
  pathBase.textContent = state.paths.base;
  pathMods.textContent = state.paths.mods;
}

async function renderSaves() {
  savesContainer.innerHTML = "";

  if (!state) {
    return;
  }

  const versions = [
    { id: "base-game", label: "Base Game" },
    ...state.mods.map((mod) => ({ id: mod.name, label: mod.name }))
  ];

  for (const version of versions) {
    try {
      const saves = await window.launcher.listSaves(version.id);

      const versionCard = document.createElement("div");
      versionCard.className = "save-version-card";

      const header = document.createElement("div");
      header.className = "save-card-header";

      const title = document.createElement("h3");
      title.className = "save-version-title";
      title.textContent = version.label;

      const actions = document.createElement("div");
      actions.className = "save-card-actions";

      const importBtn = document.createElement("button");
      importBtn.className = "ghost small";
      importBtn.textContent = "Import";
      importBtn.addEventListener("click", async () => {
        await importSaveHandler(version.id);
      });

      const openBtn = document.createElement("button");
      openBtn.className = "ghost small";
      openBtn.textContent = "Open Folder";
      openBtn.addEventListener("click", async () => {
        await window.launcher.openSaveFolder(version.id);
      });

      actions.append(importBtn, openBtn);
      header.append(title, actions);

      if (saves.length === 0) {
        const empty = document.createElement("p");
        empty.className = "save-empty";
        empty.textContent = "No saves yet. Import a .save file to get started.";
        versionCard.append(header, empty);
      } else {
        const list = document.createElement("ul");
        list.className = "save-list";

        for (const save of saves) {
          const item = await createSaveItem(version.id, save);
          list.appendChild(item);
        }

        versionCard.append(header, list);
      }

      savesContainer.appendChild(versionCard);
    } catch (error) {
      console.error(`Failed to load saves for ${version.id}:`, error);
    }
  }
}

async function createSaveItem(versionId, fileName) {
  const item = document.createElement("li");
  item.className = "save-item";

  const nameSpan = document.createElement("span");
  nameSpan.className = "save-name";
  nameSpan.textContent = fileName;
  nameSpan.title = fileName;

  const actions = document.createElement("div");
  actions.className = "save-item-actions";

  const exportBtn = document.createElement("button");
  exportBtn.className = "ghost tiny";
  exportBtn.textContent = "Export";
  exportBtn.addEventListener("click", async () => {
    await exportSaveHandler(versionId, fileName);
  });

  const renameBtn = document.createElement("button");
  renameBtn.className = "ghost tiny";
  renameBtn.textContent = "Rename";
  renameBtn.addEventListener("click", async () => {
    await renameSaveHandler(versionId, fileName);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "ghost tiny danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", async () => {
    await deleteSaveHandler(versionId, fileName);
  });

  actions.append(exportBtn, renameBtn, deleteBtn);
  item.append(nameSpan, actions);

  return item;
}

async function importSaveHandler(versionId) {
  try {
    const filePath = await window.launcher.pickSaveFile(versionId);
    if (!filePath) {
      return;
    }

    await window.launcher.importSave(versionId, filePath);
    showToast(`Save imported successfully`, "ok");
    await renderSaves();
  } catch (error) {
    showToast(error.message || "Failed to import save", "error");
  }
}

async function exportSaveHandler(versionId, fileName) {
  try {
    await window.launcher.exportSave(versionId, fileName);
    showToast(`Save folder opened - copy "${fileName}" to backup it`, "ok");
  } catch (error) {
    showToast(error.message || "Failed to export save", "error");
  }
}

async function renameSaveHandler(versionId, oldName) {
  const newName = prompt("Enter new save name:", oldName);

  if (!newName || newName === oldName) {
    return;
  }

  if (!newName.toLowerCase().endsWith(".save")) {
    const confirmed = confirm(
      "Filename does not end with .save. Continue anyway?"
    );
    if (!confirmed) {
      return;
    }
  }

  try {
    await window.launcher.renameSave(versionId, oldName, newName);
    showToast(`Save renamed to "${newName}"`, "ok");
    await renderSaves();
  } catch (error) {
    showToast(error.message || "Failed to rename save", "error");
  }
}

async function deleteSaveHandler(versionId, fileName) {
  const confirmed = confirm(`Delete save "${fileName}"?`);
  if (!confirmed) {
    return;
  }

  try {
    await window.launcher.deleteSave(versionId, fileName);
    showToast(`Save deleted`, "ok");
    await renderSaves();
  } catch (error) {
    showToast(error.message || "Failed to delete save", "error");
  }
}

async function refreshState() {
  state = await window.launcher.getState();
  renderBasePanel();
  renderMods();
  renderPaths();
  await renderSaves();
}

launchBaseButton.addEventListener("click", async () => {
  setBusy(launchBaseButton, "Launching...", true);

  try {
    await window.launcher.launchBase();
  } catch (error) {
    showToast(error.message || "Could not launch base game", "error");
  } finally {
    setBusy(launchBaseButton, "", false);
  }
});

openBaseFolderButton.addEventListener("click", async () => {
  await window.launcher.openFolder("base");
});

openModsFolderButton.addEventListener("click", async () => {
  await window.launcher.openFolder("mods");
});

refreshModsButton.addEventListener("click", async () => {
  await refreshState();
  showToast("Refreshed", "info");
});

openSavesHelpButton.addEventListener("click", () => {
  const help = [
    "How Saves Work:",
    "1. Export a .save file from the game",
    "2. Click 'Import' to add it to the launcher",
    "3. Save files are stored separately for each game version",
    "4. You can rename and organize saves here"
  ].join("\n");
  alert(help);
});

refreshState().catch((error) => {
  showToast(error.message || "Launcher failed to initialize", "error");
});
