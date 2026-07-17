<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# CrazyJam - AI Music Studio (Frontend)

Lightweight static React/Vite frontend. All AI composition, auth, and
saved-track logic lives in the private backend at
`constellation/crazyjam/backend` (AWS Bedrock + MongoDB) - this repo just
talks to it over HTTP.

`_deprecated_moved_to_backend/` holds what used to live here (the old
Express server that called Gemini directly, and Python composition
helpers) - it's excluded from git and safe to delete once you've confirmed
the new setup works.

## Run Locally

**Prerequisites:** Node.js, and the backend running (see
`constellation/crazyjam/backend/README` equivalent - `uvicorn main:app
--reload --port 8000`).

1. Install dependencies:
   `npm install`
2. Confirm `.env.local` points `VITE_API_BASE_URL` at your backend
   (defaults to `http://localhost:8000`).
3. Run the app:
   `npm run dev`

## Deploying

This is now a pure static site (`npm run build` outputs to `dist/`) - it
can go on any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront,
etc.) as long as `VITE_API_BASE_URL` is set at build time to point at your
deployed backend.
