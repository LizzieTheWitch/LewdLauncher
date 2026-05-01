# Degrees of Lewdity Launcher

Electron desktop launcher for Degrees of Lewdity that supports base and modded builds through folder drop-in.

## What This Launcher Does

- Launches the base game from a local folder.
- Discovers mods by scanning subfolders in a mods directory.
- Supports standalone mod builds only (no merge/overlay behavior with the base folder).
- Automatically discovers the single HTML entry file in each folder — no renaming required.

## Folder Structure

When the app starts, it creates this structure in your Documents folder:

- `Documents/DoL Launcher/base-game`
- `Documents/DoL Launcher/mods`

### Base Game Setup

1. Put the base Degrees of Lewdity web build files into `base-game`.
2. The launcher will automatically detect the HTML file inside.

### Mod Setup

1. Put each modded build into its own subfolder inside `mods`.
2. The launcher will automatically detect the HTML file inside.
3. Launch from the Mods list in the launcher UI.

## Run

```bash
npm install
npm start
```

## Build Windows Installer and EXE

```bash
npm install
npm run dist
```

Artifacts are written to `dist`:

- NSIS installer (`.exe` setup wizard)
- Portable executable (`.exe`)

## Notes

- This launcher serves game files through an internal localhost server per launched game window.
- Mod folders are launched independently as complete builds.
- It does not modify game code; it only launches the selected folder.
- You can code-sign later by adding signing environment variables supported by electron-builder.
