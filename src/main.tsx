import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Auth0Provider} from '@auth0/auth0-react';
import {Analytics} from '@vercel/analytics/react';
import App from './App.tsx';
import {PublicArtistPage} from './components/PublicArtistPage.tsx';
import './index.css';

const AUTH0_DOMAIN = "dev-b78ozdt6veybztac.us.auth0.com";
const AUTH0_CLIENT_ID = "Eh332HZDxEfIZ2drnDfqFaHceacaMOfu";

// Apply the saved/system theme immediately, even on public pages that
// never touch App.tsx's theme effect (avoids a flash of the wrong theme).
(function applyInitialTheme() {
  const saved = localStorage.getItem("crazyjam_theme_mode") as "light" | "dark" | "system" | null;
  const mode = saved || "dark";
  const root = document.documentElement;
  if (mode === "system") {
    root.classList.add(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  } else {
    root.classList.add(mode);
  }
})();

// Lightweight path-based routing: /a/<slug> is a fully public page and
// must never be gated behind login. Everything else renders the main app.
const pathMatch = window.location.pathname.match(/^\/a\/([a-z0-9-]+)\/?$/);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathMatch ? (
      <>
        <PublicArtistPage slug={pathMatch[1]} />
        <Analytics />
      </>
    ) : (
      <Auth0Provider
        domain={AUTH0_DOMAIN}
        clientId={AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
        cacheLocation="localstorage"
      >
        <App />
        <Analytics />
      </Auth0Provider>
    )}
  </StrictMode>,
);
