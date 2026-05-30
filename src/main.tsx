import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle and ignore benign development/websocket HMR disconnects gracefully
if (typeof window !== "undefined") {
  const isBenignWsError = (msg: string) => {
    const normalized = msg.toLowerCase();
    return (
      normalized.includes("websocket") ||
      normalized.includes("web socket") ||
      normalized.includes("closed without opened") ||
      normalized.includes("vite") ||
      normalized.includes("hmr")
    );
  };

  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event.reason;
      const errMsg = reason
        ? typeof reason === "string"
          ? reason
          : reason.message || reason.description || String(reason)
        : "";

      if (isBenignWsError(errMsg)) {
        console.warn("Silencing benign Web Socket unhandled rejection:", errMsg);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    } catch (e) {
      // Avoid throwing errors inside the error handler
    }
  }, true);

  window.addEventListener("error", (event) => {
    try {
      const errMsg = event.message || (event.error && event.error.message) || "";
      if (isBenignWsError(errMsg)) {
        console.warn("Silencing benign Web Socket error:", errMsg);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    } catch (e) {
      // Avoid throwing errors inside the error handler
    }
  }, true);
}

// Register PWA Service Worker for mobile standalone runs
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("KOMAL SW registered successfully: ", registration.scope);
      })
      .catch((err) => {
        console.log("KOMAL SW registration failed: ", err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
