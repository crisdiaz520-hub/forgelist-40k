let pendingInstallPrompt = null;

const installButton = document.querySelector("#installApp");

function setInstallButtonVisible(visible) {
  if (!installButton) return;
  installButton.classList.toggle("hidden", !visible);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  pendingInstallPrompt = event;
  setInstallButtonVisible(true);
});

window.addEventListener("appinstalled", () => {
  pendingInstallPrompt = null;
  setInstallButtonVisible(false);
});

installButton?.addEventListener("click", async () => {
  if (!pendingInstallPrompt) return;
  pendingInstallPrompt.prompt();
  await pendingInstallPrompt.userChoice.catch(() => null);
  pendingInstallPrompt = null;
  setInstallButtonVisible(false);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setInstallButtonVisible(false);
    });
  });
}
