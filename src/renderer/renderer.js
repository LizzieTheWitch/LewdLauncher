const baseStatus = document.getElementById("base-status");
const launchBaseButton = document.getElementById("launch-base");
const openBaseFolderButton = document.getElementById("open-base-folder");
const openModsFolderButton = document.getElementById("open-mods-folder");
const refreshModsButton = document.getElementById("refresh-mods");
const modList = document.getElementById("mod-list");

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

async function refreshState() {
  state = await window.launcher.getState();
  renderBasePanel();
  renderMods();
  renderPaths();
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

refreshState().catch((error) => {
  showToast(error.message || "Launcher failed to initialize", "error");
});
