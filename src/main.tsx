import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ================================
// 🔹 Update all fetch calls to Railway backend
// ================================

const RAILWAY_BACKEND = "https://fulltg-production.up.railway.app";

// Utility function to patch fetch URLs
function patchFetch() {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    }

    if (url.startsWith("/api/")) {
      const newUrl = RAILWAY_BACKEND + url;
      if (input instanceof Request) {
        return originalFetch(new Request(newUrl, input), init);
      }
      return originalFetch(newUrl, init);
    }
    
    return originalFetch(input, init);
  };
}

// Immediately patch fetch
patchFetch();

console.log("✅ All fetch calls are now pointing to Railway backend:", RAILWAY_BACKEND);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
