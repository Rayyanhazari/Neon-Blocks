# Neon Blocks

An original neon-dark, mobile-first block puzzle inspired by the block-puzzle genre. It is built with plain HTML, CSS, and JavaScript, so it can run on GitHub Pages without a build step.

## Included
- 10×10 puzzle grid
- Three shapes per turn; tap a shape then tap a grid position, or drag a shape onto the grid
- Completed rows and columns clear
- Multi-line bonus points and combo streaks
- Saved best score using local storage
- Optional synthesized sound effects
- Installable PWA manifest and offline service worker
- Responsive layout for phone screens

## Publish using your existing GitHub Pages workflow
1. Download and extract `neon-blocks-github-pages.zip`.
2. Open your existing game repository, or create a new public repository named `neon-blocks`.
3. Upload the extracted files and folders to the repository root. Keep the `icons` folder.
4. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for GitHub Pages to finish deploying. Your URL will look like `https://YOUR-USERNAME.github.io/neon-blocks/` (use your actual repository name).
6. Open that URL in Chrome on your phone. Use the browser menu → **Add to Home screen** or **Install app**.

## Updating later
Edit `style.css` for visual changes and `app.js` for gameplay. Since the service worker caches the app, after publishing a new version change `CACHE_NAME` in `service-worker.js` (for example, `neon-blocks-v2`) so devices refresh the cached files.

## Notes
- No account, server, API key, or build tooling is needed.
- Best score is stored on the device/browser, not synced across devices.
- Google Fonts are an optional visual enhancement; system fonts are used if they are unavailable.
- This is an original implementation; it does not use Block Blast or Block Crush branding/assets.
