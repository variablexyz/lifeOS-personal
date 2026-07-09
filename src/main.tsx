import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Progressive Web App: register the service worker so LifeOS installs and
   works fully offline. Guarded to http(s) production builds — a file://
   build opened directly skips this and still runs, since all data lives
   in IndexedDB. */
if (
  "serviceWorker" in navigator &&
  location.protocol.startsWith("http") &&
  import.meta.env.PROD
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .catch(() => {
        /* offline support unavailable — the app still runs online */
      });
  });
}
