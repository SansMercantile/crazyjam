// Minimal preload: no privileged Node APIs are exposed to the renderer.
// The app is a pure web app talking to the backend over HTTPS, so it doesn't
// need an IPC bridge - keeping this empty (with contextIsolation+sandbox on
// in main.js) is the safer default rather than exposing APIs that aren't used.
