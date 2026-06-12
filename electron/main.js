const { app, BrowserWindow, protocol, net } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const webRoot = path.join(__dirname, "..", "dist", "web");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "forgelist",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function resolveAppPath(url) {
  const parsed = new URL(url);
  const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
  const filePath = path.normalize(path.join(webRoot, pathname));
  if (!filePath.startsWith(webRoot)) return path.join(webRoot, "index.html");
  return filePath;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#eef2ef",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await win.loadURL("forgelist://app/index.html");
}

app.whenReady().then(() => {
  protocol.handle("forgelist", (request) => net.fetch(pathToFileURL(resolveAppPath(request.url)).toString()));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
