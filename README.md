<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/939204e5-54e4-4658-b486-7cb7a4d8ecb3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

When you open this folder in VS Code, the `Start SpacePulse on localhost` task starts the app and opens `NASA_Project` on localhost. Vite uses port `3000`, or the next available port if `3000` is occupied. If prompted, allow automatic tasks. Run `npm install` once before the first launch.
