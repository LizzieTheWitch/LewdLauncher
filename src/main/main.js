const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");

const MIME_BY_EXT = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf"
};

let launcherWindow;
const activeServers = new Set();

function getLauncherPaths() {
  const root = path.join(app.getPath("documents"), "DoL Launcher");

  return {
    root,
    base: path.join(root, "base-game"),
    mods: path.join(root, "mods")
  };
}

async function ensureLauncherDirectories() {
  const paths = getLauncherPaths();

  await fsp.mkdir(paths.base, { recursive: true });
  await fsp.mkdir(paths.mods, { recursive: true });

  const markerPath = path.join(paths.base, "README.txt");
  if (!fs.existsSync(markerPath)) {
    await fsp.writeFile(
      markerPath,
      [
        "Extract the base Degrees of Lewdity web build into this folder.",
        "The launcher will automatically find the HTML file inside."
      ].join("\n"),
      "utf8"
    );
  }

  return paths;
}

function findHtmlEntry(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath);
    return entries.find((f) => path.extname(f).toLowerCase() === ".html") || null;
  } catch {
    return null;
  }
}

function hasHtmlEntry(dirPath) {
  return findHtmlEntry(dirPath) !== null;
}

async function listModFolders(modsDir) {
  const entries = await fsp.readdir(modsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      dirPath: path.join(modsDir, entry.name)
    }))
    .filter((entry) => hasHtmlEntry(entry.dirPath))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function startStaticServer(rootDir, entryFile) {
  const server = http.createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent(req.url || "/").split("?")[0];
      const safeRelative = path.normalize(requestPath).replace(/^([.][.][/\\])+/, "");

      let filePath = path.join(rootDir, safeRelative);

      if (!filePath.startsWith(rootDir)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      if (requestPath === "/") {
        filePath = path.join(rootDir, entryFile);
      }

      const stat = await fsp.stat(filePath).catch(() => null);

      if (!stat) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      if (stat.isDirectory()) {
        filePath = path.join(filePath, entryFile);
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_BY_EXT[ext] || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);

      fs.createReadStream(filePath)
        .on("error", () => {
          res.statusCode = 500;
          res.end("Read error");
        })
        .pipe(res);
    } catch {
      res.statusCode = 500;
      res.end("Server error");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not allocate server port"));
        return;
      }

      const close = () =>
        new Promise((resolveClose) => {
          server.close(() => resolveClose());
        });

      resolve({
        url: `http://127.0.0.1:${address.port}/`,
        close
      });
    });
  });
}

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    title: "Degrees of Lewdity Launcher",
    backgroundColor: "#111315",
    icon: path.join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  launcherWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

function createGameWindow(targetName, gameUrl, onClose) {
  const gameWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: `Degrees of Lewdity - ${targetName}`,
    backgroundColor: "#0f0f0f",
    icon: path.join(__dirname, "../../build/icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  gameWindow.loadURL(gameUrl);
  gameWindow.on("closed", onClose);
}

ipcMain.handle("launcher:get-state", async () => {
  const paths = await ensureLauncherDirectories();
  const mods = await listModFolders(paths.mods);

  return {
    paths,
    baseReady: hasHtmlEntry(paths.base),
    mods: mods.map((mod) => ({ name: mod.name }))
  };
});

ipcMain.handle("launcher:open-folder", async (_event, folderType) => {
  const paths = await ensureLauncherDirectories();
  const folderPath = paths[folderType];

  if (!folderPath) {
    throw new Error("Unknown folder type");
  }

  await shell.openPath(folderPath);
});

ipcMain.handle("launcher:launch", async (_event, target) => {
  const paths = await ensureLauncherDirectories();

  let launchName = "Base Game";
  let launchPath = paths.base;

  if (target && target.type === "mod") {
    launchName = target.name;
    launchPath = path.join(paths.mods, target.name || "");
  }

  const entryFile = findHtmlEntry(launchPath);
  if (!entryFile) {
    throw new Error("Target folder has no HTML file");
  }

  const server = await startStaticServer(launchPath, entryFile);
  activeServers.add(server);

  createGameWindow(launchName, server.url, async () => {
    activeServers.delete(server);
    await server.close();
  });

  return { launched: true };
});

app.whenReady().then(async () => {
  await ensureLauncherDirectories();
  createLauncherWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLauncherWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  for (const server of activeServers) {
    await server.close();
  }

  activeServers.clear();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
