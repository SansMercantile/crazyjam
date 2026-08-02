// Electron main process for the CrazyJam desktop app.
// In dev, loads the Vite dev server; in production, loads the built dist/index.html.
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#0a0a0a",
    icon: path.join(__dirname, "..", "src", "assets", "images", "CrazyJam-Icon-logo-1.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Real mic/camera permission grants for the Recorder/DJ/pitch-correction
  // features, which rely on getUserMedia.
  win.webContents.session.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ["media", "microphone", "camera"];
    callback(allowed.includes(permission));
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Open external links (e.g. reference-sync/publishing links) in the OS
  // browser instead of navigating the app window away from itself.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
