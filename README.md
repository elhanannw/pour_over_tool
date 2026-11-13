# Pour Lab

A mobile-first pour-over coffee app for designing recipes and following precise, cumulative scale targets.

## Features

- Coffee-to-water ratio controls with optional ratio locking.
- Two to five pours with fractional units and automatic last-pour balancing.
- Guided Brew Mode with manual pour progression and a pauseable timer.
- Saved recipes, brew history, tasting notes and JSON backups.
- Optional roast dates and profiles with colour-coded resting and brew-window guidance.
- Light and dark themes, installable PWA support and offline brewing.

The default recipe uses 15g coffee and 255g water. Its three pours add 75g, 120g and 60g, giving scale targets of **75g, 195g and 255g**.

Roast guidance uses your local date. Light, medium light, medium, medium dark and dark roasts rest for 14, 12, 10, 7 and 5 days respectively. The status is grey while resting, green from the rest day, yellow at two calendar months after roasting and red at three calendar months. Month-end anniversaries use the last day of a shorter month. These are starting points for your own taste preferences. Roast details are optional and stay with recipes, brew history and backups.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the address printed by Vite, usually `http://127.0.0.1:5173`.

## Development

```sh
npm test            # Unit and component tests
npm run build       # Type-check and build
npm run preview     # Serve the production build locally
npm run test:e2e    # Desktop and mobile browser checks
```

Browser checks require Google Chrome. If needed, install it with `npx playwright install chrome`.

## Data and offline use

Recipes, history and settings stay in this browser's local storage. Export a JSON backup from Saved recipes to move your collection to another device or preserve it before clearing browser data.

Offline support is available after the production app has loaded and cached its assets. Use `npm run build` followed by `npm run preview` to test it locally. Closing or reloading an active brew ends that unsaved session; saved recipes and completed brews are retained.
